// // script.js - updated: clear add/update/duplicate behavior + checkboxes + editable expiry

// // small helpers
// const qs = (s) => document.querySelector(s);
// const qsa = (s) => Array.from(document.querySelectorAll(s));

// // Elements
// const form = qs('#customerForm');
// const nameInput = qs('#name');
// const phoneInput = qs('#phone');
// // serviceSelect removed (we use checkboxes)
// const startDateInput = qs('#startDate');
// const expiryDateInput = qs('#expiryDate');
// const monthsPaidSelect = qs('#monthsPaid');
// const statusSelect = qs('#status');
// const addBtn = qs('#addBtn');
// const tableBody = qs('#tableBody');
// const exportBtn = qs('#exportBtn');
// const clearBtn = qs('#clearBtn');

// // load saved customers
// let customers = JSON.parse(localStorage.getItem('customers') || '[]');

// // utilities
// function formatDate(d) {
//   const dt = new Date(d);
//   const y = dt.getFullYear();
//   const m = String(dt.getMonth() + 1).padStart(2, '0');
//   const dd = String(dt.getDate()).padStart(2, '0');
//   return `${y}-${m}-${dd}`;
// }

// // add months to date string (yyyy-mm-dd). Handles month overflow (Jan 31 +1 => Feb 28/29)
// function addMonthsToDate(dateStr, months) {
//   const src = new Date(dateStr);
//   const day = src.getDate();
//   const temp = new Date(src.getFullYear(), src.getMonth(), 1);
//   temp.setMonth(temp.getMonth() + Number(months));
//   const lastDay = new Date(temp.getFullYear(), temp.getMonth() + 1, 0).getDate();
//   temp.setDate(Math.min(day, lastDay));
//   return formatDate(temp);
// }

// function daysLeft(expiryStr) {
//   if (!expiryStr) return null;
//   const today = new Date();
//   const expiry = new Date(expiryStr + 'T00:00:00');
//   const diff = expiry - today;
//   return Math.ceil(diff / (1000 * 60 * 60 * 24));
// }

// function save() {
//   localStorage.setItem('customers', JSON.stringify(customers));
// }

// function escapeHtml(t) {
//   if (t === null || t === undefined) return '';
//   return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
//     .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
// }

// // render table
// function render() {
//   tableBody.innerHTML = '';
//   customers.forEach((c, idx) => {
//     c.services = Array.isArray(c.services) ? c.services : (c.services ? [c.services] : []);

//     const left = daysLeft(c.expiryDate);
//     const tr = document.createElement('tr');
//     if (left !== null) {
//       if (left < 0) tr.classList.add('expired');
//       else if (left <= 3) tr.classList.add('due-soon');
//     }

//     const waMsg = `Hi ${c.name}, your ${c.services.join(', ')} subscription(s) will expire on ${c.expiryDate}. Please renew soon.`;
//     const waUrl = `https://wa.me/${encodeURIComponent(c.phone)}?text=${encodeURIComponent(waMsg)}`;

//     tr.innerHTML = `
//       <td>${escapeHtml(c.name)}</td>
//       <td>${escapeHtml(c.services.join(', '))}</td>
//       <td>${escapeHtml(c.phone)}</td>
//       <td>${escapeHtml(c.startDate)}</td>
//       <td>${escapeHtml(c.expiryDate)}</td>
//       <td>${left === null ? '' : (left >= 0 ? left : 'Expired')}</td>
//       <td>${escapeHtml(c.status || '')}</td>
//       <td>
//         <button class="action-btn" data-wa="${waUrl}" title="Send WhatsApp">WA</button>
//         <button class="small-btn" data-edit="${idx}" title="Edit">Edit</button>
//         <button class="small-btn" data-del="${idx}" title="Delete">Delete</button>
//       </td>
//     `;
//     tableBody.appendChild(tr);
//   });
// }

// // auto-fill expiry as 1 month after start date (user can edit)
// startDateInput.addEventListener('change', () => {
//   const sd = startDateInput.value;
//   if (!sd) { expiryDateInput.value = ''; return; }
//   expiryDateInput.value = addMonthsToDate(sd, 1);
// });

// // helper: get selected services as array
// function getSelectedServices() {
//   return Array.from(document.querySelectorAll('input[name="service"]:checked')).map(cb => cb.value);
// }

// // Add / Update button logic with clear feedback
// addBtn.addEventListener('click', () => {
//   const name = nameInput.value.trim();
//   const phone = phoneInput.value.trim();
//   const services = getSelectedServices();
//   const startDate = startDateInput.value;
//   const monthsPaid = parseInt(monthsPaidSelect.value || '1', 10);
//   const status = statusSelect.value;

//   // validation
//   if (!name) { alert('Please enter name'); return; }
//   if (!phone) { alert('Please enter phone'); return; }
//   if (!startDate) { alert('Please select joining/start date'); return; }
//   if (!services || services.length === 0) { alert('Please select at least one service'); return; }

//   // expiry candidate: use manual expiry if set, otherwise calculate from startDate + monthsPaid
//   const manualExpiry = expiryDateInput.value && expiryDateInput.value.trim() ? expiryDateInput.value.trim() : null;
//   const expiryFromStart = addMonthsToDate(startDate, monthsPaid);
//   const expiryToUse = manualExpiry || expiryFromStart;

//   // find existing by phone
//   const existingIndex = customers.findIndex(c => c.phone === phone);

//   if (existingIndex >= 0) {
//     // existing customer -> decide if update is needed
//     const existing = customers[existingIndex];
//     existing.services = Array.isArray(existing.services) ? existing.services : (existing.services ? [existing.services] : []);

//     // determine new services to add
//     const newServices = services.filter(s => !existing.services.includes(s));

//     // determine name/status change
//     const nameChanged = existing.name !== name;
//     const statusChanged = (existing.status || '') !== (status || '');

//     // determine expiry change:
//     let expiryChanged = false;
//     if (manualExpiry) {
//       expiryChanged = existing.expiryDate !== manualExpiry;
//     } else {
//       // if monthsPaid > 0, we'll compute extension base:
//       const baseForExtension = new Date(existing.expiryDate) > new Date() ? existing.expiryDate : startDate;
//       const extended = addMonthsToDate(baseForExtension, monthsPaid);
//       expiryChanged = existing.expiryDate !== extended;
//     }

//     // if nothing changes -> tell user duplicate
//     if (newServices.length === 0 && !nameChanged && !statusChanged && !expiryChanged) {
//       alert('Customer already created (no changes detected).');
//       return;
//     }

//     // apply updates
//     if (newServices.length) {
//       existing.services = Array.from(new Set([...existing.services, ...newServices]));
//     }
//     if (nameChanged) existing.name = name;
//     if (statusChanged) existing.status = status;

//     if (manualExpiry) {
//       existing.expiryDate = manualExpiry;
//     } else {
//       const baseForExtension = new Date(existing.expiryDate) > new Date() ? existing.expiryDate : startDate;
//       existing.expiryDate = addMonthsToDate(baseForExtension, monthsPaid);
//     }

//     if (!existing.startDate || new Date(startDate) < new Date(existing.startDate)) {
//       existing.startDate = startDate;
//     }

//     customers[existingIndex] = existing;
//     save();
//     render();
//     form.reset();
//     document.querySelectorAll('input[name="service"]').forEach(cb => cb.checked = false);
//     expiryDateInput.value = '';
//     alert('Customer updated.');
//     return;
//   }

//   // new customer path
//   const newCustomer = {
//     name,
//     phone,
//     services,
//     startDate,
//     expiryDate: expiryToUse,
//     status
//   };
//   customers.push(newCustomer);
//   save();
//   render();
//   form.reset();
//   document.querySelectorAll('input[name="service"]').forEach(cb => cb.checked = false);
//   expiryDateInput.value = '';
//   alert('Customer added.');
// });

// // table actions (delegated)
// tableBody.addEventListener('click', (e) => {
//   const waBtn = e.target.closest('button[data-wa]');
//   if (waBtn) {
//     window.open(waBtn.getAttribute('data-wa'), '_blank');
//     return;
//   }

//   const editBtn = e.target.closest('button[data-edit]');
//   if (editBtn) {
//     const idx = parseInt(editBtn.getAttribute('data-edit'), 10);
//     if (!Number.isNaN(idx) && customers[idx]) {
//       const c = customers[idx];
//       // populate form including checkboxes for services
//       nameInput.value = c.name || '';
//       phoneInput.value = c.phone || '';
//       startDateInput.value = c.startDate || '';
//       expiryDateInput.value = c.expiryDate || '';
//       statusSelect.value = c.status || 'Unpaid';

//       // clear all checkboxes then check those in c.services
//       document.querySelectorAll('input[name="service"]').forEach(cb => cb.checked = false);
//       (c.services || []).forEach(s => {
//         const cb = document.querySelector(`input[name="service"][value="${CSS.escape(s)}"]`);
//         if (cb) cb.checked = true;
//       });

//       // scroll to top for convenience
//       window.scrollTo({ top: 0, behavior: 'smooth' });
//     }
//     return;
//   }

//   const delBtn = e.target.closest('button[data-del]');
//   if (delBtn) {
//     const idx = parseInt(delBtn.getAttribute('data-del'), 10);
//     if (!Number.isNaN(idx)) {
//       if (confirm('Delete this customer?')) {
//         customers.splice(idx, 1);
//         save();
//         render();
//       }
//     }
//     return;
//   }
// });

// // export
// exportBtn.addEventListener('click', () => {
//   const data = JSON.stringify(customers, null, 2);
//   const blob = new Blob([data], { type: 'application/json' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = 'customers.json';
//   a.click();
//   URL.revokeObjectURL(url);
// });

// // clear all
// clearBtn.addEventListener('click', () => {
//   if (confirm('Clear all customers from local storage?')) {
//     customers = [];
//     save();
//     render();
//   }
// });

// // initial render
// render();


// script.js - with duplicate check, update messages, and due-date auto logic

// Utilities
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
const startDateInput = document.getElementById('startDate');
const expiryDateInput = document.getElementById('expiryDate');

// Load stored customers
let customers = JSON.parse(localStorage.getItem('customers') || '[]');

// Helpers
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

// Add or update customer
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

  const expiryDate = expiryDateInput.value ? expiryDateInput.value : addMonthsToDate(startDate, monthsPaid);

  // Duplicate check by name + phone
  const duplicate = customers.find(c => c.name === name && c.phone === phone);
  if (duplicate) {
    alert('Customer already exists. Try editing the information.');
    return;
  }

  const existingIndex = customers.findIndex(c => c.phone === phone);
  if (existingIndex >= 0) {
    const existing = customers[existingIndex];
    existing.services = [...new Set([...existing.services, ...services])];
    existing.name = name;
    existing.status = status;
    const baseForExtension =
      new Date(existing.expiryDate) > new Date() ? existing.expiryDate : startDate;
    existing.expiryDate = addMonthsToDate(baseForExtension, monthsPaid);
    if (new Date(startDate) < new Date(existing.startDate)) {
      existing.startDate = startDate;
    }
    alert('Customer updated successfully!');
  } else {
    customers.push({
      name,
      phone,
      services,
      startDate,
      expiryDate,
      status,
    });
    alert('Customer added successfully!');
  }

  save();
  render();
  form.reset();
  document.querySelectorAll('input[name="service"]').forEach(cb => (cb.checked = false));
  expiryDateInput.value = '';
});

// Automatically set Due Date to 1 month after Joining Date
startDateInput.addEventListener('change', () => {
  const startDateValue = startDateInput.value;
  if (!startDateValue) return;
  const nextMonth = addMonthsToDate(startDateValue, 1);
  expiryDateInput.value = nextMonth;
});

// handle table button clicks
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

render();
