// =============================================
// FILE: js/auth.js
// Handles login, logout, and token management.
// Used by all protected pages.
// =============================================

// The base URL of the backend API
// API URL — uses the same server that serves the frontend
const API_URL = `${window.location.protocol}//${window.location.hostname}:3000/api`;

// ── Save the token after login ──
// Stores the token in localStorage so it persists
// even if the user refreshes the page
const saveToken = (token) => {
  localStorage.setItem('admin_token', token);
};

// ── Get the stored token ──
// Returns the token or null if not logged in
const getToken = () => {
  return localStorage.getItem('admin_token');
};

// ── Remove the token on logout ──
const removeToken = () => {
  localStorage.removeItem('admin_token');
};

// ── Check if admin is logged in ──
// If not logged in, redirect to login page
const requireAuth = () => {
  const token = getToken();
  if (!token) {
    window.location.href = './index.html';
  }
  return token;
};

// ── Build the Authorization header ──
// Used in every protected API request
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getToken()}`,
});

// ── Logout function ──
const logout = () => {
  removeToken();
  window.location.href = './index.html';
};

// ── Show toast notification ──
const showToast = (message, type = 'info') => {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Remove the toast after 3 seconds
  setTimeout(() => toast.remove(), 3000);
};

// ── Format currency to BRL ──
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// ── Format date to Brazilian format ──
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};