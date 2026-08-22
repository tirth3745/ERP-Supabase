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
        
        const urlObj2 = new URL('http://localhost' + url); let query = supabase.from(supaTable).select('*'); for (const [k, v] of urlObj2.searchParams) { if (k !== '_t' && k !== 'from' && k !== 'to') query = query.eq(k, v); } const { data, error } = await query;
        if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' }});
      }
      
      if (method === 'POST' || method === 'PUT') {
        const body = JSON.parse(options.body);
        let items = body.items;
        let pkg = body.packaging_options;
        let ing = body.ingredients;
        let mat = body.materials;
        
        delete body.items; delete body.packaging_options; delete body.ingredients; delete body.materials; delete body.allow_backorder; delete body.account_edit_id;
        if (body.batch_no === '') body.batch_no = null; if (body.order_no === '') body.order_no = null; if (body.invoice_no === '') body.invoice_no = null; let o_qty = body.opening_qty; let o_cost = body.opening_cost; let o_batch = body.opening_batch_no;
        delete body.opening_qty; delete body.opening_cost; delete body.opening_batch_no;
        
        let newRecord;
        if (method === 'POST') {
          const { data, error } = await supabase.from(supaTable).insert([body]).select();
          if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
          newRecord = data[0];
        } else {
          const { data, error } = await supabase.from(supaTable).update(body).eq('id', id).select();
          if (error) { alert('Supabase Error on ' + supaTable + ': ' + error.message); throw error; }
          newRecord = data[0];
          
          // For PUT, delete old child records before inserting new ones
          if (supaTable === 'orders') await supabase.from('order_items').delete().eq('order_id', id);
          if (supaTable === 'purchases') await supabase.from('purchase_items').delete().eq('purchase_id', id);
          if (supaTable === 'products') await supabase.from('product_packaging').delete().eq('product_id', id);
          if (supaTable === 'formulations') await supabase.from('formulation_ingredients').delete().eq('formulation_id', id);
          if (supaTable === 'daily_transactions') {
              await supabase.from('daily_transaction_items').delete().eq('daily_txn_id', id);
              await supabase.from('daily_transaction_materials').delete().eq('daily_txn_id', id);
          }
        }
        
        let parentId = newRecord.id;
        
        // Insert child records
        if (items && items.length > 0) {
            if (supaTable === 'orders') { items.forEach(i => i.order_id = parentId); await supabase.from('order_items').insert(items); }
            if (supaTable === 'purchases') { items.forEach(i => i.purchase_id = parentId); await supabase.from('purchase_items').insert(items); }
            if (supaTable === 'daily_transactions') { items.forEach(i => i.daily_txn_id = parentId); await supabase.from('daily_transaction_items').insert(items); }
        }
        
        if (pkg && pkg.length > 0 && supaTable === 'products') {
            pkg.forEach(p => p.product_id = parentId);
            await supabase.from('product_packaging').insert(pkg);
        }
        
        if (ing && ing.length > 0 && supaTable === 'formulations') {
            ing.forEach(i => i.formulation_id = parentId);
            await supabase.from('formulation_ingredients').insert(ing);
        }
        
        if (mat && mat.length > 0 && supaTable === 'daily_transactions') {
            mat.forEach(m => m.daily_txn_id = parentId);
            await supabase.from('daily_transaction_materials').insert(mat);
        }
        
        if (method === 'POST' && supaTable === 'inventory_items' && o_qty > 0) { 
            await supabase.from('stock_batches').insert([{ item_id: parentId, item_type: 'inventory', batch_no: o_batch || 'OPENING', initial_qty: o_qty, current_qty: o_qty, purchase_price: o_cost || 0 }]); 
        }
        
        return new Response(JSON.stringify({ success: true, data: newRecord }), { status: 200 });
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











