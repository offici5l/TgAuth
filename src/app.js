import "./style.css";
import { resetBackup, sendCode, verifyCode, submitPassword, resendCode } from "./backup.js";
import { resetRecover, stopRecover, connectSession }         from "./recover.js";
import { $ }                                                  from "./utils.js";

window.switchTab = function(tab) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  $("section-"+tab).classList.add("active");
  $("tab-"+tab).classList.add("active");
  resetBackup();
  resetRecover();
};

window.sendCode       = sendCode;
window.verifyCode     = verifyCode;
window.submitPassword = submitPassword;
window.resetBackup    = resetBackup;
window.resendCode      = resendCode;
window.connectSession = connectSession;
window.stopRecover    = stopRecover;

window.copyKey = function() {
  navigator.clipboard.writeText($("result-value").textContent).then(() => {
    const btn = $("copy-key-btn");
    btn.textContent = "Copied!";
    btn.classList.add("ok");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("ok"); }, 2000);
  });
};
