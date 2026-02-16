export default {
  // 1. Handler Browser (Cek Status)
  async fetch(request, env, ctx) {
    return new Response("✅ Bot Deadline H-1 Aktif (Jadwal: 09:00 AM)", { 
      headers: { "Content-Type": "text/plain" } 
    });
  },

  // 2. Handler Otomatis (Cron Job)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.runBotLogic(env, false)); // false = Mode Normal (Bukan Start-up)
  },

  // 3. Logika Utama
  async runBotLogic(env, isStartup = false) {
    const esc = (t) => t ? t.toString().replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&') : "";

    try {
      const registryRes = await fetch(`https://api.notion.com/v1/databases/${env.REGISTRY_DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const registryData = await registryRes.json();
      const users = registryData.results || [];

      // Setup Tanggal Besok (H+1)
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      const dateString = targetDate.toISOString().split('T')[0];

      for (const user of users) {
        const tgId = user.properties["Text"]?.rich_text?.[0]?.plain_text;
        const name = user.properties["name"]?.title[0]?.plain_text || "User";
        const notionPerson = user.properties["Person"]?.people[0];

        if (!tgId) continue;

        // NOTIFIKASI START-UP (Hanya muncul saat pertama kali dinyalakan/deploy)
        if (isStartup) {
          await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgId,
              text: `✅ *Bot Terhubung:* Halo ${esc(name)}, bot pengingat deadline sudah aktif dan akan mengecek setiap jam 09:00 pagi\\.`,
              parse_mode: "MarkdownV2"
            })
          });
          continue; // Lewati pengecekan tugas jika ini hanya startup debug
        }

        // LOGIKA PENGECEKAN TUGAS (Hanya jalan saat jam 9 pagi)
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

          for (const task of tasks) {
            const taskTitle = task.properties.name?.title[0]?.plain_text || "Untitled";
            await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: tgId,
                text: `🔔 *Reminder Deadline Besok*\n\n📌 *${esc(taskTitle)}*\n📅 Tanggal: ${esc(dateString)}\n🚀 [Buka Notion](${esc(task.url)})`,
                parse_mode: "MarkdownV2"
              })
            });
          }
        }
      }
    } catch (error) {
      console.error("Error:", error.message);
    }
  }
};
