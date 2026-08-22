# AgroChem ERP — MySQL Migration Guide

This guide outlines the steps to run the migrated MySQL-based version of AgroChem ERP.

---

## 1. Install & Set Up MySQL
Make sure you have MySQL Server installed and running locally on your system.
- **Windows**: Use [MySQL Installer](https://dev.mysql.com/downloads/installer/) (Community Edition) or XAMPP/WAMP.
- Ensure the MySQL service is running on its default port (`3306`).

---

## 2. Create the Database & Load Schema
Log into your MySQL command line or client (e.g. MySQL Workbench, TablePlus, or phpMyAdmin) and run the following queries:

```sql
-- 1. Create the database
CREATE DATABASE IF NOT EXISTS agrochem_erp;

-- 2. Select the database
USE agrochem_erp;
```

Next, import and execute the SQL migration scripts in this order:
1. **Schema DDL**: Execute all statements inside [database/schema.sql](file:///d:/Projects/Antigravity/Data%20Storing%20Website/Version%2010%20MySQL/database/schema.sql) to create the tables, relationships, and foreign keys.
2. **Seed Data**: Execute all statements inside [database/seed.sql](file:///d:/Projects/Antigravity/Data%20Storing%20Website/Version%2010%20MySQL/database/seed.sql) to pre-populate the master data (Clients, Suppliers, Catalog Products, Raw Materials).

If you are updating an existing database instead of starting fresh, also run:
3. **Daily Entry Update**: Execute [database/migrations/2026-06-30-daily-entry-materials.sql](file:///d:/Projects/Vs%20Code/Version%2021%20with%20no%20change%20in%20order%20and%20daily%20sales%20page/database/migrations/2026-06-30-daily-entry-materials.sql) to switch daily entries to date-only storage and add the new material summary fields.

---

## 3. Configure the `.env` File
In the project root directory, locate the `.env` file and configure your credentials:

```ini
# Server Port
PORT=7890

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_root_password_here
DB_NAME=agrochem_erp

# Node Environment
NODE_ENV=development
```

---

## 4. Run the Application
From your terminal, run the Node.js server:

```bash
# 1. Install Node modules (if not already done)
npm install

# 2. Start the Express server
node backend/server.js
```

The terminal will print:
```text
==================================================
 AgroChem ERP Server running in development mode
 Local Address:   http://localhost:7890
 Database:        localhost:3306
==================================================
Database connected successfully to agrochem_erp
```

Open your browser and navigate to **`http://localhost:7890`** to access the system.
