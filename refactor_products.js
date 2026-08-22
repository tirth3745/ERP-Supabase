const fs = require('fs');
let code = fs.readFileSync('assets/js/products.js', 'utf8');

// Replace loadData() fetches
code = code.replace(/const resProd = await fetch\('\/api\/products'\);[\s\S]*?allProducts = await resProd\.json\(\);/,
  "const { data, error } = await supabase.from('products').select('*');\n      if (error) throw new Error(error.message);\n      allProducts = data;");

code = code.replace(/const resPkg = await fetch\('\/api\/products\/packaging'\);[\s\S]*?allPackagingOptions = await resPkg\.json\(\);/,
  "const { data: pkgData, error: pkgErr } = await supabase.from('product_packaging').select('*');\n      if (pkgErr) throw new Error(pkgErr.message);\n      allPackagingOptions = pkgData;");

// Replace delete product
code = code.replace(/const res = await fetch\(\/api\/products\/\$\{id\},\s*\{\s*method:\s*'DELETE'\s*\}\);[\s\S]*?if \(!res\.ok \|\| !result\.success\) throw new Error\(result\.message \|\| 'Failed to delete product'\);/,
  "const { error } = await supabase.from('products').delete().eq('id', id);\n        if (error) throw new Error(error.message);");

// Replace add/edit product
code = code.replace(/const res = await fetch\(url, \{\s*method: method,\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(payload\)\s*\}\);\s*const result = await res\.json\(\);\s*if \(!res\.ok \|\| !result\.success\) throw new Error\(result\.message \|\| 'Failed to save product'\);/g,
  let error;
        if (isEditMode) {
          const { error: err } = await supabase.from('products').update(payload).eq('id', productId);
          error = err;
        } else {
          const { error: err } = await supabase.from('products').insert([payload]);
          error = err;
        }
        if (error) throw new Error(error.message););

fs.writeFileSync('assets/js/products.js', code);
