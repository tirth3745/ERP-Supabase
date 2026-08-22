const fs = require('fs');

function toCamelCase(str) {
    if (str === 'products/packaging') return 'products.getPackaging';
    return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
}

const files = fs.readdirSync('assets/js').filter(f => f.endsWith('.js') && f !== 'supabaseClient.js' && f !== 'api-services.js');

files.forEach(f => {
    let content = fs.readFileSync('assets/js/' + f, 'utf8');
    
    // GET /api/xxx with error throw
    content = content.replace(/const (\w+) = await fetch\('?\/api\/([a-zA-Z-]+)'?\);\s*if \(!\1\.ok\) throw new Error\([^)]+\);\s*(?:const |let )?(\w+) = await \1\.json\(\);/g, 
        (match, resVar, route, dataVar) => `const ${dataVar} = await window.apiService.${toCamelCase(route)}.getAll();`
    );
    
    // GET /api/xxx with error throw and reassignment
    content = content.replace(/const (\w+) = await fetch\('?\/api\/([a-zA-Z-]+)'?\);\s*if \(!\1\.ok\) throw new Error\([^)]+\);\s*(\w+) = await \1\.json\(\);/g, 
        (match, resVar, route, dataVar) => `${dataVar} = await window.apiService.${toCamelCase(route)}.getAll();`
    );

    // DELETE /api/xxx/id
    content = content.replace(/const (\w+) = await fetch\(`\/api\/([a-zA-Z-]+)\/\$\{id\}`,\s*\{\s*method:\s*'DELETE'\s*\}\);\s*(?:const|let) (\w+) = await \1\.json\(\);\s*if \(!\1\.ok[^)]*\) throw new Error\([^)]+\);/g, 
        (match, resVar, route, dataVar) => `await window.apiService.${toCamelCase(route)}.delete(id);`
    );
    
    // GET by id
    content = content.replace(/const (\w+) = await fetch\(`\/api\/([a-zA-Z-]+)\/\$\{([a-zA-Z0-9_]+)\}`\);\s*if \(!\1\.ok[^)]*\) throw new Error\([^)]+\);\s*(?:const|let) (\w+) = await \1\.json\(\);/g, 
        (match, resVar, route, idVar, dataVar) => `const ${dataVar} = await window.apiService.${toCamelCase(route)}.getById(${idVar});`
    );
    
    // GET by id with assignment
    content = content.replace(/const (\w+) = await fetch\(`\/api\/([a-zA-Z-]+)\/\$\{([a-zA-Z0-9_]+)\}`\);\s*if \(!\1\.ok[^)]*\) throw new Error\([^)]+\);\s*(\w+) = await \1\.json\(\);/g, 
        (match, resVar, route, idVar, dataVar) => `${dataVar} = await window.apiService.${toCamelCase(route)}.getById(${idVar});`
    );

    fs.writeFileSync('assets/js/' + f, content);
});
console.log('Done regex pass 2');
