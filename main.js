/**
 * ========================================================
 * Monthly Expense Tracker — main.js
 * Logika Antarmuka Pengguna & Integrasi REST API (Node.js + SQLite)
 * ========================================================
 */

// Base URL API Backend (relatif ke host server yang sama)
const API_BASE_URL = "/api";

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
let isFetching = false;

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
const submitTransactionBtn = document.getElementById("submitTransactionBtn");
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
// REST API CALLS (Node.js + SQLite)
// ==========================================

/**
 * Mengambil data transaksi dan ringkasan dari Backend
 */
async function loadDataFromBackend() {
  try {
    isFetching = true;

    // Ambil data transaksi bulan aktif dari REST API
    const params = new URLSearchParams({
      month: currentSelectedMonth
    });

    if (currentCategoryFilter !== "ALL") {
      params.append("category", currentCategoryFilter);
    }

    if (currentSearchQuery.trim() !== "") {
      params.append("q", currentSearchQuery.trim());
    }

    const [expensesResponse, summaryResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/expenses?${params.toString()}`),
      fetch(`${API_BASE_URL}/summary?month=${encodeURIComponent(currentSelectedMonth)}`)
    ]);

    if (!expensesResponse.ok || !summaryResponse.ok) {
      throw new Error("Gagal menghubungi server API");
    }

    const expensesJson = await expensesResponse.json();
    const summaryJson = await summaryResponse.json();

    if (expensesJson.success) {
      transactions = expensesJson.data || [];
    }

    if (summaryJson.success) {
      renderSummaryData(summaryJson.data);
    }

    renderTransactionList(transactions);
  } catch (error) {
    console.error("Error loading data from API:", error);
    showToast("Gagal memuat data dari server: " + error.message, "error");
  } finally {
    isFetching = false;
  }
}

/**
 * Render Ringkasan dari hasil kalkulasi Backend SQLite
 */
function renderSummaryData(summary) {
  if (!summary) return;

  // 1. Total Pengeluaran & Jumlah Transaksi
  totalExpenseAmountEl.textContent = formatRupiah(summary.totalExpense);
  transactionCountBadge.textContent = `${summary.transactionCount} Transaksi`;

  // 2. Rata-Rata Harian
  dailyAverageAmountEl.textContent = formatRupiah(summary.dailyAverage);
  daysPassedTextEl.textContent = summary.daysDescription || "Berdasarkan hari berlalu";

  // 3. Kategori Terbesar
  if (summary.topCategory && summary.topCategory !== "-") {
    const config = CATEGORY_CONFIG[summary.topCategory] || { icon: "🏷️" };
    topCategoryNameEl.textContent = `${config.icon} ${summary.topCategory}`;
    topCategoryAmountEl.textContent = `${formatRupiah(summary.topCategoryAmount)} (${summary.topCategoryPercentage}%)`;
  } else {
    topCategoryNameEl.textContent = "-";
    topCategoryAmountEl.textContent = "Rp 0";
  }

  // 4. Distribusi Kategori
  renderCategoryBreakdown(summary.categoryBreakdown || [], summary.totalExpense);
}

function renderCategoryBreakdown(breakdownList, totalExpense) {
  categoryBreakdownListEl.innerHTML = "";

  breakdownList.forEach((item) => {
    const config = CATEGORY_CONFIG[item.category] || { icon: "🏷️", barColor: "#64748B" };
    const percentage = item.percentage || (totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0);

    const itemEl = document.createElement("div");
    itemEl.className = "tracker-breakdown-item";
    itemEl.innerHTML = `
      <div class="tracker-breakdown-item__meta">
        <span class="tracker-breakdown-item__name">${config.icon} ${item.category}</span>
        <span class="tracker-breakdown-item__amount">${formatRupiah(item.amount)} (${percentage}%)</span>
      </div>
      <div class="tracker-breakdown-item__bar">
        <div class="tracker-breakdown-item__fill" style="width: ${percentage}%; background-color: ${config.barColor};"></div>
      </div>
    `;
    categoryBreakdownListEl.appendChild(itemEl);
  });
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

  loadDataFromBackend();
}

function changeMonth(offset) {
  const [year, month] = currentSelectedMonth.split("-").map(Number);
  const targetDate = new Date(year, month - 1 + offset, 1);
  const newYear = targetDate.getFullYear();
  const newMonth = String(targetDate.getMonth() + 1).padStart(2, "0");
  setMonth(`${newYear}-${newMonth}`);
}

// ==========================================
// RENDER DAFTAR TRANSAKSI
// ==========================================
function renderTransactionList(listToRender) {
  transactionListContainer.innerHTML = "";

  if (!listToRender || listToRender.length === 0) {
    emptyStateContainer.classList.remove("visually-hidden");
  } else {
    emptyStateContainer.classList.add("visually-hidden");

    listToRender.forEach((item) => {
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
        <h4 class="tracker-item__title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
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
  if (!string) return "";
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
transactionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const title = transactionTitleInput.value.trim();
  const amount = Number(transactionAmountInput.value);
  const date = transactionDateInput.value;
  const category = transactionCategorySelect.value;

  submitTransactionBtn.disabled = true;

  try {
    if (editingId) {
      // Mode Edit (PUT ke backend)
      const res = await fetch(`${API_BASE_URL}/expenses/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount, date, category })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal memperbarui data.");
      }

      showToast("Pengeluaran berhasil diperbarui!");
    } else {
      // Mode Tambah (POST ke backend)
      const res = await fetch(`${API_BASE_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, amount, date, category })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mencatat pengeluaran.");
      }

      showToast("Pengeluaran berhasil dicatat!");
    }

    // Jika tanggal transaksi berada di luar bulan yang aktif, alihkan filter bulan ke bulan transaksi
    const transactionMonth = date.substring(0, 7);
    if (transactionMonth !== currentSelectedMonth) {
      setMonth(transactionMonth);
    } else {
      await loadDataFromBackend();
    }

    resetForm();
  } catch (err) {
    console.error("Form submit error:", err);
    showToast(err.message, "error");
  } finally {
    submitTransactionBtn.disabled = false;
  }
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

confirmDeleteBtn.addEventListener("click", async () => {
  if (!transactionToDeleteId) return;

  try {
    confirmDeleteBtn.disabled = true;

    const res = await fetch(`${API_BASE_URL}/expenses/${transactionToDeleteId}`, {
      method: "DELETE"
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Gagal menghapus pengeluaran.");
    }

    if (editingId === transactionToDeleteId) {
      resetForm();
    }

    closeDeleteModal();
    await loadDataFromBackend();
    showToast("Pengeluaran berhasil dihapus.", "success");
  } catch (err) {
    console.error("Delete error:", err);
    showToast(err.message, "error");
  } finally {
    confirmDeleteBtn.disabled = false;
  }
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

function exportToJson() {
  window.location.href = `${API_BASE_URL}/export?format=json`;
  closeExportModal();
  showToast("Mengunduh cadangan data JSON...");
}

function exportToCsv() {
  window.location.href = `${API_BASE_URL}/export?format=csv`;
  closeExportModal();
  showToast("Mengunduh laporan CSV...");
}

async function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function (e) {
    try {
      const importedData = JSON.parse(e.target.result);

      if (!Array.isArray(importedData)) {
        throw new Error("Format file JSON harus berupa daftar transaksi array.");
      }

      const confirmImport = confirm(
        `Ditemukan ${importedData.length} transaksi pada file cadangan. Apakah Anda ingin menimpa database dengan data ini?`
      );

      if (!confirmImport) return;

      const response = await fetch(`${API_BASE_URL}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replace: true, transactions: importedData })
      });

      const resData = await response.json();
      if (!response.ok || !resData.success) {
        throw new Error(resData.message || "Gagal mengimpor data ke server.");
      }

      await loadDataFromBackend();
      showToast(resData.message || `Berhasil memulihkan ${importedData.length} transaksi!`);
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

// Debounce pencarian
let searchTimeout = null;
searchTransactionInput.addEventListener("input", (e) => {
  currentSearchQuery = e.target.value;
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadDataFromBackend();
  }, 250);
});

filterCategorySelect.addEventListener("change", (e) => {
  currentCategoryFilter = e.target.value;
  loadDataFromBackend();
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
  transactionDateInput.value = getTodayDateString();
  setMonth(currentSelectedMonth);
});