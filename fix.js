const fs = require('fs');
let code = fs.readFileSync('assets/js/api-services.js', 'utf8');
code = code.replace('console.error([Supabase Error] :, err);', 'console.error([Supabase Error] :, err);');
fs.writeFileSync('assets/js/api-services.js', code);
