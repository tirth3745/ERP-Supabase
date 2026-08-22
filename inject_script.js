const fs = require('fs');

const files = fs.readdirSync('pages').filter(f => f.endsWith('.html'));
for (const f of files) {
    const file = 'pages/' + f;
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('api-services.js')) {
        html = html.replace('<script src="../assets/js/supabaseClient.js"></script>', '<script src="../assets/js/supabaseClient.js"></script>\n  <script src="../assets/js/api-services.js"></script>');
        fs.writeFileSync(file, html);
    }
}
// Also inject in index.html if needed
let idxHtml = fs.readFileSync('index.html', 'utf8');
if (idxHtml.includes('supabaseClient.js') && !idxHtml.includes('api-services.js')) {
   idxHtml = idxHtml.replace('<script src="./assets/js/supabaseClient.js"></script>', '<script src="./assets/js/supabaseClient.js"></script>\n  <script src="./assets/js/api-services.js"></script>');
   fs.writeFileSync('index.html', idxHtml);
}
