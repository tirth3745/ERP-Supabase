// assets/js/supabaseClient.js
const SUPABASE_URL = 'https://eeyvymhytbthvjymnhzl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_iwOVvymxCxJ_-2AMVgW8qA_J5yTrtN0';
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Temporary Fetch Interceptor to route legacy API calls to the new Service Layer
(function() {
  const originalFetchSupabase = window.fetch;
  window.fetch = async function(...args) {
    const url = args[0];
    const options = args[1] || { method: 'GET' };
    const method = options.method || 'GET';
    
    if (typeof url === 'string' && url.includes('/api/')) {
        const path = url.substring(url.indexOf('/api/') + 5).split('?')[0];
        const parts = path.split('/');
        let serviceName = parts[0].replace(/-([a-z])/g, g => g[1].toUpperCase());
        const id = parts[1];
        
        // Handle custom mappings
        if (serviceName === 'inventory') serviceName = 'inventory';
        if (serviceName === 'masterOptions') serviceName = 'masterOptions';
        if (serviceName === 'dailyTransactions') serviceName = 'dailyTransactions';
        if (serviceName === 'products' && id === 'packaging') return handleCustomPackaging(url);
        if (serviceName === 'reports' && id === 'summary') return handleCustomReports(url);
        if (url.includes('/next-no')) return new Response(JSON.stringify(await window.apiService.utils.getNextTxnNo()), { status: 200 });

        const service = window.apiService[serviceName];
        if (!service) return originalFetchSupabase.apply(window, args);

        try {
            let data;
            if (method === 'GET') {
                if (id) data = await service.getById(id);
                else data = await service.getAll();
            } else if (method === 'POST') {
                const body = JSON.parse(options.body);
                data = await service.create(body);
            } else if (method === 'PUT') {
                const body = JSON.parse(options.body);
                data = await service.update(id, body);
            } else if (method === 'DELETE') {
                await service.delete(id);
                return new Response(JSON.stringify({ success: true }), { status: 200 });
            }
            return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (err) {
            console.error('[Service Layer Error]', err);
            return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }
    return originalFetchSupabase.apply(window, args);
  };
  
  async function handleCustomPackaging(url) {
      const urlObj = new URL('http://localhost' + url);
      const pid = urlObj.searchParams.get('product_id');
      const data = await window.apiService.products.getPackaging(pid);
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  
  async function handleCustomReports(url) {
      const urlObj = new URL('http://localhost' + url);
      const from = urlObj.searchParams.get('from') || '';
      const to = urlObj.searchParams.get('to') || '';
      const data = await window.apiService.reports.getSummary(from, to);
      return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
})();
