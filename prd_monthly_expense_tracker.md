# Dokumen Kebutuhan Produk (PRD)

## Nama Proyek: Pencatat Pengeluaran Bulanan Lokal (Monthly Expense Tracker)

### 1. Ringkasan & Tujuan Proyek

**Pencatat Pengeluaran Bulanan Lokal** adalah aplikasi web lokal berbasis Node.js dan SQLite yang dirancang untuk penggunaan pribadi. Aplikasi ini berfungsi untuk mencatat, menampilkan, dan menganalisis pengeluaran harian yang difilter berdasarkan bulan. 

Tujuan utamanya adalah menyediakan antarmuka yang bersih, cepat, dan aman untuk menyimpan data keuangan secara permanen di harddisk lokal komputer pengguna.

---

### 2. Target Pengguna & Skenario Penggunaan

* **Pengguna:** Pengguna tunggal (*single-user*) yang ingin mencatat keuangan pribadi.
* **Lingkungan:** Dioperasikan secara lokal di komputer/laptop melalui browser web.
* **Tujuan Utama:** Mencatat pengeluaran harian dengan cepat, melihat total pengeluaran bulanan, serta memfilter riwayat transaksi berdasarkan bulan dan tahun.

---

### 3. Kebutuhan Fungsional Utama

#### A. Penyimpanan & Manajemen Data (Database SQLite)

* **Database Engine:** SQLite3 (tersimpan sebagai file database lokal `expenses.db`).
* **Struktur Tabel Transaksi (`expenses`):**
  * `id` (INTEGER, Primary Key, Auto Increment)
  * `title` (TEXT, Nama/Deskripsi pengeluaran)
  * `amount` (REAL / INTEGER, Jumlah nominal dalam Rupiah)
  * `category` (TEXT, Kategori: "Makanan", "Transportasi", "Tagihan", "Hiburan", "Lainnya")
  * `date` (TEXT, Tanggal transaksi format `YYYY-MM-DD`)
  * `created_at` (DATETIME, Waktu input data)

* **Fitur Ekspor / Impor Data:**
  * Ekspor seluruh data transaksi ke file format `.json` atau `.csv` untuk cadangan data (*backup*).
  * Impor data dari file `.json` untuk pemulihan riwayat data (*restore*).

#### B. Fitur & Antarmuka Pengguna (UI)

1. **Header & Filter Pemilih Bulan:**
   * Dropdown / Month Picker (Bulan & Tahun, standar: Bulan Berjalan).
   * Menampilkan ringkasan data sesuai bulan yang dipilih secara otomatis.

2. **Kartu Ringkasan (Summary Cards):**
   * **Total Pengeluaran Bulan Ini:** Penjumlahan seluruh pengeluaran pada bulan yang dipilih.
   * **Rata-Rata Harian:** Total pengeluaran bulanan dibagi jumlah hari yang telah berlalu di bulan tersebut.
   * **Kategori Terbesar:** Kategori dengan akumulasi pengeluaran tertinggi di bulan terkait.

3. **Formulir Transaksi (Tambah / Edit):**
   * Input: Deskripsi Pengeluaran, Nominal (Rp), Tanggal (default: hari ini), dan Kategori.
   * Validasi formulir (nominal harus angka positif, bidang wajib diisi).

4. **Daftar Transaksi:**
   * Menampilkan daftar pengeluaran berdasarkan bulan yang dipilih (diurutkan dari tanggal terbaru).
   * Format mata uang dalam Rupiah (`Rp X.XXX.XXX`).
   * Aksi tombol hapus (*Delete*) dengan konfirmasi dialog.

---

### 4. Spesifikasi Teknis & Arsitektur

* **Front-End:** HTML5, CSS3 (Tailwind CSS atau Vanilla CSS), Vanilla JavaScript (ES6+ / Fetch API).
* **Back-End:** Node.js + Express.js (REST API sederhana).
* **Database:** SQLite (menggunakan driver `better-sqlite3` atau `sqlite3`).
* **Struktur Folder Proyek:**

  ```text
  expense-tracker/
  ├── package.json         # Konfigurasi Node.js & dependency
  ├── server.js            # Server Express & endpoint REST API
  ├── database.js          # Inisialisasi & skema SQLite
  ├── expenses.db          # File database SQLite (dibuat otomatis)
  └── public/
      ├── index.html       # Tampilan antarmuka utama
      ├── style.css        # Tata letak & gaya visual
      └── main.js          # Logika UI & interaksi REST API (Fetch)
  ```

---

### 5. Kebutuhan Non-Fungsional

* **Keamanan Data Lokal:** Data tersimpan aman di file `.db` di dalam komputer dan tidak akan hilang meskipun *cache* browser dibersihkan.
* **Performa Tinggi:** Respons API dan pembaruan UI berlangsung sangat cepat (<100ms).
* **Desain Responsif:** Tampilan nyaman digunakan baik pada layar komputer maupun tampilan browser seluler.

---

### 6. Kriteria Keberhasilan

1. Aplikasi dapat menyimpan, menampilkan, dan menghapus data pengeluaran melalui backend Node.js dan SQLite.
2. Perhitungan ulang total pengeluaran bulanan berfungsi akurat sesuai bulan yang dipilih.
3. Data tersimpan secara permanen di komputer lokal.
4. Fitur *backup* (Export/Import) dapat berfungsi dengan baik.