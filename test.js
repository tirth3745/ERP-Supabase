const url = '/api/products';
const path = url.substring(url.indexOf('/api/') + 5).split('?')[0];
const parts = path.split('/');
const table = parts[0];
const id = parts[1];
console.log('path:', path);
console.log('parts:', parts);
console.log('table:', table);
console.log('id:', id);
