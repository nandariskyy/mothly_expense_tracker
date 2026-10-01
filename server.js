/**
 * ========================================================
 * Monthly Expense Tracker — server.js
 * Server Express & REST API Endpoints
 * ========================================================
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Sajikan file statis antarmuka web (index.html, style.css, main.js)
app.use(express.static(path.join(__dirname)));

// Kategori yang valid sesuai PRD
const VALID_CATEGORIES = [
  "Makanan",
  "Bensin",
  "Body Care",
  "Internet",
  "Belanja",
  "Lainnya"
];

// Helper validasi tanggal YYYY-MM-DD
function isValidDateString(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

// ==========================================
// REST API ENDPOINTS
// ==========================================

/**
 * Health Check API
 * GET /api/health
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    appName: "Monthly Expense Tracker",
    timestamp: new Date().toISOString()
  });
});

/**
 * Mendapatkan Daftar Pengeluaran (dengan filter bulan, kategori, dan pencarian)
 * GET /api/expenses?month=YYYY-MM&category=...&q=...
 */
app.get("/api/expenses", (req, res) => {
  try {
    const { month, category, q } = req.query;

    let query = "SELECT * FROM expenses WHERE 1=1";
    const params = {};

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      query += " AND date LIKE @monthPattern";
      params.monthPattern = `${month}%`;
    }

    if (category && category !== "ALL") {
      query += " AND category = @category";
      params.category = category;
    }

    if (q && q.trim() !== "") {
      query += " AND (title LIKE @searchQuery OR category LIKE @searchQuery)";
      params.searchQuery = `%${q.trim()}%`;
    }

    query += " ORDER BY date DESC, id DESC";

    const stmt = db.prepare(query);
    const rows = stmt.all(params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data pengeluaran.",
      error: error.message
    });
  }
});

/**
 * Mendapatkan Detail 1 Pengeluaran berdasarkan ID
 * GET /api/expenses/:id
 */
app.get("/api/expenses/:id", (req, res) => {
  try {
    const { id } = req.params;
    const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: `Pengeluaran dengan ID ${id} tidak ditemukan.`
      });
    }

    res.json({
      success: true,
      data: expense
    });
  } catch (error) {
    console.error("Error fetching single expense:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pengeluaran.",
      error: error.message
    });
  }
});

/**
 * Menambahkan Pengeluaran Baru
 * POST /api/expenses
 * Body: { title, amount, category, date }
 */
app.post("/api/expenses", (req, res) => {
  try {
    const { title, amount, category, date } = req.body;

    // Validasi input
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Deskripsi pengeluaran wajib diisi."
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Nominal harus berupa angka lebih dari 0."
      });
    }

    if (!date || !isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD."
      });
    }

    const finalCategory = VALID_CATEGORIES.includes(category)
      ? category
      : "Lainnya";

    const insertStmt = db.prepare(`
      INSERT INTO expenses (title, amount, category, date, created_at)
      VALUES (@title, @amount, @category, @date, CURRENT_TIMESTAMP)
    `);

    const result = insertStmt.run({
      title: title.trim(),
      amount: numAmount,
      category: finalCategory,
      date: date.trim()
    });

    const newExpense = db
      .prepare("SELECT * FROM expenses WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Pengeluaran berhasil dicatat!",
      data: newExpense
    });
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menyimpan pengeluaran baru.",
      error: error.message
    });
  }
});

/**
 * Memperbarui Pengeluaran yang Ada
 * PUT /api/expenses/:id
 * Body: { title, amount, category, date }
 */
app.put("/api/expenses/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category, date } = req.body;

    // Cek keberadaan data
    const existing = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Pengeluaran dengan ID ${id} tidak ditemukan.`
      });
    }

    // Validasi input
    if (!title || typeof title !== "string" || title.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Deskripsi pengeluaran wajib diisi."
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Nominal harus berupa angka lebih dari 0."
      });
    }

    if (!date || !isValidDateString(date)) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal tidak valid. Gunakan format YYYY-MM-DD."
      });
    }

    const finalCategory = VALID_CATEGORIES.includes(category)
      ? category
      : existing.category;

    const updateStmt = db.prepare(`
      UPDATE expenses
      SET title = @title,
          amount = @amount,
          category = @category,
          date = @date,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = @id
    `);

    updateStmt.run({
      id,
      title: title.trim(),
      amount: numAmount,
      category: finalCategory,
      date: date.trim()
    });

    const updatedExpense = db
      .prepare("SELECT * FROM expenses WHERE id = ?")
      .get(id);

    res.json({
      success: true,
      message: "Pengeluaran berhasil diperbarui!",
      data: updatedExpense
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({
      success: false,
      message: "Gagal memperbarui pengeluaran.",
      error: error.message
    });
  }
});

/**
 * Menghapus Pengeluaran
 * DELETE /api/expenses/:id
 */
app.delete("/api/expenses/:id", (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Pengeluaran dengan ID ${id} tidak ditemukan.`
      });
    }

    db.prepare("DELETE FROM expenses WHERE id = ?").run(id);

    res.json({
      success: true,
      message: "Pengeluaran berhasil dihapus.",
      data: { id: Number(id) }
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghapus pengeluaran.",
      error: error.message
    });
  }
});

/**
 * Mendapatkan Ringkasan Statistik Bulanan
 * GET /api/summary?month=YYYY-MM
 */
app.get("/api/summary", (req, res) => {
  try {
    let { month } = req.query;

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      month = `${y}-${m}`;
    }

    const monthPattern = `${month}%`;

    // Total pengeluaran & jumlah transaksi bulan ini
    const totalRow = db
      .prepare(
        "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM expenses WHERE date LIKE ?"
      )
      .get(monthPattern);

    const totalExpense = totalRow.total;
    const transactionCount = totalRow.count;

    // Perhitungan hari untuk rata-rata harian
    const [selectedYear, selectedMonth] = month.split("-").map(Number);
    const now = new Date();
    const isCurrentMonth =
      now.getFullYear() === selectedYear && now.getMonth() + 1 === selectedMonth;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    let divisorDays = 1;
    let daysDescription = "";

    if (isCurrentMonth) {
      divisorDays = Math.max(1, now.getDate());
      daysDescription = `Berdasarkan ${divisorDays} hari yang telah berlalu`;
    } else if (new Date(selectedYear, selectedMonth - 1, 1) > now) {
      divisorDays = daysInMonth;
      daysDescription = `Estimasi penuh ${daysInMonth} hari`;
    } else {
      divisorDays = daysInMonth;
      daysDescription = `Berdasarkan total ${daysInMonth} hari bulan ini`;
    }

    const dailyAverage =
      totalExpense > 0 ? Math.round(totalExpense / divisorDays) : 0;

    // Agregasi per kategori
    const categoryRows = db
      .prepare(
        `SELECT category, COALESCE(SUM(amount), 0) as total
         FROM expenses
         WHERE date LIKE ?
         GROUP BY category
         ORDER BY total DESC`
      )
      .all(monthPattern);

    const categoryMap = {};
    VALID_CATEGORIES.forEach((cat) => {
      categoryMap[cat] = 0;
    });

    let topCategory = "-";
    let topCategoryAmount = 0;

    categoryRows.forEach((row) => {
      if (categoryMap[row.category] !== undefined) {
        categoryMap[row.category] = row.total;
      } else {
        categoryMap["Lainnya"] = (categoryMap["Lainnya"] || 0) + row.total;
      }
    });

    // Cari kategori tertinggi
    Object.entries(categoryMap).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => {
      const percentage =
        totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      return {
        category,
        amount,
        percentage
      };
    });

    res.json({
      success: true,
      data: {
        month,
        totalExpense,
        transactionCount,
        dailyAverage,
        divisorDays,
        daysDescription,
        topCategory: topCategoryAmount > 0 ? topCategory : "-",
        topCategoryAmount,
        topCategoryPercentage:
          totalExpense > 0
            ? Math.round((topCategoryAmount / totalExpense) * 100)
            : 0,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error("Error calculating summary:", error);
    res.status(500).json({
      success: false,
      message: "Gagal menghitung ringkasan pengeluaran.",
      error: error.message
    });
  }
});

/**
 * Ekspor Data (Format JSON / CSV)
 * GET /api/export?format=json|csv
 */
app.get("/api/export", (req, res) => {
  try {
    const format = (req.query.format || "json").toLowerCase();
    const rows = db
      .prepare("SELECT * FROM expenses ORDER BY date DESC, id DESC")
      .all();

    const todayStr = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
      const headers = [
        "id",
        "title",
        "amount",
        "category",
        "date",
        "created_at",
        "updated_at"
      ];
      const csvLines = [headers.join(",")];

      rows.forEach((row) => {
        const line = [
          row.id,
          `"${(row.title || "").replace(/"/g, '""')}"`,
          row.amount,
          `"${row.category || ""}"`,
          row.date,
          `"${row.created_at || ""}"`,
          `"${row.updated_at || ""}"`
        ];
        csvLines.push(line.join(","));
      });

      const csvContent = csvLines.join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="expense_report_${todayStr}.csv"`
      );
      return res.send(csvContent);
    }

    // Default JSON export
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="expense_backup_${todayStr}.json"`
    );
    res.send(JSON.stringify(rows, null, 2));
  } catch (error) {
    console.error("Error exporting data:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengekspor data.",
      error: error.message
    });
  }
});

/**
 * Impor / Pulihkan Data Cadangan
 * POST /api/import
 * Body: Array transaksi ATAU { replace: boolean, transactions: [...] }
 */
app.post("/api/import", (req, res) => {
  try {
    let items = [];
    let shouldReplace = true;

    if (Array.isArray(req.body)) {
      items = req.body;
    } else if (req.body && Array.isArray(req.body.transactions)) {
      items = req.body.transactions;
      if (typeof req.body.replace === "boolean") {
        shouldReplace = req.body.replace;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Format data impor tidak valid. Harus berupa array transaksi."
      });
    }

    if (items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data transaksi yang dapat diimpor."
      });
    }

    // Validasi elemen array
    const validItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.title || item.amount === undefined || !item.date) {
        return res.status(400).json({
          success: false,
          message: `Data transaksi pada indeks ke-${i} tidak memiliki bidang wajib (title, amount, date).`
        });
      }

      validItems.push({
        title: String(item.title).trim(),
        amount: Number(item.amount) || 0,
        category: VALID_CATEGORIES.includes(item.category)
          ? item.category
          : "Lainnya",
        date: String(item.date).trim(),
        created_at: item.created_at || new Date().toISOString()
      });
    }

    // Transaksi SQLite untuk menjamin konsistensi
    const importTransaction = db.transaction((records, replaceExisting) => {
      if (replaceExisting) {
        db.prepare("DELETE FROM expenses").run();
        // Reset sqlite autoincrement sequence
        db.prepare("DELETE FROM sqlite_sequence WHERE name = 'expenses'").run();
      }

      const insertStmt = db.prepare(`
        INSERT INTO expenses (title, amount, category, date, created_at)
        VALUES (@title, @amount, @category, @date, @created_at)
      `);

      for (const rec of records) {
        insertStmt.run(rec);
      }
    });

    importTransaction(validItems, shouldReplace);

    res.json({
      success: true,
      message: `Berhasil mengimpor ${validItems.length} transaksi!`,
      count: validItems.length
    });
  } catch (error) {
    console.error("Error importing expenses:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengimpor data pengeluaran.",
      error: error.message
    });
  }
});

// Fallback route untuk SPA (kirim index.html jika rute tidak cocok)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Start Server
app.listen(PORT, () => {
  console.log(`
=======================================================
🚀 Expense Tracker Server berjalan di:
   👉 http://localhost:${PORT}
   Database: SQLite (expenses.db)
=======================================================
  `);
});
