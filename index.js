export default {
  // 1. Handler Browser agar status terlihat di web
  async fetch(request, env, ctx) {
    return new Response("🚀 BOT SPAM & DEADLINE ACTIVE", { 
      headers: { "Content-Type": "text/plain" } 
    });
  },

  // 2. Handler Otomatis (Cron Job setiap menit)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.runBotLogic(env));
  },

  // 3. Logika Utama
  async runBotLogic(env) {
    const esc = (t) => t ? t.toString().replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&') : "";

    try {
      // --- A. AMBIL DAFTAR USER DARI TELEID ---
      const registryRes = await fetch(`https://api.notion.com/v1/databases/${env.REGISTRY_DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Ambil semua baris di database teleid
      });

      const registryData = await registryRes.json();
      const users = registryData.results || [];

      // --- B. SETUP TANGGAL BESOK (H+1) ---
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1); // Besok: 17 Februari 2026
      const dateString = targetDate.toISOString().split('T')[0];

      if (users.length === 0) {
        console.log("⚠️ Tidak ada user ditemukan di database teleid.");
        return;
      }

      // --- C. PROSES NOTIFIKASI PER USER ---
      for (const user of users) {
        const tgId = user.properties["Text"]?.rich_text?.[0]?.plain_text;
        const name = user.properties["name"]?.title[0]?.plain_text || "User";
        const notionPerson = user.properties["Person"]?.people[0];

        if (!tgId) continue;

        // SPAM 1: Sapaan Debugging (Selalu terkirim tiap menit)
        await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgId,
            text: `🛰️ *Debug Spam:* Bot aktif\\!\n👤 User: ${esc(name)}\n📅 Cek Deadline Besok: ${esc(dateString)}`,
            parse_mode: "MarkdownV2"
          })
        });

        // Jika user punya akun Notion (Person), cek tugas mereka
        if (notionPerson) {
          const tasksRes = await fetch(`https://api.notion.com/v1/databases/${env.TASK_DB_ID}/query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${env.NOTION_TOKEN}`,
              'Notion-Version': '2022-06-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filter: {
                and: [
                  { property: "Due Date", date: { equals: dateString } },
                  { property: "Assigned To", people: { contains: notionPerson.id } }
                ]
              }
            })
          });

          const tasksData = await tasksRes.json();
          const tasks = tasksData.results || [];

          if (tasks.length > 0) {
            // SPAM 2: Kirim detail tugas jika ditemukan
            for (const task of tasks) {
              const taskTitle = task.properties.name?.title[0]?.plain_text || "Untitled";
              const taskUrl = task.url;

              await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: tgId,
                  text: `🔔 *TUGAS BESOK DITEMUKAN\\!*\n\n📌 *${esc(taskTitle)}*\n📅 Tanggal: ${esc(dateString)}\n🚀 [Buka Kartu Notion](${esc(taskUrl)})`,
                  parse_mode: "MarkdownV2"
                })
              });
            }
          } else {
            // SPAM 3: Laporan jika tidak ada tugas (Untuk memastikan bot menyisir)
            await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: tgId,
                text: `☁️ *Info:* Tidak ada tugas khusus untuk ${esc(name)} di tanggal ${esc(dateString)}\\.`,
                parse_mode: "MarkdownV2"
              })
            });
          }
        }
      }
    } catch (error) {
      console.error("Critical Error:", error.message);
    }
  }
};
