// ---------- API + Auth helpers, shared by every page ----------

const API_BASE = '/api';

function getToken() { return localStorage.getItem('zf_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('zf_user')); } catch (e) { return null; }
}
function setAuth(token, user) {
  localStorage.setItem('zf_token', token);
  localStorage.setItem('zf_user', JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem('zf_token');
  localStorage.removeItem('zf_user');
}
function isLoggedIn() { return !!getToken(); }

async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }

  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong. Please try again.');
    error.status = res.status;
    throw error;
  }
  return data;
}

function money(amount) {
  return 'ZMW ' + Number(amount || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function moneyK(amount) {
  const n = Number(amount || 0);
  if (n >= 1000000) return 'K' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return 'K' + (n / 1000).toFixed(1) + 'k';
  return 'K' + n.toLocaleString();
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
function pct(raised, goal) {
  return Math.min(Math.round((raised / goal) * 100), 100);
}
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
