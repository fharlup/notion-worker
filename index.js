export default {
  async scheduled(event, env, ctx) {
    // Helper untuk escape karakter khusus Telegram MarkdownV2
    const esc = (t) => {
      if (!t) return "";
      return t.toString().replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
    };

    try {
      // 1. Ambil Chat ID Admin (fajar) secara dinamis dari database teleid
      const adminRes = await fetch(
        `https://api.notion.com/v1/databases/${env.REGISTRY_DB_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: { property: "name", title: { equals: "fajar" } }
          })
        }
      );

      const adminData = await adminRes.json();
      
      // Safety check: Pastikan data 'fajar' ditemukan di teleid
      const MY_DYNAMIC_ID = adminData.results?.[0]?.properties["Text"]?.rich_text?.[0]?.plain_text;

      if (!MY_DYNAMIC_ID) {
        console.error("❌ Error: Baris 'fajar' tidak ditemukan di database teleid atau kolom Text kosong.");
        return;
      }

      // 2. SINYAL TEST: Kirim pesan bahwa bot sudah menyala
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: MY_DYNAMIC_ID,
          text: "🚀 *Bot Nyala:* Berhasil terhubung ke Notion\\. Sedang menyisir deadline\\.\\.\\.",
          parse_mode: "MarkdownV2"
        })
      });

      // 3. SETUP TANGGAL (Besok: 17 Feb 2026)
      const DAYS_AHEAD = 1; 
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + DAYS_AHEAD);
      const dateString = targetDate.toISOString().split('T')[0];

      // 4. QUERY DATABASE TUGAS
      const tasksResponse = await fetch(
        `https://api.notion.com/v1/databases/${env.TASK_DB_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: { property: "Due Date", date: { equals: dateString } }
          })
        }
      );

      const tasksData = await tasksResponse.json();
      const tasks = tasksData.results || [];

      // 5. PROSES NOTIFIKASI (Mapping Otomatis)
      for (const task of tasks) {
        const title = task.properties.name?.title[0]?.plain_text || "Untitled";
        const assignee = task.properties["Assigned To"]?.people[0];

        if (assignee) {
          // Cari Chat ID Telegram berdasarkan Person yang di-assign
          const regRes = await fetch(
            `https://api.notion.com/v1/databases/${env.REGISTRY_DB_ID}/query`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${env.NOTION_TOKEN}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                filter: { property: "Person", people: { contains: assignee.id } }
              })
            }
          );

          const regData = await regRes.json();
          const targetTgId = regData.results?.[0]?.properties["Text"]?.rich_text?.[0]?.plain_text;

          if (targetTgId) {
            const message = 
              `🔔 *Reminder Deadline*\n\n` +
              `Halo, tugas *${esc(title)}* deadlinenya besok\\!\n` +
              `Semangat kerjainnya ya\\! 💪\n\n` +
              `🚀 [Buka Notion](${esc(task.url)})`;

            await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetTgId,
                text: message,
                parse_mode: "MarkdownV2"
              })
            });
          }
        }
      }

      // 6. LAPORAN AKHIR KE ADMIN
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: MY_DYNAMIC_ID,
          text: `✅ Cek selesai\\. Ditemukan ${tasks.length} tugas untuk tanggal ${dateString}\\.`,
          parse_mode: "MarkdownV2"
        })
      });

    } catch (error) {
      console.error("Critical Error:", error);
      // Opsional: Kirim error ke log console Cloudflare
    }
  }
};