/**
 * ========================================================
 * Monthly Expense Tracker — main.js
 * Logika Antarmuka Pengguna & Manajemen Data Pengeluaran
 * ========================================================
 */

// Kunci penyimpanan lokal
const STORAGE_KEY = "monthly_expense_tracker_db";

// Kategori & Konfigurasi Ikon
const CATEGORY_CONFIG = {
  Makanan: { icon: "🍔", class: "tracker-item__category-badge--makanan", barColor: "#EA580C" },
  Bensin: { icon: "⛽", class: "tracker-item__category-badge--bensin", barColor: "#0284C7" },
  "Body Care": { icon: "🧴", class: "tracker-item__category-badge--body-care", barColor: "#DB2777" },
  Internet: { icon: "🌐", class: "tracker-item__category-badge--internet", barColor: "#4F46E5" },
  Belanja: { icon: "🛍️", class: "tracker-item__category-badge--belanja", barColor: "#7C3AED" },
  Lainnya: { icon: "📦", class: "tracker-item__category-badge--lainnya", barColor: "#0D9488" }
};

// State Aplikasi
let transactions = [];
let editingId = null;
let transactionToDeleteId = null;
let currentSelectedMonth = getCurrentMonthYearString(); // Format: "YYYY-MM"
let currentSearchQuery = "";
let currentCategoryFilter = "ALL";

// Helper Tanggal & Waktu
function getCurrentMonthYearString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatRupiah(amount) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function formatIndonesianDate(dateString) {
  if (!dateString) return "-";
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getMonthNameIndonesian(yearMonthString) {
  const [year, month] = yearMonthString.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}

// Data Dummy Awal jika Storage Kosong (untuk memudahkan demonstrasi)
function getInitialDummyData() {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");

  return [
    {
      id: Date.now() - 400000,
      title: "Makan Siang Nasi Padang",
      amount: 35000,
      category: "Makanan",
      date: `${y}-${m}-01`,
      created_at: new Date().toISOString()
    },
    {
      id: Date.now() - 300000,
      title: "Bensin Motor Bulanan",
      amount: 50000,
      category: "Bensin",
      date: `${y}-${m}-01`,
      created_at: new Date().toISOString()
    },
    {
      id: Date.now() - 200000,
      title: "Paket Internet & Wi-Fi",
      amount: 275000,
      category: "Internet",
      date: `${y}-${m}-01`,
      created_at: new Date().toISOString()
    },
    {
      id: Date.now() - 100000,
      title: "Sabun Cuci Muka & Skincare",
      amount: 85000,
      category: "Body Care",
      date: `${y}-${m}-01`,
      created_at: new Date().toISOString()
    }
  ];
}

// Inisialisasi & Penyimpanan Data
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Gagal memuat data dari localStorage:", error);
  }
  const dummy = getInitialDummyData();
  saveTransactions(dummy);
  return dummy;
}

function saveTransactions(dataToSave) {
  try {
    transactions = dataToSave || transactions;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.error("Gagal menyimpan ke localStorage:", error);
    showToast("Gagal menyimpan data ke penyimpanan lokal.", "error");
  }
}

// DOM Elements
const monthPicker = document.getElementById("monthPicker");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");

const totalExpenseAmountEl = document.getElementById("totalExpenseAmount");
const dailyAverageAmountEl = document.getElementById("dailyAverageAmount");
const topCategoryNameEl = document.getElementById("topCategoryName");
const topCategoryAmountEl = document.getElementById("topCategoryAmount");
const selectedMonthBadge = document.getElementById("selectedMonthBadge");
const transactionCountBadge = document.getElementById("transactionCountBadge");
const daysPassedTextEl = document.getElementById("daysPassedText");
const categoryBreakdownListEl = document.getElementById("categoryBreakdownList");

const transactionForm = document.getElementById("transactionForm");
const formTitleText = document.getElementById("formTitleText");
const submitBtnText = document.getElementById("submitBtnText");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const editTransactionIdInput = document.getElementById("editTransactionId");
const transactionTitleInput = document.getElementById("transactionTitleInput");
const transactionAmountInput = document.getElementById("transactionAmountInput");
const transactionDateInput = document.getElementById("transactionDateInput");
const transactionCategorySelect = document.getElementById("transactionCategorySelect");

const titleError = document.getElementById("titleError");
const amountError = document.getElementById("amountError");
const dateError = document.getElementById("dateError");

const transactionListContainer = document.getElementById("transactionListContainer");
const emptyStateContainer = document.getElementById("emptyStateContainer");
const historyPeriodLabel = document.getElementById("historyPeriodLabel");
const searchTransactionInput = document.getElementById("searchTransactionInput");
const filterCategorySelect = document.getElementById("filterCategorySelect");

const exportBtn = document.getElementById("exportBtn");
const importTriggerBtn = document.getElementById("importTriggerBtn");
const importFileInput = document.getElementById("importFileInput");
const exportModal = document.getElementById("exportModal");
const closeExportModalBtn = document.getElementById("closeExportModalBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportCsvBtn = document.getElementById("exportCsvBtn");

const deleteModal = document.getElementById("deleteModal");
const closeDeleteModalBtn = document.getElementById("closeDeleteModalBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const deleteItemTitle = document.getElementById("deleteItemTitle");
const deleteItemAmount = document.getElementById("deleteItemAmount");

const toastNotification = document.getElementById("toastNotification");
const toastIcon = document.getElementById("toastIcon");
const toastMessage = document.getElementById("toastMessage");
let toastTimeout = null;

// ==========================================
// TOAST NOTIFIKASI
// ==========================================
function showToast(message, type = "success") {
  if (toastTimeout) clearTimeout(toastTimeout);

  toastMessage.textContent = message;
  toastNotification.className = `tracker-toast tracker-toast--${type}`;
  toastIcon.textContent = type === "success" ? "✅" : "⚠️";
  toastNotification.classList.remove("visually-hidden");

  toastTimeout = setTimeout(() => {
    toastNotification.classList.add("visually-hidden");
  }, 3200);
}

// ==========================================
// LOGIKA PEMILIHAN BULAN
// ==========================================
function setMonth(yearMonthString) {
  currentSelectedMonth = yearMonthString;
  monthPicker.value = yearMonthString;
  const monthLabel = getMonthNameIndonesian(yearMonthString);
  selectedMonthBadge.textContent = monthLabel;
  historyPeriodLabel.textContent = monthLabel;

  render();
}

function changeMonth(offset) {
  const [year, month] = currentSelectedMonth.split("-").map(Number);
  const targetDate = new Date(year, month - 1 + offset, 1);
  const newYear = targetDate.getFullYear();
  const newMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
  setMonth(`${newYear}-${newMonth}`);
}

// ==========================================
// PERHITUNGAN RINGKASAN (SUMMARY)
// ==========================================
function updateSummary(filteredMonthlyExpenses) {
  // 1. Total Pengeluaran Bulan Ini
  const totalExpense = filteredMonthlyExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  totalExpenseAmountEl.textContent = formatRupiah(totalExpense);
  transactionCountBadge.textContent = `${filteredMonthlyExpenses.length} Transaksi`;

  // 2. Rata-Rata Harian
  const [selectedYear, selectedMonth] = currentSelectedMonth.split("-").map(Number);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === selectedYear && (now.getMonth() + 1) === selectedMonth;
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  let divisorDays = 1;
  if (isCurrentMonth) {
    divisorDays = Math.max(1, now.getDate());
    daysPassedTextEl.textContent = `Berdasarkan ${divisorDays} hari yang telah berlalu`;
  } else if (new Date(selectedYear, selectedMonth - 1, 1) > now) {
    divisorDays = daysInMonth;
    daysPassedTextEl.textContent = `Estimasi penuh ${daysInMonth} hari`;
  } else {
    divisorDays = daysInMonth;
    daysPassedTextEl.textContent = `Berdasarkan total ${daysInMonth} hari bulan ini`;
  }

  const dailyAverage = totalExpense > 0 ? Math.round(totalExpense / divisorDays) : 0;
  dailyAverageAmountEl.textContent = formatRupiah(dailyAverage);

  // 3. Kategori Terbesar & Distribusi
  const categoryTotals = {
    Makanan: 0,
    Bensin: 0,
    "Body Care": 0,
    Internet: 0,
    Belanja: 0,
    Lainnya: 0
  };

  filteredMonthlyExpenses.forEach((item) => {
    if (categoryTotals[item.category] !== undefined) {
      categoryTotals[item.category] += Number(item.amount || 0);
    } else {
      categoryTotals["Lainnya"] += Number(item.amount || 0);
    }
  });

  let topCategory = "-";
  let topAmount = 0;

  Object.entries(categoryTotals).forEach(([cat, amount]) => {
    if (amount > topAmount) {
      topAmount = amount;
      topCategory = cat;
    }
  });

  if (topAmount > 0) {
    const config = CATEGORY_CONFIG[topCategory] || { icon: "🏷️" };
    topCategoryNameEl.textContent = `${config.icon} ${topCategory}`;
    topCategoryAmountEl.textContent = `${formatRupiah(topAmount)} (${Math.round((topAmount / totalExpense) * 100)}%)`;
  } else {
    topCategoryNameEl.textContent = "-";
    topCategoryAmountEl.textContent = "Rp 0";
  }

  // Render Distribusi Kategori
  renderCategoryBreakdown(categoryTotals, totalExpense);
}

function renderCategoryBreakdown(categoryTotals, totalExpense) {
  categoryBreakdownListEl.innerHTML = "";

  Object.entries(categoryTotals).forEach(([catName, amount]) => {
    const config = CATEGORY_CONFIG[catName] || { icon: "🏷️", barColor: "#64748B" };
    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;

    const itemEl = document.createElement("div");
    itemEl.className = "tracker-breakdown-item";
    itemEl.innerHTML = `
      <div class="tracker-breakdown-item__meta">
        <span class="tracker-breakdown-item__name">${config.icon} ${catName}</span>
        <span class="tracker-breakdown-item__amount">${formatRupiah(amount)} (${percentage}%)</span>
      </div>
      <div class="tracker-breakdown-item__bar">
        <div class="tracker-breakdown-item__fill" style="width: ${percentage}%; background-color: ${config.barColor};"></div>
      </div>
    `;
    categoryBreakdownListEl.appendChild(itemEl);
  });
}

// ==========================================
// RENDER DAFTAR TRANSAKSI
// ==========================================
function render() {
  // 1. Ambil transaksi yang sesuai bulan aktif
  const monthlyExpenses = transactions.filter((t) => t.date && t.date.startsWith(currentSelectedMonth));

  // 2. Update summary cards
  updateSummary(monthlyExpenses);

  // 3. Filter berdasarkan pencarian & kategori
  let displayList = [...monthlyExpenses];

  if (currentSearchQuery.trim() !== "") {
    const query = currentSearchQuery.toLowerCase().trim();
    displayList = displayList.filter((t) => (t.title || "").toLowerCase().includes(query));
  }

  if (currentCategoryFilter !== "ALL") {
    displayList = displayList.filter((t) => t.category === currentCategoryFilter);
  }

  // Urutkan dari tanggal terbaru (newest first)
  displayList.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

  // 4. Render ke list
  transactionListContainer.innerHTML = "";

  if (displayList.length === 0) {
    emptyStateContainer.classList.remove("visually-hidden");
  } else {
    emptyStateContainer.classList.add("visually-hidden");

    displayList.forEach((item) => {
      const card = createTransactionElement(item);
      transactionListContainer.appendChild(card);
    });
  }
}

function createTransactionElement(item) {
  const catConfig = CATEGORY_CONFIG[item.category] || {
    icon: "🏷️",
    class: "tracker-item__category-badge--lainnya"
  };

  const card = document.createElement("div");
  card.className = "tracker-item";
  card.dataset.id = item.id;

  card.innerHTML = `
    <div class="tracker-item__left">
      <span class="tracker-item__category-badge ${catConfig.class}">
        <span>${catConfig.icon}</span> ${item.category}
      </span>
      <div class="tracker-item__details">
        <h4 class="tracker-item__title" title="${item.title}">${escapeHtml(item.title)}</h4>
        <span class="tracker-item__date">${formatIndonesianDate(item.date)}</span>
      </div>
    </div>
    <div class="tracker-item__right">
      <span class="tracker-item__amount">${formatRupiah(item.amount)}</span>
      <div class="tracker-item__actions">
        <button type="button" class="tracker-item__btn tracker-item__btn--edit" title="Edit Transaksi">Edit</button>
        <button type="button" class="tracker-item__btn tracker-item__btn--delete" title="Hapus Transaksi">Hapus</button>
      </div>
    </div>
  `;

  // Event Listeners tombol aksi
  const editBtn = card.querySelector(".tracker-item__btn--edit");
  const deleteBtn = card.querySelector(".tracker-item__btn--delete");

  editBtn.addEventListener("click", () => startEditTransaction(item.id));
  deleteBtn.addEventListener("click", () => openDeleteModal(item.id));

  return card;
}

function escapeHtml(string) {
  const div = document.createElement("div");
  div.textContent = string;
  return div.innerHTML;
}

// ==========================================
// FORM MANAGEMENT (TAMBAH / EDIT)
// ==========================================
function validateForm() {
  let isValid = true;

  titleError.textContent = "";
  amountError.textContent = "";
  dateError.textContent = "";

  const title = transactionTitleInput.value.trim();
  const amount = Number(transactionAmountInput.value);
  const date = transactionDateInput.value;

  if (!title) {
    titleError.textContent = "Deskripsi pengeluaran wajib diisi.";
    isValid = false;
  }

  if (!amount || amount <= 0) {
    amountError.textContent = "Nominal harus berupa angka lebih dari 0.";
    isValid = false;
  }

  if (!date) {
    dateError.textContent = "Tanggal transaksi wajib diisi.";
    isValid = false;
  }

  return isValid;
}

function startEditTransaction(id) {
  const item = transactions.find((t) => t.id === id);
  if (!item) return;

  editingId = id;
  editTransactionIdInput.value = item.id;
  transactionTitleInput.value = item.title;
  transactionAmountInput.value = item.amount;
  transactionDateInput.value = item.date;
  transactionCategorySelect.value = item.category;

  formTitleText.textContent = "Edit Pengeluaran";
  submitBtnText.textContent = "Perbarui Transaksi";
  cancelEditBtn.classList.remove("visually-hidden");

  // Scroll ke form pada mobile & focus ke input
  transactionTitleInput.focus();
  transactionTitleInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetForm() {
  editingId = null;
  editTransactionIdInput.value = "";
  transactionForm.reset();
  transactionDateInput.value = getTodayDateString();
  transactionCategorySelect.value = "Makanan";

  formTitleText.textContent = "Tambah Pengeluaran";
  submitBtnText.textContent = "Simpan Pengeluaran";
  cancelEditBtn.classList.add("visually-hidden");

  titleError.textContent = "";
  amountError.textContent = "";
  dateError.textContent = "";
}

// Event Submit Form
transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const title = transactionTitleInput.value.trim();
  const amount = Number(transactionAmountInput.value);
  const date = transactionDateInput.value;
  const category = transactionCategorySelect.value;

  if (editingId) {
    // Mode Edit
    transactions = transactions.map((t) =>
      t.id === editingId
        ? { ...t, title, amount, date, category, updated_at: new Date().toISOString() }
        : t
    );
    saveTransactions();
    showToast("Pengeluaran berhasil diperbarui!");
  } else {
    // Mode Tambah
    const newTransaction = {
      id: Date.now(),
      title,
      amount,
      date,
      category,
      created_at: new Date().toISOString()
    };
    transactions.unshift(newTransaction);
    saveTransactions();
    showToast("Pengeluaran berhasil dicatat!");
  }

  // Jika tanggal transaksi berada di luar bulan yang aktif, alihkan filter bulan ke bulan transaksi
  const transactionMonth = date.substring(0, 7);
  if (transactionMonth !== currentSelectedMonth) {
    setMonth(transactionMonth);
  } else {
    render();
  }

  resetForm();
});

cancelEditBtn.addEventListener("click", resetForm);

// ==========================================
// MODAL HAPUS TRANSAKSI
// ==========================================
function openDeleteModal(id) {
  const item = transactions.find((t) => t.id === id);
  if (!item) return;

  transactionToDeleteId = id;
  deleteItemTitle.textContent = `"${item.title}"`;
  deleteItemAmount.textContent = formatRupiah(item.amount);

  deleteModal.classList.remove("visually-hidden");
}

function closeDeleteModal() {
  transactionToDeleteId = null;
  deleteModal.classList.add("visually-hidden");
}

confirmDeleteBtn.addEventListener("click", () => {
  if (!transactionToDeleteId) return;

  transactions = transactions.filter((t) => t.id !== transactionToDeleteId);
  saveTransactions();

  if (editingId === transactionToDeleteId) {
    resetForm();
  }

  closeDeleteModal();
  render();
  showToast("Pengeluaran berhasil dihapus.", "success");
});

closeDeleteModalBtn.addEventListener("click", closeDeleteModal);
cancelDeleteBtn.addEventListener("click", closeDeleteModal);
deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

// ==========================================
// BACKUP & RESTORE (EKSPOR & IMPOR DATA)
// ==========================================
function openExportModal() {
  exportModal.classList.remove("visually-hidden");
}

function closeExportModal() {
  exportModal.classList.add("visually-hidden");
}

function downloadFile(content, fileName, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToJson() {
  const dataStr = JSON.stringify(transactions, null, 2);
  const fileName = `expense_backup_${getTodayDateString()}.json`;
  downloadFile(dataStr, fileName, "application/json");
  closeExportModal();
  showToast("Data berhasil diekspor ke JSON!");
}

function exportToCsv() {
  if (transactions.length === 0) {
    showToast("Belum ada data untuk diekspor ke CSV.", "error");
    return;
  }

  const headers = ["ID", "Deskripsi", "Nominal", "Kategori", "Tanggal", "Created_At"];
  const rows = transactions.map((t) => [
    t.id,
    `"${(t.title || "").replace(/"/g, '""')}"`,
    t.amount,
    `"${t.category}"`,
    t.date,
    t.created_at || ""
  ]);

  const csvContent = [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const fileName = `expense_report_${getTodayDateString()}.csv`;
  downloadFile(csvContent, fileName, "text/csv;charset=utf-8;");
  closeExportModal();
  showToast("Data berhasil diekspor ke CSV!");
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      if (!Array.isArray(importedData)) {
        throw new Error("Format JSON harus berupa array transaksi.");
      }

      // Validasi dasar struktur transaksi
      const isValidStructure = importedData.every(
        (item) => item.title && item.amount !== undefined && item.date && item.category
      );

      if (!isValidStructure) {
        throw new Error("Struktur file tidak cocok dengan format Expense Tracker.");
      }

      const confirmImport = confirm(
        `Ditemukan ${importedData.length} transaksi pada file. Apakah Anda ingin menimpa data yang ada dengan data impor ini?`
      );

      if (confirmImport) {
        transactions = importedData;
        saveTransactions();
        render();
        showToast(`Berhasil memulihkan ${importedData.length} transaksi!`);
      }
    } catch (err) {
      console.error("Import Error:", err);
      showToast(`Gagal mengimpor file: ${err.message}`, "error");
    } finally {
      importFileInput.value = "";
    }
  };

  reader.readAsText(file);
}

// Event Listeners Export / Import
exportBtn.addEventListener("click", openExportModal);
closeExportModalBtn.addEventListener("click", closeExportModal);
exportJsonBtn.addEventListener("click", exportToJson);
exportCsvBtn.addEventListener("click", exportToCsv);
exportModal.addEventListener("click", (e) => {
  if (e.target === exportModal) closeExportModal();
});

importTriggerBtn.addEventListener("click", () => importFileInput.click());
importFileInput.addEventListener("change", handleFileImport);

// ==========================================
// EVENT LISTENERS UMUM & FILTER
// ==========================================
monthPicker.addEventListener("change", (e) => {
  if (e.target.value) {
    setMonth(e.target.value);
  }
});

prevMonthBtn.addEventListener("click", () => changeMonth(-1));
nextMonthBtn.addEventListener("click", () => changeMonth(1));

searchTransactionInput.addEventListener("input", (e) => {
  currentSearchQuery = e.target.value;
  render();
});

filterCategorySelect.addEventListener("change", (e) => {
  currentCategoryFilter = e.target.value;
  render();
});

// Shortcut Escape untuk menutup modal
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeDeleteModal();
    closeExportModal();
  }
});

// Inisialisasi awal saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  transactions = loadTransactions();
  transactionDateInput.value = getTodayDateString();
  setMonth(currentSelectedMonth);
});