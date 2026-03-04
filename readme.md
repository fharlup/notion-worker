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
1️⃣ Buat Worker

Buka Dashboard Cloudflare

Buat Worker baru

2️⃣ Edit Code

Salin isi index.js

Paste ke editor Cloudflare

3️⃣ Deploy

Klik:

Save and Deploy
⏰ 4️⃣ Set Jadwal (Cron Trigger)

Masuk ke:

Settings > Triggers

Klik:

Add Cron Trigger

Masukkan jadwal

Contoh:
Jam 9 pagi WIB

0 2 * * *

(Format UTC — WIB = UTC+7)

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
