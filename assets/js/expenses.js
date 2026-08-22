/* expenses.js */
let allExpenses = [], editingExpenseId = null, expChart = null;

function updatePageDebug(text, color) {
  const el = document.getElementById('debug-page-status');
  if (el) {
    el.textContent = 'Page: ' + text;
    if (color) el.style.color = color;
  }
}

async function loadExpenses() {
  console.log('Loading expenses...');
  updatePageDebug('Loading Expenses...', '#10B981');
  
  try {
    UTILS.renderTableSkeleton('expenses-table');
    UTILS.setSkeletonText('total-amount', 'w-40', true);
    
    // DB init removed for Supabase
    
    // Fetch master options for expense categories
    try {
      const optRes = await fetch('/api/master-options');
      if (optRes.ok) {
        const opts = await optRes.ok ? await optRes.json() : [];
        const expenseCategories = opts.filter(o => o.category === 'expense_category').map(o => o.value);
        
        // If we found any custom expense categories in database, use them
        const finalCategories = expenseCategories.length > 0 ? expenseCategories : ['Insecticides', 'Fungicides', 'Herbicides', 'PGR'];
        
        const catFilter = document.getElementById('cat-filter');
        if (catFilter) {
          catFilter.innerHTML = '<option value="">All Categories</option>' + finalCategories.map(c => `<option value="${c}">${c}</option>`).join('');
        }
        
        const catFormSelect = document.querySelector('#expense-form select[name="category"]');
        if (catFormSelect) {
          catFormSelect.innerHTML = finalCategories.map(c => `<option value="${c}">${c}</option>`).join('');
        }
      }
    } catch (e) {
      console.warn('Failed to load expense categories from master options:', e);
    }
    
    const allExpenses = await window.apiService.expenses.getAll();
    
    renderTable(allExpenses);
    renderChart(allExpenses);
    
    updatePageDebug('Ready (' + allExpenses.length + ')', '#10B981');
    setTimeout(() => UTILS.initAllAutocompleteSelects(), 50);
    console.log('Expenses: All data loaded successfully');
  } catch (err) {
    console.error('Expenses loadExpenses failed:', err);
    updatePageDebug('FAILED', '#EF4444');
    APP.showToast('Failed to load expenses: ' + err.message, 'error');
    renderTable([]);
  }
}

function updateKPIStats(data) {
  const total = data.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalEl = document.getElementById('kpi-total-expenses');
  if (totalEl) totalEl.textContent = UTILS.fmtCurrency(total);
  
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const thisMonthStr = `${year}-${month}`;
  const thisMonthExpenses = data
    .filter(e => e.date && e.date.substring(0, 7) === thisMonthStr)
    .reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const monthEl = document.getElementById('kpi-month-expenses');
  if (monthEl) monthEl.textContent = UTILS.fmtCurrency(thisMonthExpenses);

  const cats = {};
  data.forEach(e => { cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount || 0); });
  let largestCatName = '—';
  let largestCatVal = 0;
  for (const [catName, catVal] of Object.entries(cats)) {
    if (catVal > largestCatVal) {
      largestCatVal = catVal;
      largestCatName = catName;
    }
  }
  const largestEl = document.getElementById('kpi-largest-category');
  if (largestEl) largestEl.textContent = largestCatName;
}

function renderTable(data) {
  updateKPIStats(data);
  const tbody = document.querySelector('#expenses-table tbody');
  if (!tbody) return;
  document.getElementById('total-info').textContent = `${data.length} expense${data.length !== 1 ? 's' : ''}`;
  const totalAmt = data.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const totalEl = document.getElementById('total-amount');
  if (totalEl) totalEl.textContent = UTILS.fmtCurrency(totalAmt);
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><h3>No expenses recorded</h3></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(e => {
    const refNo = 'EXP-' + String(e.id).padStart(3, '0');
    return `<tr>
    <td><input type="checkbox" class="row-check" value="${e.id}"></td>
    <td class="cell-bold" style="font-size:12px; color:var(--primary); font-family:monospace;">${refNo}</td>
    <td>${UTILS.fmtDate(e.date)}</td>
    <td><span class="badge badge-purple">${e.category}</span></td>
    <td>${e.description || '—'}</td>
    <td><span class="badge badge-gray">${e.payment_mode}</span></td>
    <td class="cell-amount">${UTILS.fmtCurrency(e.amount)}</td>
    <td><div class="row-actions">
      <button class="action-btn edit" onclick="openEdit(${e.id})" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="action-btn delete" onclick="deleteExpense(${e.id})" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
    </div></td>
  </tr>`;
  }).join('');
  UTILS.applyMobileTableLabels('expenses-table');
}

function renderChart(data) {
  const ctx = document.getElementById('expense-chart');
  if (!ctx) return;
  UTILS.destroyChart(expChart);
  const cats = {};
  data.forEach(e => { cats[e.category] = (cats[e.category] || 0) + parseFloat(e.amount || 0); });
  const labels = Object.keys(cats);
  const values = Object.values(cats);
  const colors = ['#7C3AED','#10B981','#10B981','#EF4444','#3B82F6','#EC4899','#8B5CF6'];
  expChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, labels.length), borderWidth: 3, borderColor: '#fff', hoverOffset: 6 }] },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Space Grotesk', size: 11 }, padding: 10, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => ` ${UTILS.fmtCurrency(ctx.parsed)}` } }
      }
    }
  });
}

function openAdd() {
  editingExpenseId = null;
  document.getElementById('modal-title').textContent = 'Add Expense';
  const expenseForm = document.getElementById('expense-form');
  expenseForm.reset();
  UTILS.applyDefaultDateInputs(expenseForm, { skipFieldNames: ['due_date'] });
  APP.openModal('expense-modal');
}

function openEdit(id) {
  editingExpenseId = id;
  const e = allExpenses.find(x => x.id === id);
  if (!e) return;
  document.getElementById('modal-title').textContent = 'Edit Expense';
  UTILS.populateForm('expense-form', e);
  UTILS.applyDefaultDateInputs(document.getElementById('expense-form'), { skipFieldNames: ['due_date'] });
  APP.openModal('expense-modal');
}

async function saveExpense() {
  const d = UTILS.getFormData('expense-form');
  if (!d.category || !d.amount || !d.date) { APP.showToast('Category, amount and date required', 'error'); return; }
  
  try {
    const payload = {
      category: d.category,
      amount: parseFloat(d.amount),
      date: d.date,
      description: d.description || '',
      payment_mode: d.payment_mode || 'Cash'
    };

    const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
    const method = editingExpenseId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || 'Failed to save expense');

    APP.showToast(editingExpenseId ? 'Expense updated!' : 'Expense added!', 'success');
    APP.closeModal('expense-modal');
    setTimeout(() => loadExpenses(), 100);
  } catch (err) {
    console.error('saveExpense failed:', err);
    APP.showToast('Error saving expense: ' + err.message, 'error');
  }
}

async function deleteExpense(id) {
  APP.showConfirm('Delete this expense?', async () => {
    try {
      await window.apiService.expenses.delete(id);

      APP.showToast('Expense deleted.', 'warning');
      setTimeout(() => loadExpenses(), 100);
    } catch (err) {
      console.error(err);
      APP.showToast('Failed to delete expense: ' + err.message, 'error');
    }
  });
}

document.getElementById('search-input')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  renderTable(q ? allExpenses.filter(x => {
    const refNo = 'exp-' + String(x.id).padStart(3, '0');
    return `${refNo} ${x.category} ${x.description} ${x.payment_mode}`.toLowerCase().includes(q);
  }) : allExpenses);
});

document.getElementById('cat-filter')?.addEventListener('change', e => {
  const t = e.target.value;
  renderTable(t ? allExpenses.filter(x => x.category === t) : allExpenses);
});

loadExpenses();



