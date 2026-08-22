// assets/js/supabaseClient.js
const CONFIG_KEYS = {
  URL: 'ERP_SUPABASE_URL',
  ANON_KEY: 'ERP_SUPABASE_ANON_KEY'
};

const getConfiguredValue = (name, fallback = '') => {
  const globalName = `__${name}__`;
  const aliases = [];

  if (name === CONFIG_KEYS.URL) {
    aliases.push(
      window.__ERP_SUPABASE_URL__,
      window.ERP_SUPABASE_URL,
      window.NEXT_PUBLIC_SUPABASE_URL,
      window.SUPABASE_URL
    );
  }

  if (name === CONFIG_KEYS.ANON_KEY) {
    aliases.push(
      window.__ERP_SUPABASE_ANON_KEY__,
      window.ERP_SUPABASE_ANON_KEY,
      window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      window.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      window.SUPABASE_ANON_KEY
    );
  }

  aliases.push(window[globalName], window[name], window.CONFIG?.[name]);

  const localValue = aliases.find(v => typeof v === 'string' && v.trim() !== '');
  return localValue || fallback || '';
};

window.ERP_SUPABASE_CONFIG = {
  url: getConfiguredValue(CONFIG_KEYS.URL, 'https://smhfaqwnypvvtxrroruw.supabase.co'),
  anonKey: getConfiguredValue(CONFIG_KEYS.ANON_KEY, 'sb_publishable_iwOVvymxCxJ_-2AMVgW8qA_J5yTrtN0')
};

if (!window.__ERP_SUPABASE_URL__) window.__ERP_SUPABASE_URL__ = window.ERP_SUPABASE_CONFIG.url;
if (!window.__ERP_SUPABASE_ANON_KEY__) window.__ERP_SUPABASE_ANON_KEY__ = window.ERP_SUPABASE_CONFIG.anonKey;
if (!window.NEXT_PUBLIC_SUPABASE_URL) window.NEXT_PUBLIC_SUPABASE_URL = window.ERP_SUPABASE_CONFIG.url;
if (!window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) window.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = window.ERP_SUPABASE_CONFIG.anonKey;

const hasSupabaseRuntime = typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function';
if (!hasSupabaseRuntime) {
  console.error('[ERP] Supabase browser SDK is unavailable. Load the Supabase CDN script before app scripts.');
}

window.supabase = hasSupabaseRuntime
  ? supabase.createClient(window.ERP_SUPABASE_CONFIG.url, window.ERP_SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

window.ERP_SUPABASE_READY = !!window.supabase;

if (!window.ERP_SUPABASE_READY) {
  window.console?.warn('[ERP] Supabase client is not ready. Configure window.__ERP_SUPABASE_URL__ and window.__ERP_SUPABASE_ANON_KEY__ for your production project before deployment.');
}

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

        if (serviceName === 'products' && id === 'packaging') return handleCustomPackaging(url);
        if (serviceName === 'reports' && id === 'summary') return handleCustomReports(url);
        if (url.includes('/next-no')) return new Response(JSON.stringify(await window.apiService.utils.getNextTxnNo()), { status: 200 });

        const service = window.apiService && window.apiService[serviceName];
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
