/* reports.js */
let salesChart = null, expChart = null;
let currentReportData = null;

function updatePageDebug(text, color) {
  const el = document.getElementById('debug-page-status');
  if (el) {
    el.textContent = 'Page: ' + text;
    if (color) el.style.color = color;
  }
}

async function loadReports() {
  console.log('Loading reports...');
  updatePageDebug('Loading Reports...', '#10B981');
  
  try {
    UTILS.setSkeletonText('rpt-revenue', 'w-50', true);
    UTILS.setSkeletonText('rpt-expenses', 'w-50', true);
    UTILS.setSkeletonText('rpt-purchases', 'w-50', true);
    UTILS.setSkeletonText('rpt-profit', 'w-50', true);
    UTILS.renderTableSkeleton('top-products-table', 5);
    UTILS.renderTableSkeleton('top-clients-table', 5);
    
    // DB init removed for Supabase
    
    // Initialize date inputs to current financial year start (Jan 1) and current date if empty
    const fromInput = document.getElementById('date-from');
    const toInput = document.getElementById('date-to');
    if (fromInput && toInput && !fromInput.value && !toInput.value) {
      const now = new Date();
      const year = now.getFullYear();
      fromInput.value = `${year}-01-01`;
      
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      toInput.value = `${year}-${month}-${day}`;
    }
    
    const from = fromInput ? fromInput.value : '';
    const to = toInput ? toInput.value : '';
    
    console.log(`Reports: Loading KPIs for range ${from} to ${to}...`);
    
    let url = `/api/reports/summary`;
    if (from && to) {
      url += `?from=${from}&to=${to}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch report summary');
    currentReportData = await res.json();
    
    renderSummaryKPIs(currentReportData.summary || {});
    renderSalesChart(currentReportData.salesTrend || []);
    renderExpenseChart(currentReportData.expensesByCategory || []);
    renderTopProducts(currentReportData.topProducts || []);
    renderTopClients(currentReportData.topClients || []);
    
    updatePageDebug('Ready', '#10B981');
    console.log('Reports: All data loaded successfully');
  } catch (err) {
    console.error('Reports loadReports failed:', err);
    updatePageDebug('FAILED', '#EF4444');
    APP.showToast('Failed to load reports: ' + err.message, 'error');
  }
}

function renderSummaryKPIs(summary) {
  const revenue = parseFloat(summary.revenue || 0);
  const totalExp = parseFloat(summary.expenses || 0);
  const totalPurch = parseFloat(summary.purchases || 0);
  const profit = parseFloat(summary.profit || 0);

  document.getElementById('rpt-revenue').textContent = UTILS.fmtCurrency(revenue);
  document.getElementById('rpt-expenses').textContent = UTILS.fmtCurrency(totalExp);
  document.getElementById('rpt-purchases').textContent = UTILS.fmtCurrency(totalPurch);
  
  const profitEl = document.getElementById('rpt-profit');
  if (profitEl) {
    profitEl.textContent = UTILS.fmtCurrency(profit);
    profitEl.style.color = profit >= 0 ? 'var(--success)' : 'var(--danger)';
  }
}

function renderSalesChart(trend) {
  const ctx = document.getElementById('sales-trend-chart');
  if (!ctx) return;
  UTILS.destroyChart(salesChart);
  
  if (trend.length === 0) {
    salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['No Data'],
        datasets: [{ label: 'Revenue (₹)', data: [0], borderColor: '#7C3AED', backgroundColor: 'rgba(124,58,237,0.05)', fill: true }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
    return;
  }
  
  const labels = trend.map(x => x.mo);
  const totals = trend.map(x => parseFloat(x.total || 0));

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: totals,
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124,58,237,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#7C3AED',
        pointRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + UTILS.fmtCurrency(ctx.parsed.y) } }
      },
      scales: {
        y: { ticks: { callback: v => '₹' + (v/1000).toFixed(0) + 'K' }, grid: { color: '#F3F4F6' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderExpenseChart(cats) {
  const ctx = document.getElementById('expense-trend-chart');
  if (!ctx) return;
  UTILS.destroyChart(expChart);
  
  const colors = ['#EF4444','#10B981','#10B981','#3B82F6','#8B5CF6','#EC4899'];
  
  if (cats.length === 0) {
    expChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['No Data'],
        datasets: [{ label: 'Amount', data: [0], backgroundColor: '#E5E7EB', borderColor: '#D1D5DB', borderWidth: 2, borderRadius: 8 }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    });
    return;
  }

  expChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cats.map(c => c.category || 'Other'),
      datasets: [{ label: 'Amount', data: cats.map(c => parseFloat(c.total)||0), backgroundColor: colors.map(c => c+'33'), borderColor: colors, borderWidth: 2, borderRadius: 8 }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + UTILS.fmtCurrency(ctx.parsed.y) } }
      },
      scales: {
        y: { ticks: { callback: v => '₹' + (v/1000).toFixed(0) + 'K' }, grid: { color: '#F3F4F6' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function renderTopProducts(data) {
  const tbody = document.querySelector('#top-products-table tbody');
  if (!tbody) return;
  if (!data || !data.length) { 
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-sm" style="padding:16px;text-align:center">No data in this period.</td></tr>'; 
    return; 
  }
  tbody.innerHTML = data.map((r, i) => `<tr>
    <td data-label="#" style="font-size:11px;color:var(--text-muted)">#${i+1}</td>
    <td data-label="Product" style="font-weight:600">${r.product_name || '—'}</td>
    <td data-label="Revenue" style="font-weight:600;color:var(--accent)">${UTILS.fmtCurrency(r.total_rev)}</td>
  </tr>`).join('');
  UTILS.applyMobileTableLabels('top-products-table');
}

function renderTopClients(data) {
  const tbody = document.querySelector('#top-clients-table tbody');
  if (!tbody) return;
  if (!data || !data.length) { 
    tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-sm" style="padding:16px;text-align:center">No data in this period.</td></tr>'; 
    return; 
  }
  tbody.innerHTML = data.map((r, i) => `<tr>
    <td data-label="#" style="font-size:11px;color:var(--text-muted)">#${i+1}</td>
    <td data-label="Client" style="font-weight:600">${r.name || '—'}</td>
    <td data-label="Revenue" style="font-weight:600;color:var(--success)">${UTILS.fmtCurrency(r.total_rev)}</td>
  </tr>`).join('');
  UTILS.applyMobileTableLabels('top-clients-table');
}

function applyDateFilter() {
  const from = document.getElementById('date-from').value;
  const to = document.getElementById('date-to').value;
  if (!from || !to) { 
    APP.showToast('Select both from and to dates', 'warning'); 
    return; 
  }
  
  if (new Date(from) > new Date(to)) {
    APP.showToast('From date cannot be after To date', 'warning');
    return;
  }
  
  loadReports();
  APP.showToast('Report updated for selected date range', 'success');
}

function resetDateFilter() {
  const fromInput = document.getElementById('date-from');
  const toInput = document.getElementById('date-to');
  if (fromInput && toInput) {
    const now = new Date();
    const year = now.getFullYear();
    fromInput.value = `${year}-01-01`;
    
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    toInput.value = `${year}-${month}-${day}`;
    
    applyDateFilter();
  }
}

function exportReportToCSV() {
  if (!currentReportData) {
    APP.showToast('Report data not loaded yet', 'warning');
    return;
  }

  try {
    const from = document.getElementById('date-from').value;
    const to = document.getElementById('date-to').value;
    
    const summary = currentReportData.summary || {};
    const topProducts = currentReportData.topProducts || [];
    const topClients = currentReportData.topClients || [];
    
    const totalRevenue = parseFloat(summary.revenue || 0);
    const totalExpenses = parseFloat(summary.expenses || 0);
    const totalPurchases = parseFloat(summary.purchases || 0);
    const netProfit = parseFloat(summary.profit || 0);
    
    // Build CSV content
    let csvContent = "\ufeff"; // BOM for excel utf8 encoding
    csvContent += "AgroChem ERP Consolidated Business Report\r\n";
    csvContent += `Period: ${from || 'All Time'} to ${to || 'All Time'}\r\n\r\n`;
    
    csvContent += "FINANCIAL SUMMARY\r\n";
    csvContent += "Metric,Value (INR)\r\n";
    csvContent += `Total Revenue,${totalRevenue.toFixed(2)}\r\n`;
    csvContent += `Total Expenses,${totalExpenses.toFixed(2)}\r\n`;
    csvContent += `Total Purchases,${totalPurchases.toFixed(2)}\r\n`;
    csvContent += `Net Profit,${netProfit.toFixed(2)}\r\n\r\n`;
    
    csvContent += "TOP PRODUCTS BY REVENUE\r\n";
    csvContent += "Product,Quantity Sold,Revenue (INR)\r\n";
    topProducts.forEach(p => {
      csvContent += `"${p.product_name}",${parseFloat(p.total_qty || 0).toFixed(2)},${parseFloat(p.total_rev || 0).toFixed(2)}\r\n`;
    });
    csvContent += "\r\n";
    
    csvContent += "TOP CLIENTS BY REVENUE\r\n";
    csvContent += "Client,Revenue (INR)\r\n";
    topClients.forEach(c => {
      csvContent += `"${c.name}",${parseFloat(c.total_rev || 0).toFixed(2)}\r\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `AgroChem_ERP_Report_${from}_to_${to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    APP.showToast('CSV report exported successfully!', 'success');
  } catch (err) {
    console.error('Failed to export CSV:', err);
    APP.showToast('Export failed: ' + err.message, 'error');
  }
}

loadReports();

// Explicitly expose functions for global inline HTML access
window.applyDateFilter = applyDateFilter;
window.resetDateFilter = resetDateFilter;
window.exportReportToCSV = exportReportToCSV;

