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



