/**
 * ========================================================
 * Monthly Expense Tracker — database.js
 * Konfigurasi Database SQLite & Skema Tabel Pengeluaran
 * ========================================================
 */

const Database = require("better-sqlite3");
const path = require("path");

// Path ke file SQLite database
const DB_PATH = path.join(__dirname, "expenses.db");

// Inisialisasi koneksi database
const db = new Database(DB_PATH);

// Optimasi performa dengan WAL mode (Write-Ahead Logging)
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/**
 * Inisialisasi skema tabel database
 */
function initDatabase() {
  // Buat tabel expenses jika belum ada
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME
    );
  `;
  db.exec(createTableQuery);

  // Buat indeks untuk mempercepat pencarian dan filter berdasarkan tanggal & kategori
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);
  `);

  // Periksa apakah database masih kosong, jika iya masukkan data awal (dummy seed)
  seedInitialDataIfEmpty();
}

/**
 * Memasukkan data awal demonstrasi jika database kosong
 */
function seedInitialDataIfEmpty() {
  const countRow = db.prepare("SELECT COUNT(*) as count FROM expenses").get();
  if (countRow.count === 0) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");

    const sampleData = [
      {
        title: "Makan Siang Nasi Padang",
        amount: 35000,
        category: "Makanan",
        date: `${y}-${m}-01`
      },
      {
        title: "Bensin Motor Bulanan",
        amount: 50000,
        category: "Bensin",
        date: `${y}-${m}-02`
      },
      {
        title: "Paket Internet & Wi-Fi",
        amount: 275000,
        category: "Internet",
        date: `${y}-${m}-03`
      },
      {
        title: "Sabun Cuci Muka & Skincare",
        amount: 85000,
        category: "Body Care",
        date: `${y}-${m}-04`
      },
      {
        title: "Belanja Kebutuhan Bulanan",
        amount: 150000,
        category: "Belanja",
        date: `${y}-${m}-05`
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO expenses (title, amount, category, date, created_at)
      VALUES (@title, @amount, @category, @date, CURRENT_TIMESTAMP)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertStmt.run(item);
      }
    });

    insertMany(sampleData);
    console.log("✅ Database diinisialisasi dengan data awal (sample data).");
  }
}

// Inisialisasi skema saat modul dimuat
initDatabase();

module.exports = db;
