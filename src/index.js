export default {
  //bakal ada 2 ketika url di buka dan tidak
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
    const SPAM_MODE = false; 

    const esc = (t) => t ? t.toString().replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&') : "";
    console.log("--- Memulai Logika Bot (Mode Rangkuman Anti-Spam) ---");

    try {
      // 1. Ambil daftar user dari database 'teleid'
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
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const user of users) {
        const tgId = user.properties["Text"]?.rich_text?.[0]?.plain_text;
        const name = user.properties["name"]?.title[0]?.plain_text || "User";
        const notionPerson = user.properties["Person"]?.people[0];

        if (!tgId) continue;

        // Pesan Debugging (Spam) jika diaktifkan
        if (SPAM_MODE || isStartup) {
          await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgId,
              text: `🛰️ *Debug:* Bot mengecek tugas untuk ${esc(name)}\\.`,
              parse_mode: "MarkdownV2"
            })
          });
        }

        if (notionPerson) {
          // 2. Ambil tugas yang 'Assigned To' user ini & Status belum 'Done'
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
                  { property: "Status", status: { does_not_equal: "Done" } },
                  { property: "Assigned To", people: { contains: notionPerson.id } }
                ]
              }
            })
          });

          const tasksData = await tasksRes.json();
          const tasks = tasksData.results || [];
          
          let taskSummary = []; 

          for (const task of tasks) {
            const taskTitle = task.properties.name?.title[0]?.plain_text || "Untitled";
            const dueDateStr = task.properties["Due Date"]?.date?.start;
            const dayRemind = task.properties["dayremind"]?.number || 1; //

            if (!dueDateStr) continue;

            const dueDate = new Date(dueDateStr);
            dueDate.setHours(0, 0, 0, 0);

            // Hitung selisih hari
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Jika sisa hari masuk dalam rentang pengingat
            if (diffDays >= 0 && diffDays <= dayRemind) {
              const statusIcon = diffDays === 0 ? "🚨" : "⚠️";
              const statusTxt = diffDays === 0 ? "*HARI INI DEADLINE!!*" : `*${diffDays} HARI LAGI!*`;
              
              // Masukkan data ke array (bukan langsung kirim pesan)
              taskSummary.push(
                `${statusIcon} *${esc(taskTitle.toUpperCase())}*\n` +
                `⏰ STATUS: ${esc(statusTxt)}\n` +
                `📅 DEADLINE: ${esc(dueDateStr)}\n` +
                `🚀 [BUKA NOTION](${esc(task.url)})`
              );
            }
          }

          // --- 3. KIRIM HANYA SATU PESAN RANGKUMAN ---
          if (taskSummary.length > 0) {
            const finalMessage = `📢 *PENGINGAT DEADLINE HARIAN*\n\nHalo ${esc(name)}, berikut daftar tugasmu:\n\n` + 
                                 taskSummary.join("\n\n\\-\\-\\-\n\n");

            const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: tgId,
                text: finalMessage,
                parse_mode: "MarkdownV2",
                disable_web_page_preview: true
              })
            });
            
            const tgStatus = await tgRes.json();
            if (!tgStatus.ok) console.error("Gagal kirim Telegram:", tgStatus.description);
          }
        }
      }
    } catch (error) {
      console.error("CRITICAL ERROR:", error.message);
    }
  }
};