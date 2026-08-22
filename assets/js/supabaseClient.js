/* assets/js/supabaseClient.js */

// Replace these with your actual Supabase project credentials
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize the Supabase client
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('Supabase client initialized');


// Mock getSession for localhost testing
const originalGetSession = supabase.auth.getSession;
supabase.auth.getSession = async () => {
  if (localStorage.getItem('mock_session') === 'true') {
    return { data: { session: { user: { id: 'mock' } } }, error: null };
  }
  return originalGetSession.call(supabase.auth);
};

// Override signOut
const originalSignOut = supabase.auth.signOut;
supabase.auth.signOut = async () => {
  localStorage.removeItem('mock_session');
  return originalSignOut.call(supabase.auth);
};

// Check session on page load
supabase.auth.getSession().then(({ data }) => {
  if (!data.session && !window.location.pathname.includes("login") && !window.location.pathname.endsWith("/")) {
    const isPagesDir = window.location.pathname.includes("/pages/");
    window.location.href = isPagesDir ? "../login.html" : "./login.html";
  }
});


