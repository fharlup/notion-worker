🚀 Dynamic H-X Notion Task Reminder Bot

Bot pengingat tugas berbasis Notion + Telegram menggunakan Cloudflare Workers.
Mendukung multi-user dan pengingat fleksibel berdasarkan H-X (misalnya H-3, H-1, dll).

✨ Fitur Utama
🔔 Dynamic H-X Reminder

Pengingat tidak terpaku pada H-1.

Kamu bisa mengatur:

Tugas A → diingatkan sejak H-3

Tugas B → diingatkan sejak H-1

Melalui properti dayremind di database Notion.

👥 Multi-User Support

Menggunakan database Registry untuk memetakan:

Akun Notion

Ke ID Telegram yang berbeda

📌 Status Aware

Bot hanya mengirimkan pengingat untuk tugas yang:

Status ≠ Done

🐞 Debug Mode (Berisik)

Format pesan mencolok

Log sistem aktif
Untuk memastikan integrasi berjalan lancar saat testing

🤖 Persiapan Telegram
1️⃣ Membuat Bot di @BotFather

Buka Telegram

Cari @BotFather

Kirim perintah:

/newbot

Masukkan:

Nama bot (bebas)

Username bot (harus diakhiri dengan bot)

Contoh: tugas_pengingat_bot

Simpan HTTP API Token

Token ini akan digunakan sebagai:

TG_TOKEN
2️⃣ Mendapatkan Chat ID

Cari bot @userinfobot

Klik /start

Salin angka Id yang muncul

Angka ini dimasukkan ke kolom Text pada database Registry di Notion.

🛠️ Persiapan Database Notion

Buat 2 database dengan nama kolom persis sama seperti di bawah.

📂 1. Database Registry (Daftar User)
Nama Kolom	Tipe Properti	Deskripsi
name	Title	Nama pengguna
Text	Text	Chat ID Telegram
Person	People	Akun Notion user
📂 2. Database Task (Daftar Tugas)
Nama Kolom	Tipe Properti	Deskripsi
name	Title	Judul tugas
Due Date	Date	Tanggal jatuh tempo
Assigned To	People	User yang mengerjakan (harus sama dengan Registry)
Status	Status	Jika Done, tidak dikirim
dayremind	Text	Angka pengingat (contoh: "3" untuk H-3)
⚙️ Konfigurasi Cloudflare Workers

Masuk ke:

Settings > Variables > Environment Variables

Tambahkan variabel berikut:

NOTION_TOKEN
REGISTRY_DB_ID
TASK_DB_ID
TG_TOKEN
📌 Keterangan
Variable	Keterangan
NOTION_TOKEN	Internal Integration Token dari Notion
REGISTRY_DB_ID	ID database Registry
TASK_DB_ID	ID database Task
TG_TOKEN	Token API dari BotFather
🖥️ Cara Deploy
wrangler secret put NOTION_TOKEN
# Masukkan Internal Integration Token dari Notion

wrangler secret put TG_TOKEN
# Masukkan Token API dari BotFather


npx wrangler login


npx wrangler deploy
🔄 Cara Kerja Singkat

Worker berjalan sesuai jadwal (cron).

Mengambil data dari:

Database Task

Database Registry

Menghitung selisih hari dengan Due Date

Jika:

Selisih hari ≤ dayremind

Status ≠ Done

Bot mengirim pesan ke Telegram user terkait.

🧠 Tips Debugging

Pastikan properti nama kolom persis sama

Pastikan Assigned To benar-benar sama dengan Person di Registry

Cek log di Cloudflare Workers

Pastikan bot sudah pernah kamu /start di Telegram

🏗️ Arsitektur Singkat
Notion Task DB
        ↓
Cloudflare Worker (Cron)
        ↓
Notion Registry DB
        ↓
Telegram Bot API
        ↓
User Telegram


1. Buat Integrasi di Notion Developers
Buka halaman notion.so/my-integrations di browser kamu.

Klik tombol "+ New integration".

Isi bagian Basic Information:

Name: Beri nama bebas (misalnya: Reminder Bot Fajar).

Workspace: Pilih workspace tempat database tugas kamu berada.

Pada bagian Capabilities, pastikan bot memiliki akses Read content (Wajib) dan Update content (Opsional, jika nanti mau bot bisa mengubah status).

Klik Submit.

2. Salin Internal Integration Token
Setelah di-submit, kamu akan diarahkan ke halaman konfigurasi integrasi tersebut.

Cari bagian Internal Integration Secret.

Klik "Show" lalu "Copy". Inilah yang akan menjadi NOTION_TOKEN kamu.

3. Langkah Krusial: Hubungkan ke Database (Invite Connection)
Token tadi tidak akan berfungsi jika database kamu belum "kenal" dengan bot-nya.

Buka database Registry dan Task kamu di Notion.

Klik titik tiga (...) di pojok kanan atas halaman database.

Cari menu "Connections" (atau "Add connections").

Ketik nama integrasi yang kamu buat tadi (misal: Reminder Bot Fajar) lalu klik Confirm.

Lakukan hal yang sama untuk kedua database agar bot tidak kena error 404 lagi.

4. Simpan ke Cloudflare via CLI
Setelah dapat tokennya, segera masukkan ke Worker kamu menggunakan Wrangler agar aman: