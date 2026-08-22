const fs = require("fs");
let content = fs.readFileSync("assets/js/supabaseClient.js", "utf-8");
if (!content.includes("supabase.auth.getSession")) {
  content += `\n\n// Check session on page load\nsupabase.auth.getSession().then(({ data }) => {\n  if (!data.session && !window.location.pathname.includes("login.html") && !window.location.pathname.endsWith("/")) {\n    const isPagesDir = window.location.pathname.includes("/pages/");\n    window.location.href = isPagesDir ? "../login.html" : "./login.html";\n  }\n});\n`;
  fs.writeFileSync("assets/js/supabaseClient.js", content);
}
