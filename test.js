export default {
  // 1. Handler Browser (Fix error di image_6e52de.png)
  async fetch(request, env, ctx) {
    return new Response(
      `<html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#121212;color:#00ff00;">
        <h1>✅ Server Online</h1>
        <p>Bot sedang berjalan otomatis di background.</p>
      </body></html>`, 
      { headers: { "Content-Type": "text/html" } }
    );
  },

  // 2. Handler Otomatis (Cron)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(this.runBotLogic(env));
  },

  // 3. Logika Utama
  async runBotLogic(env) {
    try {
      console.log("DEBUG: Menggunakan REGISTRY_DB_ID:", env.REGISTRY_DB_ID);

      // Ambil data user dari teleid
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

      if (users.length === 0) {
        console.log("⚠️ Tidak ada user ditemukan. Raw Response:", JSON.stringify(registryData));
        return;
      }

      for (const user of users) {
        const tgId = user.properties["Text"]?.rich_text?.[0]?.plain_text;
        const name = user.properties["name"]?.title[0]?.plain_text || "User";

        if (tgId) {
          // Kirim sapaan setiap menit
          await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgId,
              text: `🚀 *Bot Nyala:* Halo ${name.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&')}, bot sedang aktif memantau Notion\\!`,
              parse_mode: "MarkdownV2"
            })
          });
          console.log(`✅ Sapaan terkirim ke: ${name}`);
        }
      }
    } catch (error) {
      console.error("Critical Error:", error.message);
    }
  }
};
