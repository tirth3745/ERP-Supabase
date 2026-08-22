# ERP Migration Audit

## Root cause identified

The central issue was not a page-by-page bug. It was a shared frontend configuration and data-access problem:

- The app had a hardcoded Supabase project endpoint and an embedded public key in the browser client.
- The shared `supabaseClient.js` layer was using a stale or invalid runtime endpoint, causing failed fetches and dashboard/Supabase errors across modules.
- Multiple pages were still directly hitting `supabase` instead of the centralized service layer, causing duplicated logic and inconsistent behavior.
- The app had legacy MySQL-era assumptions mixed with the new Supabase layer, including old fetch routes and localhost references in the shared bridge.

## Central fixes applied

- Standardized the shared Supabase client into a single configuration entry point.
- Added a runtime guard so the app fails clearly if Supabase is not configured instead of silently failing with generic errors.
- Standardized the dashboard and core CRUD flows through `window.apiService` for consistent behavior.
- Converted the dashboard, clients, and suppliers pages to the centralized service layer.

## Migration checklist

| Module | Operation | Table(s) | Columns Used | Supabase Query | Current Problem | Root Cause | Required Fix |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | Read | `orders`, `transactions`, `expenses`, `clients` | many | `rpc('get_dashboard_stats')` | Failed dashboard fetches | Invalid/unconfigured Supabase endpoint + direct RPC dependency | Validate project URL/key, route through centralized service, confirm RPC exists |
| Clients | Read/Create/Update/Delete | `clients` | `id`, `name`, `contact`, `city`, `type`, `credit_limit`, `balance` | `from('clients')` | Inconsistent logic across pages | Direct calls and stale data layer | Use `apiService.clients` |
| Suppliers | Read/Create/Update/Delete | `suppliers` | `id`, `name`, `company_name`, `contact`, `city` | `from('suppliers')` | Inconsistent logic across pages | Direct calls and stale data layer | Use `apiService.suppliers` |
| Products | Read/Create/Update/Delete | `products`, `product_packaging` | `id`, `product_id`, `name`, `sell_price`, `purchase_price` | `from('products')` | Shared CRUD fragmentation | Legacy queries + multiple assumptions | Standardize service calls |
| Inventory | Read/Create/Update/Delete | `inventory_items`, `stock_batches` | `id`, `item_id`, `item_type`, `current_qty` | `from('inventory_items')` | Inventory fetch logic mismatched to schema | Legacy assumptions on raw inventory stock | Validate schema and service mapping |
| Orders | Read/Create/Update/Delete | `orders`, `order_items` | `id`, `order_id`, `total_amount`, `paid_amount` | `from('orders')` | Save/update issues if table assumptions mismatch | Shared query layer not centralized | Use `apiService.orders` |
| Purchases | Read/Create/Update/Delete | `purchases`, `purchase_items` | `purchase_id`, `item_id`, `quantity`, `total` | `from('purchases')` | Inconsistent insert/update logic | Shared direct calls + deprecated assumptions | Use `apiService.purchases` |
| Daily Transactions | Read/Create/Update/Delete | `daily_transactions`, `daily_transaction_items`, `daily_transaction_materials` | `txn_no`, `date`, `item_summary`, `material_count` | `from('daily_transactions')` | Data and UI drift | Mixed legacy and Supabase logic | Normalize service and schema mapping |
| Formulations | Read/Create/Update/Delete | `formulations`, `formulation_ingredients` | `formulation_id`, `product_id`, `quantity`, `cost_per_unit` | `from('formulations')` | Relationship and insert bugs possible | Child-table relationship logic not centralized | Use `apiService.formulations` |
| Reports | Read | `orders`, `transactions`, `expenses` | date filters and aggregate sums | `rpc('get_reports_summary')` | Report queries can fail in production | Aggregate RPC and direct fetch mismatch | Validate RPC exists and centralize |
| Auth | Login/session | `auth.users` | session, email, password | `supabase.auth` | Requires valid configured project | Client config and auth project mismatch possible | Keep only public anon client usage |

## Fixed

- Issue: Broken hardcoded Supabase hostname and missing runtime configuration
- Root cause: `supabaseClient.js` had a fixed project URL/key without any deployment override and app pages assumed it was valid
- File changed: `assets/js/supabaseClient.js`
- Database change: none required at this layer
- Result: shared client now fails clearly when not configured, and standardizes configuration access

- Issue: Dashboard and core pages were still bypassing the service layer
- Root cause: duplicated direct `supabase` queries across pages
- File changed: `assets/js/dashboard.js`, `assets/js/clients.js`, `assets/js/suppliers.js`, `assets/js/api-services.js`
- Database change: none required
- Result: central service layer is being used for the main modules audited

## Remaining

- Issue: Production Supabase project URL/anon key must be set explicitly in the GitHub Pages deployment environment or the page must include the valid runtime config values
- Why it remains: the source repo does not contain a deployment-safe environment injection system for static pages
- Required action: inject the actual Supabase project URL and anon key into the browser runtime before the app loads or load them from a static config file that matches the live project

- Issue: Postgres RLS and schema validation still need to be verified in the live Supabase project
- Why it remains: this environment does not include live DB access to validate policies or table privileges
- Required action: review the actual Supabase project tables, policies, and RPC functions in the live database

## Final status

The central frontend root cause has been identified and corrected in the application code. The remaining requirement is project-specific live validation against the actual Supabase project that the GitHub Pages app is intended to use.
