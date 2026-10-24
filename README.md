# TKA 2026 - Sistem Alokasi Laptop & Denah Meja Real-time

Aplikasi web Single Page Application (SPA) multi-user berbasis GitHub Pages untuk 11 pengawas/panitia ruangan dalam mengalokasikan laptop ke meja ujian Tes Kemampuan Akademik (TKA) 2026 secara mandiri dan tersinkronisasi secara real-time ke Google Sheets via Google Apps Script (GAS).

---

## 🚀 Fitur Utama

1. **Denah Meja Sesuai Geometri Resmi**:
   - Layout fisik meja merefleksikan denah resmi PDF (5 kolom untuk Ruang 1–7 & 9–11; 6 kolom untuk Ruang 8; Meja 21 & 22 di Ruang 1 & 2).
   - Banner visual **MEJA PENGAWAS** di posisi depan.
   - Penomoran serpentine / berkelok sesuai format denah asli.
2. **Daftar Peserta Per Sesi Terintegrasi**:
   - Menampilkan nama peserta per meja untuk Sesi 1, Sesi 2, dan Sesi 3.
   - Sesi 3 otomatis aktif hanya untuk Ruang 1, 2, dan 3 sesuai data resmi.
3. **Drag-and-Drop & Mobile Touch Friendly**:
   - Tarik laptop dari panel ketersediaan (Laptop Pool) ke meja target.
   - Pindahkan laptop antar meja dengan drag-and-drop.
   - Tarik kembali ke dropzone bawah untuk melepas (unassign) laptop.
   - Tombol klik cepat untuk perangkat layar sentuh / smartphone.
4. **Inspeksi Cepat Meja (Quick Modal)**:
   - Klik kartu meja untuk membuka dialog inspeksi:
     - Toggle status kesiapan: 🟢 **Siap TKA** / 🔴 **Belum Siap**
     - Toggle ketersediaan daya: ⚡ **Ada Charger** / ✕ **Tanpa Charger**
     - Catatan teknisi (contoh: baterai drop, layar retak halus, mouse siap, dll.)
5. **Sinkronisasi Realtime Google Sheets & Anti Tabrakan Data**:
   - Menggunakan `LockService.getScriptLock()` di Apps Script untuk mencegah tabrakan data (race conditions) saat 11 pengawas mengupdate bersamaan.
   - Optimistic UI: Perubahan tampil instan di layar pengawas tanpa menunggu jaringan.
   - Auto-polling setiap 20 detik untuk menarik pembaruan dari pengawas lain.
   - Antrean offline (`localStorage`) yang otomatis disinkronkan saat koneksi pulih.
6. **Dashboard Rekap Koordinator & Export CSV**:
   - Tab **Rekap & Overview**: Progress bar alokasi per ruangan (persentase meja terisi, laptop siap, dan charger).
   - Tombol **Export CSV**: Mengunduh checklist pengawas dalam format CSV dengan encoding UTF-8 BOM yang langsung rapi dibuka di Excel/Spreadsheet.

---

## 📁 Struktur Berkas

```
tka-laptop-assignment/
├── index.html            # Shell utama SPA & antarmuka pengawas
├── css/
│   └── style.css         # Styling custom, scrollbar, dan animasi drag-and-drop
├── data/
│   └── roomsData.js      # Metadata statis denah & daftar peserta Ruang 1–11
├── js/
│   └── app.js            # Controller inti, drag-and-drop, optimistic UI & sync GAS
├── gas/
│   └── Code.gs           # Backend Google Apps Script Web App (GET & POST)
└── README.md             # Panduan instalasi dan deployment
```

---

## 🛠️ Panduan Setup Google Sheets & Google Apps Script

### Langkah 1: Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet, misalnya: `Database Alokasi Laptop TKA 2026`.

### Langkah 2: Pasang Kode Apps Script
1. Di menu Google Sheets, pilih **Extensions (Ekstensi)** > **Apps Script**.
2. Hapus seluruh kode bawaan pada editor `Code.gs`.
3. Buka file `gas/Code.gs` di proyek ini, salin seluruh kodenya, lalu tempel ke editor Apps Script.
4. Simpan proyek dengan menekan ikon simpan atau `Ctrl + S`.

### Langkah 3: Inisialisasi Sheet Otomatis
1. Pada dropdown fungsi di toolbar atas editor Apps Script, pilih fungsi `setupSheets`.
2. Klik tombol **Run (Jalankan)**.
3. Berikan izin otorisasi saat diminta (Review Permissions > pilih akun Google > Advanced > Go to Untitled project > Allow).
4. Dua sheet akan otomatis dibuat dan diformat rapi:
   - `Data_Ruangan`: `[Ruang, NoMeja, Sesi1, Sesi2, Sesi3, IdLaptop, LabelLaptop, PemilikLaptop, IsReady, HasCharger, Catatan, LastUpdated]`
   - `Laptops_Inventory`: `[IdLaptop, LabelLaptop, PemilikLaptop, IsReady, HasCharger, AssignedRoom, AssignedDesk, Catatan, LastUpdated]`

### Langkah 4: Deploy sebagai Web App
1. Di pojok kanan atas editor Apps Script, klik tombol **Deploy** > **New deployment**.
2. Klik ikon gerigi (Select type) > pilih **Web app**.
3. Isi konfigurasi berikut:
   - **Description**: `TKA 2026 Web App v1`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` *(Penting agar 11 pengawas dapat mengirim pembaruan tanpa login)*
4. Klik **Deploy**.
5. Salin **Web app URL** yang dihasilkan (contoh: `https://script.google.com/macros/s/.../exec`).

---

## 🌐 Panduan Menghubungkan Frontend ke Backend

1. Buka aplikasi web (bisa dibuka langsung di browser atau melalui GitHub Pages).
2. Klik ikon gerigi ⚙️ (**Pengaturan**) di sudut kanan atas header.
3. Tempelkan URL Web App Google Apps Script yang disalin pada Langkah 4 ke kolom input.
4. Klik tombol **Uji Koneksi**. Jika status berubah hijau dengan pesan *"Koneksi Berhasil!"*, klik **Simpan URL**.
5. Indikator di header akan berubah menjadi 🟢 **Tersinkron (Realtime)**.

---

## 🚢 Panduan Publikasi ke GitHub Pages

1. Buat repositori baru di GitHub (misal: `tka-laptop-assignment`).
2. Masukkan berkas proyek (`index.html`, folder `data/`, `js/`, `css/`, `gas/`).
3. Commit dan push ke branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for TKA 2026 Laptop Assignment"
   git branch -M main
   git remote add origin https://github.com/<username>/tka-laptop-assignment.git
   git push -u origin main
   ```
4. Di halaman GitHub repository, buka **Settings** > **Pages**.
5. Pada bagian **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main** / folder: `/(root)`
   - Klik **Save**.
6. Dalam 1–2 menit, web app akan aktif di: `https://<username>.github.io/tka-laptop-assignment/`.
7. Bagikan link URL tersebut kepada ke-11 pengawas ruangan.

---

## 👥 Alur Kerja Pengawas di Hari Pelaksanaan

1. Pengawas membuka link GitHub Pages di HP atau laptop masing-masing.
2. Pengawas memilih ruangannya melalui dropdown (misal: **Ruang 5**). Pilihan ruangan otomatis tersimpan di HP/laptop tersebut.
3. Ketika laptop siswa/sekolah tiba, pengawas menarik laptop dari panel kanan ke meja yang bersangkutan.
4. Pengawas mengetuk meja untuk memeriksa charger dan kesiapan perangkat.
5. Koordinator ujian dapat memantau progres seluruh 11 ruangan secara langsung melalui tab **Rekap & Overview** atau mengunduh checklist via tombol **Export CSV**.
