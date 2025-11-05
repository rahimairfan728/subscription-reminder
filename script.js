// script.js — final updated version with search functionality

// Helpers
const qs = (sel) => document.querySelector(sel);

// Elements
const form = qs('#customerForm');
const nameInput = qs('#name');
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
  customers.forEach((c, idx) => {
    c.services = Array.isArray(c.services) ? c.services : (c.services ? [c.services] : []);
    const tr = document.createElement('tr');
    const left = daysLeft(c.expiryDate);
    if (left < 0) tr.classList.add('expired');
    else if (left <= 3) tr.classList.add('due-soon');

    const waMessage = `Hi ${c.name}, your ${c.services.join(', ')} subscription(s) will expire on ${c.expiryDate}. Please renew soon.`;
    const waUrl = `https://wa.me/${encodeURIComponent(c.phone)}?text=${encodeURIComponent(waMessage)}`;

    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
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

// Add / Update customer logic
// Add / Update customer logic (fixed: respect manual expiry when editing)
addBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const phone = phoneInput.value.trim();
  const services = Array.from(document.querySelectorAll('input[name="service"]:checked')).map(el => el.value);
  const startDate = startDateInput.value;
  const monthsPaid = parseInt(monthsPaidSelect.value || '1', 10);
  const status = statusSelect.value;

  if (!name) return alert('Please enter name');
  if (!phone) return alert('Please enter phone number');
  if (!startDate) return alert('Please select start date');
  if (services.length === 0) return alert('Please select at least one service');

  // If user typed/selected an expiry in the input, treat it as manual expiry.
  // Trim to avoid whitespace issues.
  const manualExpiry = expiryDateInput.value && expiryDateInput.value.trim() ? expiryDateInput.value.trim() : null;

  // For new customer candidate expiry:
  const expiryForNew = manualExpiry || addMonthsToDate(startDate, monthsPaid);

  // Find by phone (primary key)
  const existingIndex = customers.findIndex(c => c.phone === phone);

  if (existingIndex >= 0) {
    // Update existing record
    const existing = customers[existingIndex];

    // merge services (no duplicates)
    existing.services = Array.from(new Set([...(existing.services || []), ...services]));

    // update name/status
    existing.name = name;
    existing.status = status;

    // EXPIRY update rules when editing:
    // - If user explicitly set a manual expiry (and it's different from stored), accept that value.
    // - Else, extend existing expiry by monthsPaid (base is existing.expiryDate if in future, otherwise startDate).
    if (manualExpiry && manualExpiry !== existing.expiryDate) {
      existing.expiryDate = manualExpiry;
    } else {
      const baseForExtension = (existing.expiryDate && new Date(existing.expiryDate) > new Date())
        ? existing.expiryDate
        : startDate;
      existing.expiryDate = addMonthsToDate(baseForExtension, monthsPaid);
    }

    // Keep the earliest startDate if user provided an earlier one
    if (!existing.startDate || new Date(startDate) < new Date(existing.startDate)) {
      existing.startDate = startDate;
    }

    alert('Customer updated successfully!');
  } else {
    // New customer — check exact duplicate (name+phone) to prevent accidental duplicate
    const duplicate = customers.find(c => c.name === name && c.phone === phone);
    if (duplicate) {
      alert('Customer already exists. Try editing the information.');
      return;
    }

    // Add new customer with expiryForNew (manual if provided, else calculated)
    customers.push({
      name,
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

  // reset form and clear checkboxes + expiry input
  form.reset();
  document.querySelectorAll('input[name="service"]').forEach(cb => (cb.checked = false));
  expiryDateInput.value = '';
});


// Auto-set Due Date = 1 month after joining date
startDateInput.addEventListener('change', () => {
  const startDateValue = startDateInput.value;
  if (!startDateValue) return;
  const nextMonth = addMonthsToDate(startDateValue, 1);
  expiryDateInput.value = nextMonth;
});

// Handle table button clicks
tableBody.addEventListener('click', (e) => {
  const waBtn = e.target.closest('button[data-wa]');
  if (waBtn) {
    const url = waBtn.getAttribute('data-wa');
    window.open(url, '_blank');
    return;
  }

  const editBtn = e.target.closest('button[data-edit]');
  if (editBtn) {
    const idx = parseInt(editBtn.getAttribute('data-edit'), 10);
    if (!Number.isNaN(idx) && customers[idx]) {
      const c = customers[idx];
      nameInput.value = c.name || '';
      phoneInput.value = c.phone || '';
      startDateInput.value = c.startDate || '';
      expiryDateInput.value = c.expiryDate || '';
      statusSelect.value = c.status || 'Unpaid';
      document.querySelectorAll('input[name="service"]').forEach(cb => {
        cb.checked = c.services.includes(cb.value);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    return;
  }

  const delBtn = e.target.closest('button[data-del]');
  if (delBtn) {
    const idx = parseInt(delBtn.getAttribute('data-del'), 10);
    if (!Number.isNaN(idx)) {
      if (confirm('Delete this customer?')) {
        customers.splice(idx, 1);
        save();
        render();
      }
    }
  }
});

// Export JSON
exportBtn.addEventListener('click', () => {
  const data = JSON.stringify(customers, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'customers.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Clear all
clearBtn.addEventListener('click', () => {
  if (confirm('Clear all customers from local storage?')) {
    customers = [];
    save();
    render();
  }
});

// ✅ Search functionality (filter by name)
// ✅ Search functionality (filter by name and service)
document.addEventListener('DOMContentLoaded', () => {
  // Create a small wrapper div
  const filterContainer = document.createElement('div');
  filterContainer.style.display = 'flex';
  filterContainer.style.gap = '10px';
  filterContainer.style.marginBottom = '10px';
  filterContainer.style.alignItems = 'center';

  // Create name search box
  const searchInput = document.createElement('input');
  searchInput.id = 'searchInput';
  searchInput.placeholder = 'Search by customer name...';
  searchInput.style.padding = '8px';
  searchInput.style.flex = '1';
  searchInput.style.maxWidth = '250px';
  searchInput.style.border = '1px solid #ccc';
  searchInput.style.borderRadius = '5px';

  // Create service filter dropdown
  const serviceFilter = document.createElement('select');
  serviceFilter.id = 'serviceFilter';
  serviceFilter.style.padding = '8px';
  serviceFilter.style.border = '1px solid #ccc';
  serviceFilter.style.borderRadius = '5px';
  serviceFilter.style.maxWidth = '180px';
  serviceFilter.innerHTML = `
    <option value="">Filter by service</option>
    <option value="Netflix">Netflix</option>
    <option value="Spotify">Spotify</option>
    <option value="Amazon">Amazon</option>
    <option value="Other">Other</option>
  `;

  // Append both elements into the container
  filterContainer.appendChild(searchInput);
  filterContainer.appendChild(serviceFilter);

  // Insert container right below the "Customer List" heading
  const heading = document.querySelector('h2');
  heading.insertAdjacentElement('afterend', filterContainer);

  // Function to apply filters
  function applyFilters() {
    const nameValue = searchInput.value.toLowerCase();
    const serviceValue = serviceFilter.value;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      const nameCell = row.querySelector('td:first-child');
      const serviceCell = row.querySelector('td:nth-child(2)');
      const nameMatch = nameCell && nameCell.textContent.toLowerCase().includes(nameValue);
      const serviceMatch = !serviceValue || (serviceCell && serviceCell.textContent.includes(serviceValue));
      row.style.display = (nameMatch && serviceMatch) ? '' : 'none';
    });
  }

  // Event listeners
  searchInput.addEventListener('input', applyFilters);
  serviceFilter.addEventListener('change', applyFilters);
});


render();
