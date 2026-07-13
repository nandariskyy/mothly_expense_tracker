/**
 * ========================================================
 * Expense Tracker App — main.js
 * ========================================================
 * Tulis seluruh kode JavaScript kamu di sini.
 */

// TODO [Basic] Buat variabel array untuk menyimpan semua data transaksi, contoh: let transactions = []
// TODO [Basic] Buat fungsi untuk menghasilkan ID unik secara otomatis, contoh: gunakan +new Date()
const STORAGE_KEY = "expenseTrackerTransactions";

// array utama yang menyimpan semua transaksi (di-load dari localStorage saat pertama kali dibuka)
let transactions = loadTransactions();

// menyimpan id transaksi yang sedang diedit. null berarti form dalam mode "Tambah".
let editingId = null;

// menyimpan kata kunci pencarian saat ini, supaya render() selalu tahu harus memfilter apa
let currentSearchKeyword = "";

// membuat id unik otomatis menggunakan timestamp
function generateId() {
  return +new Date();
}

/**
 * ========================================================
 * Kriteria 1: Memanipulasi DOM untuk Form dan Daftar Transaksi
 * ========================================================
 */

const incomeList = document.getElementById("incomeList");
const expenseList = document.getElementById("expenseList");

const transactionForm = document.getElementById("transactionForm");
const titleInput = document.getElementById("transactionFormTitleInput");
const amountInput = document.getElementById("transactionFormAmountInput");
const dateInput = document.getElementById("transactionFormDateInput");
const typeSelect = document.getElementById("transactionFormTypeSelect");
const submitButton = document.querySelector(
  '[data-testid="transactionFormSubmitButton"]'
);

const searchForm = document.getElementById("searchTransactionForm");
const searchInput = document.getElementById("searchTransactionFormTitleInput");

const balanceAmountEl = document.querySelector(".tracker-summary__balance-amount");
const incomeAmountEl = document.querySelector(".tracker-summary__stat-amount--income");
const expenseAmountEl = document.querySelector(".tracker-summary__stat-amount--expense");

function createTransactionCard(transaction) {
  const card = document.createElement("div");
  card.dataset.testid = "transactionItem";
  card.className = "tracker-transaction-item";

  const title = document.createElement("h3");
  title.dataset.testid = "transactionItemTitle";
  title.className = "tracker-transaction-item__title";
  title.textContent = transaction.title;

  const amount = document.createElement("p");
  amount.dataset.testid = "transactionItemAmount";
  amount.className = `tracker-transaction-item__amount tracker-transaction-item__amount--${transaction.type}`;
  amount.textContent = `Nominal: Rp${transaction.amount.toLocaleString("id-ID")}`;

  const date = document.createElement("p");
  date.dataset.testid = "transactionItemDate";
  date.className = "tracker-transaction-item__date";
  date.textContent = `Tanggal: ${transaction.date}`;

  const type = document.createElement("p");
  type.dataset.testid = "transactionItemType";
  type.textContent = `Tipe: ${transaction.type === "income" ? "Pemasukan" : "Pengeluaran"}`;

  // wrapper tombol aksi
  const actions = document.createElement("div");
  actions.className = "tracker-transaction-item__actions";

  // Tombol Edit 
  const editButton = document.createElement("button");
  editButton.dataset.testid = "transactionItemEditButton";
  editButton.className = "tracker-transaction-item__btn";
  editButton.textContent = "Edit";
  editButton.type = "button";
  editButton.addEventListener("click", () => startEditTransaction(transaction.id));

  // Tombol Ubah Tipe 
  const editTypeButton = document.createElement("button");
  editTypeButton.dataset.testid = "transactionItemEditTypeButton";
  editTypeButton.className = "tracker-transaction-item__btn";
  editTypeButton.textContent = "Ubah Tipe";
  editTypeButton.type = "button";
  editTypeButton.addEventListener("click", () => toggleTransactionType(transaction.id));

  // Tombol Hapus 
  const deleteButton = document.createElement("button");
  deleteButton.dataset.testid = "transactionItemDeleteButton";
  deleteButton.className = "tracker-transaction-item__btn";
  deleteButton.textContent = "Hapus";
  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

  actions.append(editButton, editTypeButton, deleteButton);
  card.append(title, amount, date, type, actions);

  return card;
}

function render() {
  // kosongkan dulu kedua kontainer sebelum diisi ulang
  incomeList.innerHTML = "";
  expenseList.innerHTML = "";

  const keyword = currentSearchKeyword.trim().toLowerCase();

  // filter berdasarkan kata kunci pencarian (Kriteria 3)
  const filtered = keyword
    ? transactions.filter((t) => t.title.toLowerCase().includes(keyword))
    : transactions;

  filtered.forEach((transaction) => {
    const card = createTransactionCard(transaction);
    if (transaction.type === "income") {
      incomeList.appendChild(card);
    } else {
      expenseList.appendChild(card);
    }
  });
}

function updateDashboard() {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  balanceAmountEl.textContent = `Rp ${balance.toLocaleString("id-ID")}`;
  incomeAmountEl.textContent = `Rp ${totalIncome.toLocaleString("id-ID")}`;
  expenseAmountEl.textContent = `Rp ${totalExpense.toLocaleString("id-ID")}`;
}

// CRUD TRANSAKSI
function addTransaction(data) {
  const newTransaction = {
    id: generateId(),
    title: data.title,
    amount: data.amount,
    date: data.date,
    type: data.type,
  };
  transactions.push(newTransaction);
  saveTransactions();
  notifyTransactionsChanged();
}

function updateTransactionData(id, data) {
  transactions = transactions.map((t) =>
    t.id === id ? { ...t, ...data } : t
  );
  saveTransactions();
  notifyTransactionsChanged();
}

function deleteTransaction(id) {
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  notifyTransactionsChanged();

  // kalau transaksi yang sedang diedit ternyata dihapus, batalkan mode edit
  if (editingId === id) {
    resetFormToAddMode();
  }
}

function toggleTransactionType(id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  const newType = transaction.type === "income" ? "expense" : "income";
  updateTransactionData(id, { type: newType });
}


/**
 * ========================================================
 * Kriteria 2: Mengelola Penyimpanan Data (Web Storage API)
 * ========================================================
 */

function loadTransactions() {
  const raw = localStorage.getItem(STORAGE_KEY);
  // kalau belum pernah menyimpan apa pun, kembalikan array kosong
  return raw ? JSON.parse(raw) : [];
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function notifyTransactionsChanged() {
  document.dispatchEvent(new Event("transactions:changed"));
}

document.addEventListener("transactions:changed", () => {
  render();
  updateDashboard();
});

function startEditTransaction(id) {
  const transaction = transactions.find((t) => t.id === id);
  if (!transaction) return;

  editingId = id;

  titleInput.value = transaction.title;
  amountInput.value = transaction.amount;
  dateInput.value = transaction.date;
  typeSelect.value = transaction.type;

  submitButton.textContent = "Update Transaksi";

  // fokuskan ke form supaya user langsung tahu sedang dalam mode edit
  titleInput.focus();
}

function resetFormToAddMode() {
  editingId = null;
  transactionForm.reset();
  submitButton.textContent = "Simpan";
}

// EVENT: SUBMIT FORM TAMBAH / EDIT TRANSAKSI
transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = titleInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;
  const type = typeSelect.value;

  // Validasi (Kriteria 1 - Skilled): judul tidak boleh kosong, nominal minimal 1
  if (title === "") {
    alert("Judul transaksi tidak boleh kosong.");
    return;
  }
  if (!amount || amount < 1) {
    alert("Nominal harus diisi dan minimal Rp1.");
    return;
  }

  const data = { title, amount, date, type };

  if (editingId !== null) {
    updateTransactionData(editingId, data);
  } else {
    addTransaction(data);
  }

  resetFormToAddMode();
});


/**
 * ========================================================
 * Kriteria 3: Fitur Interaktif (Pindah Kategori dan Pencarian)
 * ========================================================
 */

// pencarian real-time saat user mengetik (Skilled)
searchInput.addEventListener("input", (e) => {
  currentSearchKeyword = e.target.value;
  render();
});

// tetap tangani submit form pencarian (misalnya user menekan tombol Cari / Enter)
// supaya halaman tidak reload karena form submit default
searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  currentSearchKeyword = searchInput.value;
  render();
});

render();
updateDashboard();