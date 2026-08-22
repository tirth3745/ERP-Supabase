const fs = require("fs");
let appJs = fs.readFileSync("assets/js/app.js", "utf-8");

appJs = appJs.replace(/try\s*\{\s*const\s*response\s*=\s*await\s*fetch\([\x27\x22]\/api\/auth\/logout[\x27\x22][\s\S]*?\}\s*catch\s*\(err\)\s*\{\s*console\.error\([\x27\x22]Logout error:[\x27\x22],\s*err\);\s*showToast\([\x27\x22]Logout failed: [\x27\x22]\s*\+\s*err\.message,\s*[\x27\x22]error[\x27\x22]\);\s*\}/, `try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      showToast("Logged out successfully", "success", 1800);
      setTimeout(() => window.location.href = "../login.html", 300);
    } catch (err) {
      console.error("Logout error:", err);
      showToast("Logout failed: " + err.message, "error");
    }`);
fs.writeFileSync("assets/js/app.js", appJs);

