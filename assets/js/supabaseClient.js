/* assets/js/supabaseClient.js */

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://smhfaqwnypvvtxrroruw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iwOVvymxCxJ_-2AMVgW8qA_J5yTrtN0';

// Initialize the Supabase client
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized');


// Check session on page load
supabase.auth.getSession().then(({ data }) => {
  if (!data.session && !window.location.pathname.includes("login") && !window.location.pathname.endsWith("/")) {
    const isPagesDir = window.location.pathname.includes("/pages/");
    window.location.href = isPagesDir ? "../login.html" : "./login.html";
  }
});




// ==========================================
// SUPABASE FETCH INTERCEPTOR
// ==========================================
// This intercepts all old /api/ calls and redirects them to Supabase!
const originalFetchSupabase = window.fetch;
window.fetch = async function(...args) {
  const url = typeof args[0] === 'string' ? args[0] : args[0].url;
  const options = args[1] || {};
  const method = (options.method || 'GET').toUpperCase();
  
  if (url.includes('/api/')) {
    console.log('[Supabase Interceptor]', method, url);
    const path = url.substring(url.indexOf('/api/') + 5).split('?')[0];
    const parts = path.split('/');
    const table = parts[0];
    const id = parts[1];
    
    if (url.includes('/next-no')) {
      return new Response(JSON.stringify({ txn_no: 'TXN-' + Math.floor(Math.random()*10000) }), { status: 200 });
    }
    
    let supaTable = table;
    if (table === 'inventory') supaTable = 'inventory_items';
    if (table === 'daily-transactions') supaTable = 'daily_transactions';
    if (table === 'master-options') supaTable = 'master_options';
    if (url.includes('/products/packaging')) supaTable = 'product_packaging';
    
    try {
      if (method === 'GET') {
        if (table === 'reports' && id === 'summary') {
            const urlObj = new URL('http://localhost' + url);
            const fromDate = urlObj.searchParams.get('from') || '';
            const toDate = urlObj.searchParams.get('to') || '';
            const { data, error } = await supabase.rpc('get_reports_summary', { from_date: fromDate, to_date: toDate });
            if (error) { alert('Supabase Error on reports: ' + error.message); throw error; }
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }

        if (id && id !== 'packaging') {
            if (supaTable === 'orders') {
                const { data } = await supabase.from('orders').select('*').eq('id', id).single();
                const { data: items } = await supabase.from('order_items').select('*').eq('order_id', id);
                if (data) data.items = items || [];
                return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
            }
            if (supaTable === 'purchases') {
                const { data } = await supabase.from('purchases').select('*').eq('id', id).single();
                const { data: items } = await supabase.from('purchase_items').select('*').eq('purchase_id', id);
                if (data) data.items = items || [];
                return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
            }
            if (supaTable === 'daily_transactions') {
                const { data } = await supabase.from('daily_transactions').select('*').eq('id', id).single();
                const { data: items } = await supabase.from('daily_transaction_items').select('*').eq('daily_txn_id', id);
                if (data) data.items = items || [];
                return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
            }
            const { data, error } = await supabase.from(supaTable).select('*').eq('id', id).single();
            if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
        }
        
        const { data, error } = await supabase.from(supaTable).select('*');
        if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }
      
      if (method === 'POST') {
        const body = JSON.parse(options.body);
        let items = body.items;
        delete body.items; // Don't insert items into main table
        const { data, error } = await supabase.from(supaTable).insert([body]).select();
        if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
        let newRecord = data[0];
        
        // Mock inserting items
        if (items && items.length > 0) {
            if (supaTable === 'orders') items.forEach(i => i.order_id = newRecord.id);
            if (supaTable === 'purchases') items.forEach(i => i.purchase_id = newRecord.id);
            let childTable = supaTable === 'orders' ? 'order_items' : (supaTable === 'purchases' ? 'purchase_items' : null);
            if (childTable) await supabase.from(childTable).insert(items);
        }
        return new Response(JSON.stringify({ success: true, data: newRecord }), { status: 200 });
      }
      
      if (method === 'PUT') {
        const body = JSON.parse(options.body);
        delete body.items;
        const { data, error } = await supabase.from(supaTable).update(body).eq('id', id).select();
        if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
        return new Response(JSON.stringify({ success: true, data: data[0] }), { status: 200 });
      }
      
      if (method === 'DELETE') {
        const { error } = await supabase.from(supaTable).delete().eq('id', id);
        if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
    } catch (err) {
      console.error('[Supabase Interceptor Error]', err); if (!err.message.includes('Failed to fetch')) { alert('Interceptor Error: ' + err.message); }
      return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  return originalFetchSupabase(...args);
};



