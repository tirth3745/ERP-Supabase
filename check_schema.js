const fs = require('fs');
const schema = fs.readFileSync('database/schema_pg.sql', 'utf8');
const tables = {};
const tableMatches = [...schema.matchAll(/CREATE TABLE IF NOT EXISTS (\w+) \((.*?)\);/gs)];
for (const m of tableMatches) {
    const tableName = m[1];
    const columnsText = m[2];
    const columns = [...columnsText.matchAll(/^\s*([a-zA-Z0-9_]+)\s+/gm)].map(c => c[1]);
    tables[tableName] = columns;
}

const htmlFiles = fs.readdirSync('pages').filter(f => f.endsWith('.html'));
for (const f of htmlFiles) {
    const file = 'pages/' + f;
    const html = fs.readFileSync(file, 'utf8');
    const inputs = [...new Set([...html.matchAll(/name="([^"]+)"/g)].map(m => m[1]))];
    
    let tableName = f.replace('.html', '');
    if (tableName === 'inventory') tableName = 'inventory_items';
    
    console.log(tableName, 'inputs:', inputs);
    if (tables[tableName]) {
        const missing = inputs.filter(i => !tables[tableName].includes(i));
        console.log('MISSING:', missing);
    } else {
        console.log('TABLE NOT FOUND:', tableName);
    }
}
