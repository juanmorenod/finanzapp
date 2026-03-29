/* ============================================
   FINANZAPP — app.js
   Control de Gastos Personales
   Firebase Authentication + Cloud Firestore
============================================ */

'use strict';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup,
  signOut as firebaseSignOut, onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, collection, doc, addDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ==========================================
// FIREBASE CONFIG
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCBIIo65uxEmYPuW0Zv3TX5LGaQQEjv2Fk",
  authDomain: "presupuesto-2bcd5.firebaseapp.com",
  projectId: "presupuesto-2bcd5",
  storageBucket: "presupuesto-2bcd5.firebasestorage.app",
  messagingSenderId: "458194075608",
  appId: "1:458194075608:web:d7ca5ea38f220e12c77cad",
};

const app      = initializeApp(firebaseConfig);
const auth     = getAuth(app);
const db       = getFirestore(app);
const provider = new GoogleAuthProvider();

// ==========================================
// CONSTANTS & CONFIG
// ==========================================
const ITEMS_PER_PAGE = 10;
const CATEGORIES     = ['Comida', 'Transporte', 'Cuidado personal', 'Entretenimiento', 'Salidas', 'Hogar'];
const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta Rappi', 'Tarjeta DAVIBank'];

const CAT_COLORS = {
  'Comida':            { bg: '#F59E0B', alpha: 'rgba(245,158,11,0.8)' },
  'Transporte':        { bg: '#3B82F6', alpha: 'rgba(59,130,246,0.8)' },
  'Cuidado personal':  { bg: '#EC4899', alpha: 'rgba(236,72,153,0.8)' },
  'Entretenimiento':   { bg: '#10B981', alpha: 'rgba(16,185,129,0.8)' },
  'Salidas':           { bg: '#6C63FF', alpha: 'rgba(108,99,255,0.8)' },
  'Hogar':             { bg: '#14B8A6', alpha: 'rgba(20,184,166,0.8)' },
};

const CAT_EMOJIS = {
  'Comida': '🍽️', 'Transporte': '🚗', 'Cuidado personal': '💆',
  'Entretenimiento': '🎮', 'Salidas': '🎉', 'Hogar': '🏠',
};

const CAT_BADGE_CLASS = {
  'Comida': 'cat-comida', 'Transporte': 'cat-transporte', 'Cuidado personal': 'cat-cuidado',
  'Entretenimiento': 'cat-entretenimiento', 'Salidas': 'cat-salidas', 'Hogar': 'cat-hogar',
};

// ==========================================
// STATE
// ==========================================
let expenses      = [];
let currentPage   = 1;
let deleteId      = null;
let pieChartInst  = null;
let barChartInst  = null;
let currentUser   = null;
let unsubSnapshot = null;

// ==========================================
// AUTH
// ==========================================
window.signInWithGoogle = async function () {
  try {
    showLoading(true);
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error('Login error:', err);
    showLoading(false);
    showToast('Error al iniciar sesión. Inténtalo de nuevo.', 'error');
  }
};

window.signOut = async function () {
  try {
    if (unsubSnapshot) unsubSnapshot();
    await firebaseSignOut(auth);
    expenses = []; currentUser = null;
  } catch (err) {
    console.error('Sign-out error:', err);
    showToast('Error al cerrar sesión.', 'error');
  }
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showLoading(true);
    updateUserInfo(user);
    showApp();
    startFirestoreListener(user.uid);
  } else {
    currentUser = null;
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
    showLoginScreen();
  }
});

function updateUserInfo(user) {
  const avatarEl = document.getElementById('user-avatar');
  const nameEl   = document.getElementById('user-name');
  const emailEl  = document.getElementById('user-email');
  if (avatarEl) avatarEl.src = user.photoURL || '';
  if (nameEl)   nameEl.textContent = user.displayName || 'Usuario';
  if (emailEl)  emailEl.textContent = user.email || '';
}

// ==========================================
// UI SCREENS
// ==========================================
function showLoginScreen() {
  document.getElementById('login-screen').style.display  = 'flex';
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app-wrapper').classList.add('hidden');
}
function showLoading(show) {
  document.getElementById('loading-screen').style.display = show ? 'flex' : 'none';
  document.getElementById('login-screen').style.display   = 'none';
}
function showApp() {
  document.getElementById('login-screen').style.display   = 'none';
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('app-wrapper').classList.remove('hidden');
}

// ==========================================
// FIRESTORE
// ==========================================
function startFirestoreListener(uid) {
  if (unsubSnapshot) unsubSnapshot();
  const expensesRef = collection(db, 'users', uid, 'expenses');
  const q = query(expensesRef, orderBy('createdAt', 'desc'));
  unsubSnapshot = onSnapshot(q, (snapshot) => {
    expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    showLoading(false);
    initDashboardFilters();
    initForm();
    onFilterTypeChange();
    updateSidebarTotal();
    renderDashboard();
  }, (err) => {
    console.error('Firestore error:', err);
    showLoading(false);
    showToast('Error al cargar los datos. Revisa tu conexión.', 'error');
  });
}

async function addExpenseToFirestore(expenseData) {
  if (!currentUser) return;
  const expensesRef = collection(db, 'users', currentUser.uid, 'expenses');
  await addDoc(expensesRef, { ...expenseData, createdAt: serverTimestamp() });
}

async function deleteExpenseFromFirestore(expenseId) {
  if (!currentUser) return;
  const expenseRef = doc(db, 'users', currentUser.uid, 'expenses', expenseId);
  await deleteDoc(expenseRef);
}

// ==========================================
// NAVIGATION
// ==========================================
window.showView = function (name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.remove('hidden');
  document.getElementById(`nav-${name}`).classList.add('active');
  document.getElementById('sidebar').classList.remove('open');
  if (name === 'dashboard') renderDashboard();
  if (name === 'historial') { currentPage = 1; renderHistorial(); }
  return false;
};

window.toggleSidebar = function () {
  document.getElementById('sidebar').classList.toggle('open');
};

// ==========================================
// FORMAT HELPERS
// ==========================================
function formatCurrency(val) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
}
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(+y, +m - 1, +d).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ==========================================
// SIDEBAR TOTAL
// ==========================================
function updateSidebarTotal() {
  const now = new Date();
  const total = expenses.filter(e => {
    const [ey, em] = e.fecha.split('-').map(Number);
    return ey === now.getFullYear() && em - 1 === now.getMonth();
  }).reduce((s, e) => s + e.valor, 0);
  document.getElementById('sidebar-total').textContent = formatCurrency(total);
}

// ==========================================
// TOAST
// ==========================================
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ==========================================
// FORM
// ==========================================
function initForm() {
  const today = new Date().toISOString().split('T')[0];
  const fechaEl = document.getElementById('input-fecha');
  if (fechaEl) { fechaEl.value = today; fechaEl.max = today; }
}

window.handleFormSubmit = async function (e) {
  e.preventDefault();
  const nombre    = document.getElementById('input-nombre').value.trim();
  const categoria = document.getElementById('input-categoria').value;
  const fecha     = document.getElementById('input-fecha').value;
  const metodoPago = document.getElementById('input-metodo').value;
  const valor     = parseFloat(document.getElementById('input-valor').value);
  clearFormErrors();
  let valid = true;
  if (!nombre)     { showFieldError('nombre',    'El nombre es obligatorio');       valid = false; }
  if (!categoria)  { showFieldError('categoria', 'Selecciona una categoría');       valid = false; }
  if (!fecha)      { showFieldError('fecha',     'La fecha es obligatoria');        valid = false; }
  if (!metodoPago) { showFieldError('metodo',    'Selecciona un método de pago'); valid = false; }
  if (!valor || valor <= 0) { showFieldError('valor', 'El valor debe ser mayor a 0'); valid = false; }
  if (!valid) return;
  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.querySelector('.btn-text').textContent = 'Guardando...';
  try {
    await addExpenseToFirestore({ nombre, categoria, fecha, metodoPago, valor });
    resetForm();
    showToast(`Gasto "${nombre}" registrado correctamente`);
    btn.classList.add('btn-success');
    setTimeout(() => btn.classList.remove('btn-success'), 1200);
  } catch (err) {
    console.error('Error guardando gasto:', err);
    showToast('Error al guardar el gasto. Inténtalo de nuevo.', 'error');
  } finally {
    btn.disabled = false;
    btn.querySelector('.btn-text').textContent = 'Guardar Gasto';
  }
};

function showFieldError(field, msg) {
  const el = document.getElementById(`error-${field}`);
  const input = document.getElementById(`input-${field}`);
  if (el) el.textContent = msg;
  if (input) input.classList.add('error');
}
function clearFormErrors() {
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
}
window.resetForm = function () {
  document.getElementById('expense-form').reset();
  clearFormErrors();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('input-fecha').value = today;
};

// ==========================================
// HISTORIAL
// ==========================================
window.renderHistorial = function () {
  const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
  const catFilter   = document.getElementById('hist-cat-filter').value;
  const sortBy      = document.getElementById('sort-by').value;

  let filtered = expenses.filter(e => {
    const matchSearch = !searchQuery ||
      e.nombre.toLowerCase().includes(searchQuery) ||
      e.categoria.toLowerCase().includes(searchQuery) ||
      e.metodoPago.toLowerCase().includes(searchQuery);
    const matchCat = !catFilter || e.categoria === catFilter;
    return matchSearch && matchCat;
  });

  filtered.sort((a, b) => {
    if (sortBy === 'fecha-desc') return b.fecha.localeCompare(a.fecha);
    if (sortBy === 'fecha-asc')  return a.fecha.localeCompare(b.fecha);
    if (sortBy === 'valor-desc') return b.valor - a.valor;
    if (sortBy === 'valor-asc')  return a.valor - b.valor;
    return 0;
  });

  const empty      = document.getElementById('historial-empty');
  const table      = document.querySelector('.table-wrapper');
  const pagination = document.getElementById('pagination');
  document.getElementById('table-count').textContent = `${filtered.length} gasto${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    empty.style.display = 'flex'; table.style.display = 'none'; pagination.innerHTML = ''; return;
  }
  empty.style.display = 'none'; table.style.display = 'block';

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = 1;
  const startIdx  = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const tbody = document.getElementById('expense-tbody');
  tbody.innerHTML = pageItems.map(e => `
    <tr>
      <td><div style="font-weight:500;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(e.nombre)}</div></td>
      <td><span class="cat-badge ${CAT_BADGE_CLASS[e.categoria] || ''}">${CAT_EMOJIS[e.categoria] || ''} ${e.categoria}</span></td>
      <td style="color:var(--text-secondary);">${formatDate(e.fecha)}</td>
      <td><span class="metodo-badge">${e.metodoPago}</span></td>
      <td class="text-right value-cell">${formatCurrency(e.valor)}</td>
      <td class="text-center"><button class="btn-icon-sm" onclick="openDeleteModal('${e.id}')" title="Eliminar">🗑️</button></td>
    </tr>
  `).join('');
  renderPagination(totalPages);
};

function renderPagination(totalPages) {
  const pagination = document.getElementById('pagination');
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }
  let html = `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>`;
  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7) {
      if (i !== 1 && i !== totalPages && (i < currentPage - 1 || i > currentPage + 1)) {
        if (i === currentPage - 2 || i === currentPage + 2) html += `<button class="page-btn" disabled>…</button>`;
        continue;
      }
    }
    html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>`;
  pagination.innerHTML = html;
}

window.goToPage = function (page) {
  currentPage = page;
  renderHistorial();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// DELETE
// ==========================================
window.openDeleteModal = function (id) {
  deleteId = id;
  document.getElementById('modal-overlay').style.display = 'flex';
};
window.closeModal = function () {
  deleteId = null;
  document.getElementById('modal-overlay').style.display = 'none';
};
window.confirmDelete = async function () {
  if (!deleteId) return;
  const expense = expenses.find(e => e.id === deleteId);
  try {
    await deleteExpenseFromFirestore(deleteId);
    showToast(`"${expense?.nombre || 'Gasto'}" eliminado correctamente`, 'info');
  } catch (err) {
    console.error('Error eliminando gasto:', err);
    showToast('Error al eliminar. Inténtalo de nuevo.', 'error');
  }
  closeModal();
};

// ==========================================
// DASHBOARD FILTERS
// ==========================================
function initDashboardFilters() {
  const now = new Date();
  const yearSel = document.getElementById('filter-year');
  if (!yearSel) return;
  yearSel.innerHTML = '';
  for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--)
    yearSel.innerHTML += `<option value="${y}">${y}</option>`;
  document.getElementById('filter-month').value = now.getMonth();
  document.getElementById('filter-year').value  = now.getFullYear();
}

window.onFilterTypeChange = function () {
  const type = document.getElementById('filter-type').value;
  const monthSel = document.getElementById('filter-month');
  if (monthSel) monthSel.style.display = type === 'monthly' ? 'block' : 'none';
};

function getFilteredExpensesForDashboard() {
  const filterType  = document.getElementById('filter-type').value;
  const filterMonth = parseInt(document.getElementById('filter-month').value);
  const filterYear  = parseInt(document.getElementById('filter-year').value);
  const filterCat   = document.getElementById('filter-cat').value;
  return expenses.filter(e => {
    const [ey, em] = e.fecha.split('-').map(Number);
    return ey === filterYear &&
      (filterType === 'annual' || (em - 1 === filterMonth)) &&
      (!filterCat || e.categoria === filterCat);
  });
}

// ==========================================
// DASHBOARD RENDER
// ==========================================
window.renderDashboard = function () {
  const filtered   = getFilteredExpensesForDashboard();
  const hasData    = filtered.length > 0;
  const chartsGrid = document.querySelector('.charts-grid');
  const kpiGrid    = document.getElementById('kpi-grid');
  const emptyState = document.getElementById('dashboard-empty');
  if (!hasData) {
    chartsGrid.style.display = 'none'; kpiGrid.style.display = 'none'; emptyState.style.display = 'flex'; return;
  }
  chartsGrid.style.display = 'grid'; kpiGrid.style.display = 'grid'; emptyState.style.display = 'none';
  renderKPIs(filtered);
  renderPieChart(filtered);
  renderBarChart(filtered);
};

function renderKPIs(data) {
  const total = data.reduce((s, e) => s + e.valor, 0);
  const count = data.length;
  const avg   = count > 0 ? total / count : 0;
  const catTotals = {};
  data.forEach(e => { catTotals[e.categoria] = (catTotals[e.categoria] || 0) + e.valor; });
  const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('kpi-total').textContent   = formatCurrency(total);
  document.getElementById('kpi-count').textContent   = count;
  document.getElementById('kpi-avg').textContent     = formatCurrency(avg);
  document.getElementById('kpi-top-cat').textContent = topCat ? `${CAT_EMOJIS[topCat[0]]} ${topCat[0]}` : '—';
}

function renderPieChart(data) {
  const catTotals = {};
  data.forEach(e => { catTotals[e.categoria] = (catTotals[e.categoria] || 0) + e.valor; });
  const labels      = Object.keys(catTotals);
  const values      = labels.map(k => catTotals[k]);
  const colors      = labels.map(k => CAT_COLORS[k]?.alpha || 'rgba(150,150,150,0.7)');
  const borderColors = labels.map(k => CAT_COLORS[k]?.bg || '#999');
  if (pieChartInst) pieChartInst.destroy();
  const ctx = document.getElementById('pieChart').getContext('2d');
  pieChartInst = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderColor: borderColors, borderWidth: 2, hoverOffset: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${formatCurrency(ctx.raw)} (${((ctx.raw / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)` },
          backgroundColor: '#1e2130', titleColor: '#F1F5F9', bodyColor: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
        },
      },
    },
  });
  const legendEl = document.getElementById('pie-legend');
  legendEl.innerHTML = labels.map((lbl, i) =>
    `<div class="legend-item"><div class="legend-dot" style="background:${borderColors[i]}"></div><span>${CAT_EMOJIS[lbl] || ''} ${lbl}</span></div>`
  ).join('');
}

function renderBarChart(data) {
  const filterType  = document.getElementById('filter-type').value;
  const filterMonth = parseInt(document.getElementById('filter-month').value);
  const filterYear  = parseInt(document.getElementById('filter-year').value);
  let labels = [], values = [], title = '';
  if (filterType === 'monthly') {
    const days = daysInMonth(filterYear, filterMonth);
    const dayTotals = {};
    for (let d = 1; d <= days; d++) dayTotals[d] = 0;
    data.forEach(e => { const d = parseInt(e.fecha.split('-')[2]); dayTotals[d] = (dayTotals[d] || 0) + e.valor; });
    labels = Object.keys(dayTotals).map(d => `${d}`);
    values = Object.values(dayTotals);
    title  = 'Gastos por Día del Mes';
  } else {
    const monthNames  = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const monthTotals = {};
    monthNames.forEach((m, i) => { monthTotals[i] = 0; });
    data.forEach(e => { const m = parseInt(e.fecha.split('-')[1]) - 1; monthTotals[m] = (monthTotals[m] || 0) + e.valor; });
    labels = monthNames; values = Object.values(monthTotals); title = `Gastos por Mes — ${filterYear}`;
  }
  document.getElementById('bar-chart-title').textContent = title;
  if (barChartInst) barChartInst.destroy();
  const ctx      = document.getElementById('barChart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(108,99,255,0.8)');
  gradient.addColorStop(1, 'rgba(108,99,255,0.1)');
  barChartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Gastos', data: values, backgroundColor: gradient, borderColor: 'rgba(108,99,255,0.9)', borderWidth: 1, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${formatCurrency(ctx.raw)}` },
          backgroundColor: '#1e2130', titleColor: '#F1F5F9', bodyColor: '#94A3B8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
        },
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748B', font: { size: 11 }, autoSkip: false, maxRotation: 0 } },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#64748B', font: { size: 11 }, callback: val => {
            if (val >= 1000000) return `$${(val/1000000).toFixed(1)}M`;
            if (val >= 1000)    return `$${(val/1000).toFixed(0)}K`;
            return `$${val}`;
          }},
        },
      },
    },
  });
}

// ==========================================
// HELPERS
// ==========================================
function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
