# Sistem Informasi Investigasi & Intelijen

Aplikasi web terpadu untuk keperluan investigasi dan intelijen, dilengkapi dengan modul pengenalan wajah (Face Recognition), pengenalan teks optik (OCR), sistem pelaporan tingkat lanjut, pemetaan (GIS), dan obrolan aman (Secure Chat).

## 🌟 Fitur Utama

- **Dashboard & Analitik**: Ringkasan data kasus dan aktivitas.
- **Pengenalan Wajah (Face Recognition)**: Deteksi dan identifikasi wajah dari gambar.
- **Optical Character Recognition (OCR)**: Ekstraksi teks dari dokumen atau gambar.
- **Sistem Pelaporan (Advanced Reporting)**: Pembuatan laporan kasus dengan opsi ekspor ke format PDF, Word (DOCX), dan Excel (XLSX), lengkap dengan dukungan tanda tangan digital.
- **Pemetaan (GIS / Maps)**: Visualisasi lokasi kejadian, bukti, dan pelacakan pada peta interaktif.
- **Obrolan Aman (Secure Chat)**: Komunikasi real-time antar agen/petugas yang terenkripsi.
- **Login Admin & User**: Akses aman dengan pembagian peran (Role-based access). 
  - *Kredensial Default Admin: Username: `admin` | Password: `admin`*

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend**: Node.js, Express, Socket.IO (untuk Chat)
- **Database**: PostgreSQL dengan Drizzle ORM
- **Pemrosesan Data**: Tesseract.js (OCR), face-api (Face Rec), jsPDF, Docx, SheetJS (Pelaporan)
- **Infrastruktur**: Docker, Docker Compose, Nginx

---

## 💻 Panduan Instalasi (Pengembangan Lokal)

### Prasyarat
- **Node.js** (versi 20 atau lebih baru)
- **PostgreSQL** (terinstal dan berjalan di mesin lokal Anda)

### Langkah-langkah

1. **Kloning Repositori / Ekstrak Source Code**
   Pastikan Anda berada di direktori proyek.

2. **Instalasi Dependensi**
   Jalankan perintah berikut di terminal Anda:
   ```bash
   npm install
   ```

3. **Konfigurasi Database**
   Buat file `.env` di direktori utama (root) proyek jika belum ada, dan atur URL koneksi PostgreSQL Anda:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/nama_database
   ```
   *(Ubah `username`, `password`, dan `nama_database` sesuai konfigurasi PostgreSQL Anda)*

4. **Menjalankan Server Mode Pengembangan (Dev Mode)**
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan secara full-stack (Frontend & Backend) di port `3000`. Buka `http://localhost:3000` di browser Anda.

5. **Build untuk Produksi**
   Jika ingin melakukan kompilasi untuk produksi:
   ```bash
   npm run build
   npm run start
   ```

---

## 🐳 Panduan Instalasi menggunakan Docker (Rekomendasi)

Proyek ini dilengkapi dengan `docker-compose.yml` untuk mempermudah instalasi.

### Prasyarat
- **Docker** dan **Docker Compose** terinstal.

### Langkah-langkah

1. **Jalankan Docker Compose**
   Di direktori utama proyek, jalankan:
   ```bash
   docker-compose up -d --build
   ```
2. **Akses Aplikasi**
   Setelah semua container berjalan, buka browser dan akses: `http://localhost` atau `http://localhost:3000`.
   Layanan tambahan yang berjalan:
   - FastAPI Backend: `http://localhost:8000`
   - MinIO Console: `http://localhost:9001`

---

## 🚀 Panduan Deployment Server (Ubuntu / Debian / Kali Linux)

Proyek ini menyediakan skrip bash otomatis untuk deployment ke VPS atau server fisik.

1. Buka terminal server Anda dan masuk sebagai `root` (atau gunakan `sudo`).
2. Masuk ke direktori proyek, lalu ke folder `deployment`:
   ```bash
   cd deployment
   ```
3. Beri hak akses eksekusi pada skrip deploy:
   ```bash
   chmod +x deploy.sh
   ```
4. Jalankan skrip deploy:
   ```bash
   ./deploy.sh
   ```
5. **Ikuti instruksi di layar**. Skrip akan:
   - Menginstal Docker dan Nginx.
   - Meminta nama domain Anda (atau ketik `localhost` jika hanya untuk jaringan lokal).
   - Mengatur SSL/HTTPS (Let's Encrypt) secara otomatis jika Anda menggunakan domain publik.
   - Menjalankan container dan menjadwalkan pencadangan (backup) database otomatis setiap hari jam 2 pagi.

---

## 📖 Cara Menggunakan Aplikasi

1. **Login**
   - Buka aplikasi.
   - Untuk masuk sebagai administrator, gunakan kredensial berikut:
     - **Email / Username**: `admin`
     - **Password**: `admin`
   - Pengguna biasa dapat masuk hanya dengan mengetikkan nama dan email.

2. **Menggunakan Modul Pelaporan (Reporting)**
   - Masuk ke menu **Reports** di bilah navigasi kiri.
   - Isi judul laporan, pilih kasus, dan tambahkan catatan.
   - Anda dapat menggambar tanda tangan digital Anda pada kotak yang disediakan di sebelah kiri bawah.
   - Klik tombol **PDF**, **Word**, atau **Excel** di pojok kanan atas untuk mengekspor laporan Anda secara otomatis.

3. **Menggunakan Modul Pengenalan Wajah (Face Rec) & OCR**
   - Masuk ke modul terkait, lalu unggah gambar atau tangkapan layar.
   - Sistem akan memproses gambar menggunakan model AI yang sudah tertanam di aplikasi (Tesseract untuk teks, Face-API untuk wajah).

4. **Obrolan Aman (Chat)**
   - Pesan yang dikirim melalui modul Chat akan disimpan di database dan dikirim secara real-time ke agen lain menggunakan Socket.IO.

## 🛡️ Keamanan & Pencadangan (Backup)
Sistem memiliki skrip cadangan otomatis di `deployment/backup.sh`. File cadangan database PostgreSQL dan penyimpanan MinIO akan disimpan di `/var/backups/app_backups/` pada server Anda. Cadangan yang lebih lama dari 7 hari akan dihapus otomatis untuk menghemat penyimpanan.
