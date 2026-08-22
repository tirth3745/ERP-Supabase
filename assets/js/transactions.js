/* transactions.js */
let allTransactions = [], editingTxnId = null;

function updatePageDebug(text, color) {
  const el = document.getElementById('debug-page-status');
  if (el) {
    el.textContent = 'Page: ' + text;
    if (color) el.style.color = color;
  }
}

async function loadTransactions() {
  console.log('Loading transactions...');
  updatePageDebug('Loading Transactions...', '#10B981');
  
  try {
    UTILS.renderTableSkeleton('txn-table');
    UTILS.setSkeletonText('total-receipts', 'w-50', true);
    UTILS.setSkeletonText('total-payments', 'w-50', true);
    UTILS.setSkeletonText('net-balance', 'w-50', true);
    
    // DB init removed for Supabase
    await loadAccounts();
    
    const allTransactions = await window.apiService.transactions.getAll();
    
    applyFilters();
    
    updatePageDebug('Ready (' + allTransactions.length + ')', '#10B981');
    console.log('Transactions: All data loaded successfully');
  } catch (err) {
    console.error('Transactions loadTransactions failed:', err);
    updatePageDebug('FAILED', '#EF4444');
    APP.showToast('Failed to load transactions: ' + err.message, 'error');
    renderTable([]);
  }
}

function renderTable(data) {
  const tbody = document.querySelector('#txn-table tbody');
  if (!tbody) return;
  document.getElementById('total-info').textContent = `${data.length} transaction${data.length !== 1 ? 's' : ''}`;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span aria-hidden="true" style="font-size:28px;font-weight:800;line-height:1;color:var(--accent)">₹</span><h3>No transactions</h3><p>Record your first payment.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(t => `<tr>
    <td><input type="checkbox" class="row-check" value="${t.id}"></td>
    <td>${UTILS.fmtDate(t.date)}</td>
    <td><span class="badge ${t.type === 'Receipt' ? 'badge-success' : 'badge-danger'}">${t.type}</span></td>
    <td><span style="font-weight: 500; color: var(--text-primary);">${t.account_name || '—'}</span></td>
    <td>${t.ref_no || '—'}</td>
    <td class="cell-bold">${t.party_name || '—'}</td>
    <td><span class="badge badge-gray">${t.mode}</span></td>
    <td class="cell-amount ${t.type === 'Receipt' ? 'positive' : 'negative'}">${UTILS.fmtCurrency(t.amount)}</td>
    <td><div class="row-actions">
      <button class="action-btn edit" onclick="openEdit(${t.id})" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
      <button class="action-btn delete" onclick="deleteTxn(${t.id})" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
    </div></td>
  </tr>`).join('');
  UTILS.applyMobileTableLabels('txn-table');
}

function renderSummary(data) {
  const receipts = data.filter(t => t.type === 'Receipt').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const payments = data.filter(t => t.type === 'Payment').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const receiptCount = data.filter(t => t.type === 'Receipt').length;
  const paymentCount = data.filter(t => t.type === 'Payment').length;
  const net = receipts - payments;
  document.getElementById('total-receipts').textContent = UTILS.fmtCurrency(receipts);
  document.getElementById('total-payments').textContent = UTILS.fmtCurrency(payments);
  document.getElementById('net-balance').textContent = UTILS.fmtCurrency(net);
  const netEl = document.getElementById('net-balance');
  if (netEl) netEl.style.color = net >= 0 ? 'var(--success)' : 'var(--danger)';

  const receiptMetaEl = document.getElementById('receipt-meta');
  if (receiptMetaEl) receiptMetaEl.textContent = receiptCount ? `${receiptCount} receipt${receiptCount === 1 ? '' : 's'} recorded` : 'Incoming cash collected';

  const paymentMetaEl = document.getElementById('payment-meta');
  if (paymentMetaEl) paymentMetaEl.textContent = paymentCount ? `${paymentCount} payment${paymentCount === 1 ? '' : 's'} recorded` : 'Payments Made';

  const netMetaEl = document.getElementById('net-balance-meta');
  if (netMetaEl) {
    netMetaEl.textContent = net > 0
      ? 'Receipts are ahead of payments'
      : net < 0
        ? 'Payments are ahead of receipts'
        : 'Receipts and payments are even';
    netMetaEl.style.color = net > 0 ? 'var(--success)' : net < 0 ? 'var(--danger)' : 'var(--text-secondary)';
  }
}

function openAdd() {
  editingTxnId = null;
  document.getElementById('modal-title').textContent = 'Record Transaction';
  const txnForm = document.getElementById('txn-form');
  txnForm.reset();
  const accountSelect = document.getElementById('txn-account-select');
  if (accountSelect) accountSelect.value = '';
  UTILS.applyDefaultDateInputs(txnForm, { skipFieldNames: ['due_date'] });
  APP.openModal('txn-modal');
}

function openEdit(id) {
  editingTxnId = id;
  const t = allTransactions.find(x => x.id === id);
  if (!t) return;
  document.getElementById('modal-title').textContent = 'Edit Transaction';
  UTILS.populateForm('txn-form', t);
  const accountSelect = document.getElementById('txn-account-select');
  if (accountSelect) accountSelect.value = t.account_id || '';
  UTILS.applyDefaultDateInputs(document.getElementById('txn-form'), { skipFieldNames: ['due_date'] });
  APP.openModal('txn-modal');
}

async function saveTxn() {
  const d = UTILS.getFormData('txn-form');
  if (!d.type || !d.amount || !d.date) { APP.showToast('Type, amount and date are required', 'error'); return; }
  
  try {
    const payload = {
      type: d.type,
      ref_no: d.ref_no || '',
      ref_type: 'Manual',
      party_name: d.party_name || '',
      amount: parseFloat(d.amount),
      mode: d.mode || 'Cash',
      date: d.date,
      notes: d.notes || '',
      account_id: d.account_id ? parseInt(d.account_id) : null
    };

    const url = editingTxnId ? `/api/transactions/${editingTxnId}` : '/api/transactions';
    const method = editingTxnId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || 'Failed to save transaction');

    APP.showToast(editingTxnId ? 'Transaction updated!' : 'Transaction recorded!', 'success');
    APP.closeModal('txn-modal');
    setTimeout(() => loadTransactions(), 100);
  } catch (err) {
    console.error('saveTxn failed:', err);
    APP.showToast('Error saving transaction: ' + err.message, 'error');
  }
}

async function deleteTxn(id) {
  APP.showConfirm('Delete this transaction?', async () => {
    try {
      await window.apiService.transactions.delete(id);
      
      APP.showToast('Transaction deleted.', 'warning');
      setTimeout(() => loadTransactions(), 100);
    } catch (err) {
      console.error(err);
      APP.showToast('Failed to delete transaction: ' + err.message, 'error');
    }
  });
}

function applyFilters() {
  const q = document.getElementById('search-input')?.value.toLowerCase() || '';
  const type = document.getElementById('type-filter')?.value || '';
  const account = document.getElementById('account-filter')?.value || '';

  let filtered = allTransactions;

  if (type) {
    filtered = filtered.filter(x => x.type === type);
  }
  if (account) {
    filtered = filtered.filter(x => x.account_id == account);
  }
  if (q) {
    filtered = filtered.filter(t => 
      `${t.type} ${t.ref_no || ''} ${t.party_name || ''} ${t.mode || ''} ${t.account_name || ''}`
        .toLowerCase()
        .includes(q)
    );
  }

  renderTable(filtered);
  renderSummary(filtered);
}

// --- ACCOUNTS MANAGEMENT ---
let allAccounts = [];

async function loadAccounts() {
  try {
    const allAccounts = await window.apiService.accounts.getAll();

    // Populate filters and dropdowns
    const filterSelect = document.getElementById('account-filter');
    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = '<option value="">All Accounts</option>' + 
        allAccounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      filterSelect.value = currentVal;
    }

    const formSelect = document.getElementById('txn-account-select');
    if (formSelect) {
      const currentVal = formSelect.value;
      formSelect.innerHTML = '<option value="">Select Account...</option>' + 
        allAccounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
      formSelect.value = currentVal;
    }

    // Re-initialize searchable select elements to pick up the updated options
    setTimeout(() => UTILS.initAllAutocompleteSelects(), 50);

    renderAccountsTable();
  } catch (err) {
    console.error('loadAccounts failed:', err);
  }
}

function renderAccountsTable() {
  const tbody = document.querySelector('#accounts-table tbody');
  if (!tbody) return;

  if (allAccounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No accounts found. Add your first account.</div></td></tr>';
    return;
  }

  tbody.innerHTML = allAccounts.map(a => `
    <tr>
      <td class="cell-bold"><span class="account-name-val">${a.name}</span></td>
      <td>${a.details || '—'}</td>
      <td class="cell-amount text-success">${UTILS.fmtCurrency(a.total_receipts)}</td>
      <td class="cell-amount text-danger">${UTILS.fmtCurrency(a.total_payments)}</td>
      <td class="cell-amount" style="font-weight:700; color: ${a.net_balance >= 0 ? 'var(--success)' : 'var(--danger)'}">
        ${UTILS.fmtCurrency(a.net_balance)}
      </td>
      <td>
        <div class="row-actions">
          <button class="action-btn text-primary ledger-btn" onclick="filterByAccount(${a.id})" title="View Ledger" style="background:none; border:none; padding:4px 8px; font-size:11px; font-weight:600; display:flex; align-items:center; gap:4px; white-space: nowrap; width: auto;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Ledger
          </button>
          <button class="action-btn edit" onclick="editAccount(${a.id})" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="action-btn delete" onclick="deleteAccount(${a.id})" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </td>
    </tr>
  `).join('');

  // Apply responsive card-based layout on mobile view
  UTILS.applyMobileTableLabels('accounts-table');
}

function filterByAccount(accountId) {
  const filterSelect = document.getElementById('account-filter');
  if (filterSelect) {
    filterSelect.value = accountId;
  }
  switchTab('ledger');
}

function switchTab(tab) {
  const tabLedger = document.getElementById('tab-ledger');
  const tabAccounts = document.getElementById('tab-accounts');
  const secLedger = document.getElementById('section-ledger');
  const secAccounts = document.getElementById('section-accounts');

  if (tab === 'ledger') {
    tabLedger?.classList.add('active');
    tabAccounts?.classList.remove('active');
    if (secLedger) secLedger.style.display = 'block';
    if (secAccounts) secAccounts.style.display = 'none';
    loadTransactions();
  } else if (tab === 'accounts') {
    tabLedger?.classList.remove('active');
    tabAccounts?.classList.add('active');
    if (secLedger) secLedger.style.display = 'none';
    if (secAccounts) secAccounts.style.display = 'block';
    loadAccounts();
  }
}

function openAddAccount() {
  document.getElementById('account-form-container').style.display = 'block';
  document.getElementById('account-form-title').textContent = 'Add New Account';
  document.getElementById('account-edit-id').value = '';
  document.getElementById('account-name-input').value = '';
  document.getElementById('account-details-input').value = '';
}

function closeAccountForm() {
  document.getElementById('account-form-container').style.display = 'none';
}

function editAccount(id) {
  const a = allAccounts.find(x => x.id === id);
  if (!a) return;
  document.getElementById('account-form-container').style.display = 'block';
  document.getElementById('account-form-title').textContent = 'Edit Account';
  document.getElementById('account-edit-id').value = a.id;
  document.getElementById('account-name-input').value = a.name;
  document.getElementById('account-details-input').value = a.details || '';
}

async function saveAccount() {
  const name = document.getElementById('account-name-input').value.trim();
  const details = document.getElementById('account-details-input').value.trim();
  const editId = document.getElementById('account-edit-id').value;

  if (!name) {
    APP.showToast('Account name is required', 'error');
    return;
  }

  try {
    const payload = { name, details };
    const url = editId ? `/api/accounts/${editId}` : '/api/accounts';
    const method = editId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!res.ok || !result.success) throw new Error(result.message || 'Failed to save account');

    APP.showToast(editId ? 'Account updated!' : 'Account created!', 'success');
    closeAccountForm();
    await loadAccounts();
    // Reload transactions so the selects and account names update
    setTimeout(() => loadTransactions(), 100);
  } catch (err) {
    console.error(err);
    APP.showToast('Error saving account: ' + err.message, 'error');
  }
}

async function deleteAccount(id) {
  APP.showConfirm('Are you sure you want to delete this account? Transactions associated with it will remain but won\'t be assigned to this account anymore.', async () => {
    try {
      await window.apiService.accounts.delete(id);

      APP.showToast('Account deleted', 'warning');
      closeAccountForm();
      await loadAccounts();
      // Reload transactions so the selects and account names update
      setTimeout(() => loadTransactions(), 100);
    } catch (err) {
      console.error(err);
      APP.showToast('Failed to delete account: ' + err.message, 'error');
    }
  });
}

// Event Listeners
document.getElementById('search-input')?.addEventListener('input', applyFilters);
document.getElementById('type-filter')?.addEventListener('change', applyFilters);
document.getElementById('account-filter')?.addEventListener('change', applyFilters);

loadTransactions();



