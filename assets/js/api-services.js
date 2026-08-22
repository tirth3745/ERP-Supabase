// api-services.js
// Standardized Supabase Data Access Layer

const withSupabase = () => {
    if (!window.supabase || typeof window.supabase.from !== 'function') {
        const message = 'Supabase client is not configured. Set window.__ERP_SUPABASE_URL__ and window.__ERP_SUPABASE_ANON_KEY__ before loading ERP pages.';
        console.error('[ERP] ' + message);
        throw new Error(message);
    }
    return window.supabase;
};

const throwErr = (err, context) => {
    if (err) {
        console.error(`[Supabase Error] ${context}:`, err);
        throw new Error(err.message || err.error_description || 'Unknown database error');
    }
};

const handleResponse = (data, error, context) => {
    throwErr(error, context);
    return data;
};

// Clean undefined/empty string fields before sending to Supabase
const sanitizePayload = (payload) => {
    const clean = { ...payload };
    for (const key in clean) {
        if (clean[key] === undefined) delete clean[key];
        if (clean[key] === '' && (key.includes('_no') || key.includes('_id') || key === 'unit')) {
            clean[key] = null; // Prevent unique constraint violations
        }
    }
    return clean;
};

window.apiService = {
    // ---- HEALTH / DASHBOARD ----
    dashboard: {
        getStats: async () => {
            const client = withSupabase();
            const { data, error } = await client.rpc('get_dashboard_stats');
            return handleResponse(data, error, 'dashboard.getStats');
        }
    },

    // ---- CLIENTS ----
    clients: {
        getAll: async () => {
            const client = withSupabase();
            const { data, error } = await client.from('clients').select('*').order('name');
            return handleResponse(data, error, 'clients.getAll');
        },
        getById: async (id) => {
            const client = withSupabase();
            const { data, error } = await client.from('clients').select('*').eq('id', id).single();
            return handleResponse(data, error, 'clients.getById');
        },
        create: async (payload) => {
            const client = withSupabase();
            const { data, error } = await client.from('clients').insert([sanitizePayload(payload)]).select();
            return handleResponse(data, error, 'clients.create')[0];
        },
        update: async (id, payload) => {
            const client = withSupabase();
            const { data, error } = await client.from('clients').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'clients.update')[0];
        },
        delete: async (id) => {
            const client = withSupabase();
            const { error } = await client.from('clients').delete().eq('id', id);
            throwErr(error, 'clients.delete');
            return true;
        }
    },
    
    // ---- SUPPLIERS ----
    suppliers: {
        getAll: async () => {
            const { data, error } = await supabase.from('suppliers').select('*').order('name');
            return handleResponse(data, error, 'suppliers.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single();
            return handleResponse(data, error, 'suppliers.getById');
        },
        create: async (payload) => {
            const { data, error } = await supabase.from('suppliers').insert([sanitizePayload(payload)]).select();
            return handleResponse(data, error, 'suppliers.create')[0];
        },
        update: async (id, payload) => {
            const { data, error } = await supabase.from('suppliers').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'suppliers.update')[0];
        },
        delete: async (id) => {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            throwErr(error, 'suppliers.delete');
            return true;
        }
    },
    
    // ---- PRODUCTS ----
    products: {
        getAll: async () => {
            const { data, error } = await supabase.from('products').select('*').order('name');
            return handleResponse(data, error, 'products.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
            const { data: pkg, error: pkgErr } = await supabase.from('product_packaging').select('*').eq('product_id', id);
            throwErr(pkgErr, 'products.getPackaging');
            if (data) data.packaging_options = pkg || [];
            return handleResponse(data, error, 'products.getById');
        },
        create: async (payload) => {
            let pkg = payload.packaging_options || [];
            delete payload.packaging_options;
            const { data, error } = await supabase.from('products').insert([sanitizePayload(payload)]).select();
            const newRecord = handleResponse(data, error, 'products.create')[0];
            
            if (pkg.length > 0) {
                pkg.forEach(p => p.product_id = newRecord.id);
                const { error: pkgErr } = await supabase.from('product_packaging').insert(pkg);
                throwErr(pkgErr, 'products.createPackaging');
            }
            return newRecord;
        },
        update: async (id, payload) => {
            let pkg = payload.packaging_options || [];
            delete payload.packaging_options;
            const { data, error } = await supabase.from('products').update(sanitizePayload(payload)).eq('id', id).select();
            const updated = handleResponse(data, error, 'products.update')[0];
            
            await supabase.from('product_packaging').delete().eq('product_id', id);
            if (pkg.length > 0) {
                pkg.forEach(p => p.product_id = id);
                const { error: pkgErr } = await supabase.from('product_packaging').insert(pkg);
                throwErr(pkgErr, 'products.updatePackaging');
            }
            return updated;
        },
        delete: async (id) => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            throwErr(error, 'products.delete');
            return true;
        },
        getPackaging: async (productId) => {
            let query = supabase.from('product_packaging').select('*');
            if (productId) query = query.eq('product_id', productId);
            const { data, error } = await query;
            return handleResponse(data, error, 'products.getPackaging');
        }
    },
    
    // ---- INVENTORY ----
    inventory: {
        getAll: async () => {
            const { data, error } = await supabase.from('inventory_items').select('*').order('name');
            return handleResponse(data, error, 'inventory.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('inventory_items').select('*').eq('id', id).single();
            return handleResponse(data, error, 'inventory.getById');
        },
        create: async (payload) => {
            let o_qty = payload.opening_qty; let o_cost = payload.opening_cost; let o_batch = payload.opening_batch_no;
            delete payload.opening_qty; delete payload.opening_cost; delete payload.opening_batch_no;
            
            const { data, error } = await supabase.from('inventory_items').insert([sanitizePayload(payload)]).select();
            const newRecord = handleResponse(data, error, 'inventory.create')[0];
            
            if (o_qty > 0) {
                const { error: bErr } = await supabase.from('stock_batches').insert([{
                    item_id: newRecord.id, item_type: 'inventory', batch_no: o_batch || 'OPENING', initial_qty: o_qty, current_qty: o_qty, purchase_price: o_cost || 0
                }]);
                throwErr(bErr, 'inventory.createStockBatch');
            }
            return newRecord;
        },
        update: async (id, payload) => {
            delete payload.opening_qty; delete payload.opening_cost; delete payload.opening_batch_no;
            const { data, error } = await supabase.from('inventory_items').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'inventory.update')[0];
        },
        delete: async (id) => {
            const { error } = await supabase.from('inventory_items').delete().eq('id', id);
            throwErr(error, 'inventory.delete');
            return true;
        },
        getBatches: async (itemId, type = 'inventory') => {
            const { data, error } = await supabase.from('stock_batches').select('*').eq('item_id', itemId).eq('item_type', type);
            return handleResponse(data, error, 'inventory.getBatches');
        }
    },
    
    // ---- ORDERS ----
    orders: {
        getAll: async () => {
            const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
            return handleResponse(data, error, 'orders.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
            const { data: items, error: iErr } = await supabase.from('order_items').select('*').eq('order_id', id);
            throwErr(iErr, 'orders.getItems');
            if (data) data.items = items || [];
            return handleResponse(data, error, 'orders.getById');
        },
        create: async (payload) => {
            let items = payload.items || [];
            delete payload.items; delete payload.allow_backorder;
            
            const { data, error } = await supabase.from('orders').insert([sanitizePayload(payload)]).select();
            const newRecord = handleResponse(data, error, 'orders.create')[0];
            
            if (items.length > 0) {
                items.forEach(i => i.order_id = newRecord.id);
                const { error: iErr } = await supabase.from('order_items').insert(items);
                throwErr(iErr, 'orders.createItems');
            }
            return newRecord;
        },
        update: async (id, payload) => {
            let items = payload.items || [];
            delete payload.items; delete payload.allow_backorder;
            
            const { data, error } = await supabase.from('orders').update(sanitizePayload(payload)).eq('id', id).select();
            const updated = handleResponse(data, error, 'orders.update')[0];
            
            await supabase.from('order_items').delete().eq('order_id', id);
            if (items.length > 0) {
                items.forEach(i => i.order_id = id);
                const { error: iErr } = await supabase.from('order_items').insert(items);
                throwErr(iErr, 'orders.updateItems');
            }
            return updated;
        },
        delete: async (id) => {
            const { error } = await supabase.from('orders').delete().eq('id', id);
            throwErr(error, 'orders.delete');
            return true;
        }
    },
    
    // ---- MASTER OPTIONS ----
    masterOptions: {
        getAll: async () => {
            const { data, error } = await supabase.from('master_options').select('*');
            return handleResponse(data, error, 'masterOptions.getAll');
        },
        create: async (payload) => {
            const { data, error } = await supabase.from('master_options').insert([sanitizePayload(payload)]).select();
            return handleResponse(data, error, 'masterOptions.create')[0];
        },
        update: async (id, payload) => {
            const { data, error } = await supabase.from('master_options').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'masterOptions.update')[0];
        },
        delete: async (id) => {
            const { error } = await supabase.from('master_options').delete().eq('id', id);
            throwErr(error, 'masterOptions.delete');
            return true;
        }
    },
    
    // ---- UTILS & REPORTS ----
    reports: {
        getSummary: async (from = '', to = '') => {
            const { data, error } = await supabase.rpc('get_reports_summary', { from_date: from, to_date: to });
            return handleResponse(data, error, 'reports.getSummary');
        }
    },
    utils: {
        getNextTxnNo: async () => {
            return { txn_no: 'TXN-' + Math.floor(Math.random()*10000) };
        }
    },
    
    // ---- PURCHASES ----
    purchases: {
        getAll: async () => {
            const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
            return handleResponse(data, error, 'purchases.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('purchases').select('*').eq('id', id).single();
            const { data: items, error: iErr } = await supabase.from('purchase_items').select('*').eq('purchase_id', id);
            throwErr(iErr, 'purchases.getItems');
            if (data) data.items = items || [];
            return handleResponse(data, error, 'purchases.getById');
        },
        create: async (payload) => {
            let items = payload.items || [];
            delete payload.items;
            
            const { data, error } = await supabase.from('purchases').insert([sanitizePayload(payload)]).select();
            const newRecord = handleResponse(data, error, 'purchases.create')[0];
            
            if (items.length > 0) {
                items.forEach(i => i.purchase_id = newRecord.id);
                const { error: iErr } = await supabase.from('purchase_items').insert(items);
                throwErr(iErr, 'purchases.createItems');
            }
            return newRecord;
        },
        update: async (id, payload) => {
            let items = payload.items || [];
            delete payload.items;
            
            const { data, error } = await supabase.from('purchases').update(sanitizePayload(payload)).eq('id', id).select();
            const updated = handleResponse(data, error, 'purchases.update')[0];
            
            await supabase.from('purchase_items').delete().eq('purchase_id', id);
            if (items.length > 0) {
                items.forEach(i => i.purchase_id = id);
                const { error: iErr } = await supabase.from('purchase_items').insert(items);
                throwErr(iErr, 'purchases.updateItems');
            }
            return updated;
        },
        delete: async (id) => {
            const { error } = await supabase.from('purchases').delete().eq('id', id);
            throwErr(error, 'purchases.delete');
            return true;
        }
    },
    
    // ---- EXPENSES ----
    expenses: {
        getAll: async () => {
            const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
            return handleResponse(data, error, 'expenses.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('expenses').select('*').eq('id', id).single();
            return handleResponse(data, error, 'expenses.getById');
        },
        create: async (payload) => {
            const { data, error } = await supabase.from('expenses').insert([sanitizePayload(payload)]).select();
            return handleResponse(data, error, 'expenses.create')[0];
        },
        update: async (id, payload) => {
            const { data, error } = await supabase.from('expenses').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'expenses.update')[0];
        },
        delete: async (id) => {
            const { error } = await supabase.from('expenses').delete().eq('id', id);
            throwErr(error, 'expenses.delete');
            return true;
        }
    },
    
    // ---- ACCOUNTS ----
    accounts: {
        getAll: async () => {
            const { data, error } = await supabase.from('accounts').select('*');
            return handleResponse(data, error, 'accounts.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('accounts').select('*').eq('id', id).single();
            return handleResponse(data, error, 'accounts.getById');
        },
        create: async (payload) => {
            const { data, error } = await supabase.from('accounts').insert([sanitizePayload(payload)]).select();
            return handleResponse(data, error, 'accounts.create')[0];
        },
        update: async (id, payload) => {
            const { data, error } = await supabase.from('accounts').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'accounts.update')[0];
        },
        delete: async (id) => {
            const { error } = await supabase.from('accounts').delete().eq('id', id);
            throwErr(error, 'accounts.delete');
            return true;
        }
    },
    
    // ---- TRANSACTIONS ----
    transactions: {
        getAll: async () => {
            const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
            return handleResponse(data, error, 'transactions.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('transactions').select('*').eq('id', id).single();
            return handleResponse(data, error, 'transactions.getById');
        },
        create: async (payload) => {
            delete payload.account_edit_id;
            const { data, error } = await supabase.from('transactions').insert([sanitizePayload(payload)]).select();
            return handleResponse(data, error, 'transactions.create')[0];
        },
        update: async (id, payload) => {
            delete payload.account_edit_id;
            const { data, error } = await supabase.from('transactions').update(sanitizePayload(payload)).eq('id', id).select();
            return handleResponse(data, error, 'transactions.update')[0];
        },
        delete: async (id) => {
            const { error } = await supabase.from('transactions').delete().eq('id', id);
            throwErr(error, 'transactions.delete');
            return true;
        }
    },
    
    // ---- FORMULATIONS ----
    formulations: {
        getAll: async () => {
            const { data, error } = await supabase.from('formulations').select('*');
            return handleResponse(data, error, 'formulations.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('formulations').select('*').eq('id', id).single();
            const { data: ing, error: iErr } = await supabase.from('formulation_ingredients').select('*').eq('formulation_id', id);
            throwErr(iErr, 'formulations.getIngredients');
            if (data) data.ingredients = ing || [];
            return handleResponse(data, error, 'formulations.getById');
        },
        create: async (payload) => {
            let ing = payload.ingredients || []; delete payload.ingredients;
            const { data, error } = await supabase.from('formulations').insert([sanitizePayload(payload)]).select();
            const newRecord = handleResponse(data, error, 'formulations.create')[0];
            if (ing.length > 0) {
                ing.forEach(i => i.formulation_id = newRecord.id);
                const { error: iErr } = await supabase.from('formulation_ingredients').insert(ing);
                throwErr(iErr, 'formulations.createIngredients');
            }
            return newRecord;
        },
        update: async (id, payload) => {
            let ing = payload.ingredients || []; delete payload.ingredients;
            const { data, error } = await supabase.from('formulations').update(sanitizePayload(payload)).eq('id', id).select();
            const updated = handleResponse(data, error, 'formulations.update')[0];
            await supabase.from('formulation_ingredients').delete().eq('formulation_id', id);
            if (ing.length > 0) {
                ing.forEach(i => i.formulation_id = id);
                const { error: iErr } = await supabase.from('formulation_ingredients').insert(ing);
                throwErr(iErr, 'formulations.updateIngredients');
            }
            return updated;
        },
        delete: async (id) => {
            const { error } = await supabase.from('formulations').delete().eq('id', id);
            throwErr(error, 'formulations.delete');
            return true;
        }
    },
    
    // ---- DAILY TRANSACTIONS ----
    dailyTransactions: {
        getAll: async () => {
            const { data, error } = await supabase.from('daily_transactions').select('*').order('date', { ascending: false });
            return handleResponse(data, error, 'dailyTransactions.getAll');
        },
        getById: async (id) => {
            const { data, error } = await supabase.from('daily_transactions').select('*').eq('id', id).single();
            const { data: items, error: itErr } = await supabase.from('daily_transaction_items').select('*').eq('daily_txn_id', id);
            const { data: materials, error: matErr } = await supabase.from('daily_transaction_materials').select('*').eq('daily_txn_id', id);
            if (data) { data.items = items || []; data.materials = materials || []; }
            return handleResponse(data, error, 'dailyTransactions.getById');
        },
        create: async (payload) => {
            let items = payload.items || []; let materials = payload.materials || [];
            delete payload.items; delete payload.materials;
            const { data, error } = await supabase.from('daily_transactions').insert([sanitizePayload(payload)]).select();
            const newRecord = handleResponse(data, error, 'dailyTransactions.create')[0];
            if (items.length > 0) { items.forEach(i => i.daily_txn_id = newRecord.id); await supabase.from('daily_transaction_items').insert(items); }
            if (materials.length > 0) { materials.forEach(m => m.daily_txn_id = newRecord.id); await supabase.from('daily_transaction_materials').insert(materials); }
            return newRecord;
        },
        update: async (id, payload) => {
            let items = payload.items || []; let materials = payload.materials || [];
            delete payload.items; delete payload.materials;
            const { data, error } = await supabase.from('daily_transactions').update(sanitizePayload(payload)).eq('id', id).select();
            const updated = handleResponse(data, error, 'dailyTransactions.update')[0];
            await supabase.from('daily_transaction_items').delete().eq('daily_txn_id', id);
            await supabase.from('daily_transaction_materials').delete().eq('daily_txn_id', id);
            if (items.length > 0) { items.forEach(i => i.daily_txn_id = id); await supabase.from('daily_transaction_items').insert(items); }
            if (materials.length > 0) { materials.forEach(m => m.daily_txn_id = id); await supabase.from('daily_transaction_materials').insert(materials); }
            return updated;
        },
        delete: async (id) => {
            const { error } = await supabase.from('daily_transactions').delete().eq('id', id);
            throwErr(error, 'dailyTransactions.delete');
            return true;
        }
    }
};
