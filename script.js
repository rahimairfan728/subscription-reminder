// script.js — updated with Email column + search by email filter

// Helpers
const qs = (sel) => document.querySelector(sel);

// Elements
const form = qs('#customerForm');
const nameInput = qs('#name');
const emailInput = qs('#email');
const phoneInput = qs('#phone');
const monthsPaidSelect = qs('#monthsPaid');
const statusSelect = qs('#status');
const addBtn = qs('#addBtn');
const tableBody = qs('#tableBody');
const exportBtn = qs('#exportBtn');
const clearBtn = qs('#clearBtn');
const startDateInput = qs('#startDate');
const expiryDateInput = qs('#expiryDate');

// Load saved customers
let customers = JSON.parse(localStorage.getItem('customers') || '[]');

// Utility functions
function save() {
  localStorage.setItem('customers', JSON.stringify(customers));
}

function isoDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

function addMonthsToDate(dateStr, months) {
  const d = new Date(dateStr);
  const day = d.getDate();
  d.setMonth(d.getMonth() + parseInt(months));
  if (d.getDate() !== day) d.setDate(0);
  return isoDate(d);
}

function daysLeft(expiryDateStr) {
  const today = new Date();
  const expiry = new Date(expiryDateStr + 'T00:00:00');
  const diff = expiry - today;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function escapeHtml(text) {
  if (!text && text !== 0) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Render table
function render() {
  tableBody.innerHTML = '';

  if (customers.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.textContent = 'No customers found';
    td.style.textAlign = 'center';
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  customers.forEach((c, idx) => {
    c.services = Array.isArray(c.services)
      ? c.services
      : c.services
      ? [c.services]
      : [];

    const tr = document.createElement('tr');
    const left = daysLeft(c.expiryDate);
    if (left < 0) tr.classList.add('expired');
    else if (left <= 3) tr.classList.add('due-soon');

    const waMessage = `Hi ${c.name}, your ${c.services.join(
      ', '
    )} subscription(s) will expire on ${c.expiryDate}. Please renew soon.`;
    const waUrl = `https://wa.me/${encodeURIComponent(
      c.phone
    )}?text=${encodeURIComponent(waMessage)}`;

    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>${escapeHtml(c.email || '')}</td>
      <td>${escapeHtml(c.services.join(', '))}</td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.startDate)}</td>
      <td>${escapeHtml(c.expiryDate)}</td>
      <td>${left >= 0 ? left : 'Expired'}</td>
      <td>${escapeHtml(c.status || '')}</td>
      <td>
        <button class="action-btn" data-wa="${waUrl}" title="Send WhatsApp">WA</button>
        <button class="small-btn" data-edit="${idx}" title="Edit">Edit</button>
        <button class="small-btn" data-del="${idx}" title="Delete">Delete</button>
      </td>
    `;
    tableBody.appendChild(tr);
  });
}

// Add / Update customer
addBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const services = Array.from(
    document.querySelectorAll('input[name="service"]:checked')
  ).map((el) => el.value);
  const startDate = startDateInput.value;
  const monthsPaid = parseInt(monthsPaidSelect.value || '1', 10);
  const status = statusSelect.value;
  const manualExpiry =
    expiryDateInput.value && expiryDateInput.value.trim()
      ? expiryDateInput.value.trim()
      : null;
  const expiryForNew = manualExpiry || addMonthsToDate(startDate, monthsPaid);

  if (!name) return alert('Please enter name');
  if (!email) return alert('Please enter email');
  if (!phone) return alert('Please enter phone number');
  if (!startDate) return alert('Please select start date');
  if (services.length === 0) return alert('Please select at least one service');

  const existingIndex = customers.findIndex((c) => c.phone === phone);

  if (existingIndex >= 0) {
    const existing = customers[existingIndex];
    existing.name = name;
    existing.email = email;
    existing.status = status;
    existing.services = Array.from(
      new Set([...(existing.services || []), ...services])
    );

    if (manualExpiry && manualExpiry !== existing.expiryDate) {
      existing.expiryDate = manualExpiry;
    } else {
      const baseForExtension =
        existing.expiryDate && new Date(existing.expiryDate) > new Date()
          ? existing.expiryDate
          : startDate;
      existing.expiryDate = addMonthsToDate(baseForExtension, monthsPaid);
    }

    if (!existing.startDate || new Date(startDate) < new Date(existing.startDate))
      existing.startDate = startDate;

    alert('Customer updated successfully!');
  } else {
    const duplicate = customers.find(
      (c) => c.name === name && c.phone === phone
    );
    if (duplicate) return alert('Customer already exists.');

    customers.push({
      name,
      email,
      phone,
      services,
      startDate,
      expiryDate: expiryForNew,
      status,
    });

    alert('Customer added successfully!');
  }

  save();
  render();
  form.reset();
  document
    .querySelectorAll('input[name="service"]')
    .forEach((cb) => (cb.checked = false));
  expiryDateInput.value = '';
});

// Auto-set due date = 1 month after start date
startDateInput.addEventListener('change', () => {
  if (!startDateInput.value) return;
  expiryDateInput.value = addMonthsToDate(startDateInput.value, 1);
});

// Table button actions
tableBody.addEventListener('click', (e) => {
  const waBtn = e.target.closest('button[data-wa]');
  if (waBtn) {
    window.open(waBtn.getAttribute('data-wa'), '_blank');
    return;
  }

  const editBtn = e.target.closest('button[data-edit]');
  if (editBtn) {
    const idx = parseInt(editBtn.dataset.edit);
    const c = customers[idx];
    nameInput.value = c.name;
    emailInput.value = c.email || '';
    phoneInput.value = c.phone;
    startDateInput.value = c.startDate;
    expiryDateInput.value = c.expiryDate;
    statusSelect.value = c.status || 'Unpaid';
    document
      .querySelectorAll('input[name="service"]')
      .forEach((cb) => (cb.checked = c.services.includes(cb.value)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const delBtn = e.target.closest('button[data-del]');
  if (delBtn && confirm('Delete this customer?')) {
    customers.splice(parseInt(delBtn.dataset.del), 1);
    save();
    render();
  }
});

// Export JSON
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(customers, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'customers.json';
  a.click();
});

// Clear all
clearBtn.addEventListener('click', () => {
  if (confirm('Clear all customers?')) {
    customers = [];
    save();
    render();
  }
});

// ✅ Filters: by name, email, service, month
document.addEventListener('DOMContentLoaded', () => {
  const filterContainer = document.createElement('div');
  filterContainer.style.display = 'flex';
  filterContainer.style.gap = '10px';
  filterContainer.style.flexWrap = 'wrap';
  filterContainer.style.marginBottom = '10px';

  const searchInput = document.createElement('input');
  searchInput.placeholder = 'Search by name...';

  const emailSearch = document.createElement('input');
  emailSearch.placeholder = 'Search by email...';

  const serviceFilter = document.createElement('select');
  ['All Services', 'Netflix', 'Spotify', 'Amazon', 'Other'].forEach((s) => {
    const o = document.createElement('option');
    o.value = s === 'All Services' ? '' : s;
    o.textContent = s;
    serviceFilter.appendChild(o);
  });

  const monthFilter = document.createElement('select');
  const monthNames = [
    'All Months', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  monthNames.forEach((m, i) => {
    const o = document.createElement('option');
    o.value = i === 0 ? '' : i;
    o.textContent = m;
    monthFilter.appendChild(o);
  });

  filterContainer.append(searchInput, emailSearch, serviceFilter, monthFilter);
  document.querySelector('h2').insertAdjacentElement('afterend', filterContainer);

  function applyFilters() {
    const nameVal = searchInput.value.toLowerCase();
    const emailVal = emailSearch.value.toLowerCase();
    const serviceVal = serviceFilter.value;
    const monthVal = monthFilter.value ? parseInt(monthFilter.value, 10) : null;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row) => {
      const nameCell = row.querySelector('td:nth-child(1)');
      const emailCell = row.querySelector('td:nth-child(2)');
      const servicesCell = row.querySelector('td:nth-child(3)');
      const dueDateCell = row.querySelector('td:nth-child(6)');
      if (!nameCell || !emailCell || !servicesCell || !dueDateCell) return;

      const nameTxt = nameCell.textContent.toLowerCase();
      const emailTxt = emailCell.textContent.toLowerCase();
      const serviceTxt = servicesCell.textContent;
      const dueDate = new Date(dueDateCell.textContent);

      const matchName = nameTxt.includes(nameVal);
      const matchEmail = emailTxt.includes(emailVal);
      const matchService = !serviceVal || serviceTxt.includes(serviceVal);
      const matchMonth = !monthVal || dueDate.getMonth() + 1 === monthVal;

      row.style.display = (matchName && matchEmail && matchService && matchMonth) ? '' : 'none';
    });
  }

  [searchInput, emailSearch, serviceFilter, monthFilter].forEach(el =>
    el.addEventListener('input', applyFilters)
  );
});

render();
