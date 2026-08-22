/* assets/js/database.js - Express API Bridge Config */

// Pointing to empty string so that requests route relatively to the backend server
window.API_URL = ''; 

window.DB = {
  initDB: async () => {
    console.log('AgroChem ERP Database Bridge Initialized (Connected to REST API)');
    return true;
  }
};

