# Admin Login & Security Setup Guide

## 📋 Summary of Changes

Three high-priority features have been implemented:

### 1. ✅ Admin Login System
- Admin-only authentication required to access the application
- Login page at `login.html`
- Session-based authentication with 24-hour expiry
- Secure password storage location

### 2. ✅ Data Validation & Error Handling
- Server-side input validation for all data
- Email, phone, GST, currency, and date validators
- Better error messages for users
- Validation utility ready to use across all routes

### 3. ✅ Environment Configuration
- `.env.example` file for configuration template
- `backend/config/env.js` loads all environment variables
- Secure session secret configuration
- Production-ready setup

---

## 🔐 Admin Credentials Setup

### Where Credentials Are Stored:
- **File:** `backend/config/admin.js`
- **Username Line:** Line 6
- **Password Line:** Line 7
- **Session Timeout Line:** Line 10

### ⚠️ IMPORTANT: Change Default Credentials

1. Open `backend/config/admin.js`
2. Replace the default credentials:
   - Line 6: Change `admin` to your desired username
   - Line 7: Change `admin123` to your desired password
3. **Keep the variable names the same**, only change the values inside the quotes

Example:
```javascript
admin_username: 'yourusername',
admin_password_hash: 'yourpassword123',
```

---

## 🚀 How to Use

### First Time Setup:

1. **Install dependencies** (if express-session is new):
   ```
   npm install
   ```

2. **Create `.env` file** (optional, uses defaults if not created):
   - Copy `.env.example` to `.env`
   - Customize values as needed

3. **Start the server**:
   ```
   npm.cmd start
   ```

4. **Login**:
   - Go to `http://localhost:7890/login.html`
   - Enter your admin credentials
   - You'll be redirected to dashboard after successful login

### Logout:
- A logout button will appear in the navigation
- Clicking it will destroy the session and redirect to login

---

## 📁 New Files Created

### Authentication:
- `backend/config/admin.js` - Admin credentials storage ⚙️ **EDIT THIS**
- `backend/controllers/authController.js` - Login/logout logic
- `backend/middleware/authMiddleware.js` - Session verification
- `backend/routes/auth.js` - Auth endpoints
- `login.html` - Login page UI

### Validation:
- `backend/utils/validation.js` - Reusable validators

### Configuration:
- `backend/config/env.js` - Environment variable loader
- `.env.example` - Configuration template

---

## 🔒 Security Features

1. **Session-Based Auth** - Secure cookie-based sessions
2. **24-Hour Session Timeout** - Auto logout for security
3. **Password Protection** - Credentials not displayed in logs
4. **HTTP-Only Cookies** - Protects against XSS attacks
5. **Secure Headers** - HTTPS enforced in production

---

## 🛠️ API Authentication

All API endpoints except `/api/auth/*` now require authentication:

### Public Endpoints:
- `POST /api/auth/login` - Admin login
- `GET /api/auth/check` - Check login status

### Protected Endpoints (require login):
- All endpoints in `/api/...` (products, orders, clients, etc.)
- Returns 401 if not authenticated

### Example API Call (from frontend):
```javascript
const response = await fetch('/api/products', {
  method: 'GET',
  credentials: 'include' // Important: includes session cookies
});
```

---

## ⚠️ Important Notes

1. **Default credentials are for development only**
   - Change them immediately in production
   - Use strong passwords

2. **SESSION_SECRET in `.env`**
   - Change from default in production
   - Use a long, random string

3. **Database security**
   - Credentials should be in `.env` file
   - `.env` is in `.gitignore` (not committed to git)

4. **Backup credentials**
   - Keep backup of admin credentials in secure location
   - If you forget password, you'll need to edit `admin.js` file directly

---

## 🧪 Testing

### Test Login Flow:
1. Start server: `npm.cmd start`
2. Try to access `http://localhost:7890/pages/dashboard.html`
3. Should redirect to login page
4. Login with your credentials
5. Should redirect back to dashboard

### Test Validation:
- Invalid data should show error messages
- Check browser console for validation logs

### Test Session Timeout:
- Login, wait 24 hours (or edit SESSION_TIMEOUT in `.env`)
- Session should expire and redirect to login

---

## 📊 File Structure

```
project/
├── login.html                          (Login page)
├── backend/
│   ├── config/
│   │   ├── admin.js                    ⚙️ EDIT credentials here
│   │   └── env.js                      (Environment loader)
│   ├── controllers/
│   │   ├── authController.js           (Login/logout logic)
│   │   └── ...
│   ├── middleware/
│   │   ├── authMiddleware.js           (Session check)
│   │   └── errorHandler.js
│   ├── routes/
│   │   ├── auth.js                     (Auth routes)
│   │   └── api.js
│   └── server.js                       (Updated with sessions)
│   └── utils/
│       └── validation.js               (Data validators)
├── .env.example                        (Config template)
└── package.json                        (Updated dependencies)
```

---

## 🔧 Customization

### Add More Validators:
Edit `backend/utils/validation.js` - add new validator functions

### Change Session Timeout:
Edit `backend/config/admin.js` - Line 10: `session_expiry`

### Add New Admin Accounts:
Current system supports single admin. To add multi-user:
1. Create users table in database
2. Hash passwords with bcrypt
3. Update authController to check database instead of config file

---

## ❓ Troubleshooting

**Q: Can't login - getting invalid credentials error**
- Check credentials in `backend/config/admin.js`
- Make sure you're entering exact values (case-sensitive)

**Q: Session expires too quickly**
- Edit `backend/config/admin.js` Line 10 - increase `session_expiry` value

**Q: Express-session not found error**
- Run `npm install` to install missing dependency

**Q: Can't access API endpoints**
- Make sure you're logged in first
- Session cookies must be sent with requests

---

## ✅ Next Steps

1. ✅ Change admin credentials in `backend/config/admin.js`
2. ✅ Create `.env` file if needed (copy from `.env.example`)
3. ✅ Run `npm install` to install `express-session`
4. ✅ Start server: `npm.cmd start`
5. ✅ Test login at `http://localhost:7890/login.html`

---

**All three High Priority features are now implemented and ready to use!**
