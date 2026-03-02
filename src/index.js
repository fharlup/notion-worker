export default {
  // 1. Handler Browser - SEKARANG BISA DIPAKAI UNTUK TEST
  async fetch(request, env, ctx) {
    // Menjalankan logika bot secara manual saat URL dibuka
    await this.runBotLogic(env, true); 
    return new Response("🚀 Test Run Berhasil! Cek Telegram kamu.", { 
      headers: { "Content-Type": "text/plain" } 
    });
  },

  // 2. Handler Otomatis (Cron Job jam 9 pagi)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.runBotLogic(env, false));
  },

  async runBotLogic(env, isStartup = false) {
    const esc = (t) => t ? t.toString().replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&') : "";
    console.log("--- Memulai Logika Bot ---");

    try {
      const registryRes = await fetch(`https://api.notion.com/v1/databases/${env.REGISTRY_DB_ID}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NOTION_TOKEN}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      });

      const registryData = await registryRes.json();
      const users = registryData.results || [];
      console.log(`Ditemukan ${users.length} user di Registry.`);

      const today = new Date();
      // Gunakan offset untuk WIB (UTC+7) jika perlu, 
      // tapi untuk perbandingan tanggal saja ini sudah cukup:
      today.setHours(0, 0, 0, 0);

      for (const user of users) {
        const tgId = user.properties["Text"]?.rich_text?.[0]?.plain_text;
        const name = user.properties["name"]?.title[0]?.plain_text || "User";
        const notionPerson = user.properties["Person"]?.people[0];

        if (!tgId) {
          console.log(`Skip user ${name}: ID Telegram tidak ditemukan.`);
          continue;
        }

        if (notionPerson) {
          console.log(`Mengecek tugas untuk: ${name} (Notion ID: ${notionPerson.id})`);
          
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
                  { property: "Assigned To", people: { contains: notionPerson.id } },
                  { property: "Status", status: { does_not_equal: "Done" } }
                ]
              }
            })
          });

          const tasksData = await tasksRes.json();
          const tasks = tasksData.results || [];
          console.log(`Ditemukan ${tasks.length} tugas belum selesai.`);

          for (const task of tasks) {
            const taskTitle = task.properties.name?.title[0]?.plain_text || "Untitled";
            const dueDateStr = task.properties["Due Date"]?.date?.start;
            const dayRemindText = task.properties["dayremind"]?.rich_text?.[0]?.plain_text;
            const dayRemind = parseInt(dayRemindText) || 1;

            if (!dueDateStr) continue;

            const dueDate = new Date(dueDateStr);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            console.log(`Tugas: ${taskTitle} | H-${diffDays} | Setting: ${dayRemind}`);

            if (diffDays <= dayRemind && diffDays >= 0) {
              const statusMsg = diffDays === 0 ? "🚨 HARI INI DEADLINE!!" : `⚠️ ${diffDays} HARI LAGI!`;
              
              const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: tgId,
                  text: `📢 *PENGINGAT DEADLINE*\n\n🔥 *${esc(taskTitle.toUpperCase())}*\n⏰ *STATUS:* ${esc(statusMsg)}\n📅 *DEADLINE:* ${esc(dueDateStr)}\n⚙️ *SETTING:* H\\-${dayRemind}\n\n🚀 [BUKA NOTION](${esc(task.url)})`,
                  parse_mode: "MarkdownV2"
                })
              });
              
              const tgStatus = await tgRes.json();
              if (!tgStatus.ok) console.error("Gagal kirim Telegram:", tgStatus.description);
            }
          }
        }
      }
    } catch (error) {
      console.error("CRITICAL ERROR:", error.message);
    }
  }
};