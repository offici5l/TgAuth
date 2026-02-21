export const API_ID   = 2040;
export const API_HASH = "b18441a1ff607e10a989891a5462e627";
export const SITE_URL = window.location.hostname +
  (window.location.port ? ":" + window.location.port : "");

export function encodeKey(sessionStr, name) {
  return btoa(unescape(encodeURIComponent(JSON.stringify({ s: sessionStr, n: name }))));
}

export function decodeKey(raw) {
  try {
    const j = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (j.s) return { sessionStr: j.s, name: j.n || "My Backup" };
  } catch (_) {}
  return { sessionStr: raw, name: "My Backup" };
}

export function $(id)      { return document.getElementById(id); }
export function dis(id, v) { const e=$(id); if(e) e.disabled=v; }
export function clr(id)    { const e=$(id); if(e) e.value=""; }
export function foc(id)    { setTimeout(()=>{ const e=$(id); if(e) e.focus(); }, 60); }
export function esc(s)     { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export function notice(id, msg, type) {
  const el = $(id);
  if (!el) return;
  el.className = `notice notice-${type} on`;
  el.innerHTML = msg;
}

export function clearNotice(id) {
  const el = $(id);
  if (!el) return;
  el.className = "notice";
  el.innerHTML = "";
}

export function showStep(section, stepId) {
  document.querySelectorAll(`#section-${section} .step`)
    .forEach(s => s.classList.remove("on"));
  const t = $(stepId);
  if (t) t.classList.add("on");

  if (section !== "create") return;
  const stepMap = { "step-phone": 1, "step-code": 2, "step-password": 3 };
  const active  = stepMap[stepId] || 1;

  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`sdot-${i}`);
    if (!dot) continue;
    dot.classList.remove("active", "done");
    if (i < active)   dot.classList.add("done");
    if (i === active) dot.classList.add("active");
  }

  for (let i = 1; i <= 2; i++) {
    const line = document.getElementById(`sline-${i}`);
    if (!line) continue;
    line.classList.toggle("done", i < active);
  }
}

export function setLoading(id, loading) {
  const el = $(id);
  if (!el) return;
  el.disabled = loading;
  if (loading) {
    el.dataset.txt = el.textContent;
    el.innerHTML = '<span class="spinner"></span>';
  } else {
    el.textContent = el.dataset.txt || el.textContent;
  }
}

export function killClient(c) {
  if (!c) return;
  try { c.disconnect(); }  catch(_) {}
  try { c._sender?.disconnect(); } catch(_) {}
}

export function friendlyError(e) {
  const errId = e?.errorMessage || "";
  const msg   = String(e?.message || e || "");

  if (errId === "PHONE_NUMBER_INVALID" || msg.includes("PHONE_NUMBER_INVALID"))
    return "Invalid phone number. Make sure to include your country code (e.g. +1234567890).";
  if (errId === "PHONE_CODE_INVALID" || msg.includes("PHONE_CODE_INVALID"))
    return "The code is incorrect. Please check and try again.";
  if (errId === "PHONE_CODE_EXPIRED" || msg.includes("PHONE_CODE_EXPIRED"))
    return "This code has expired. Please request a new one.";
  if (errId === "PASSWORD_HASH_INVALID" || msg.includes("PASSWORD_HASH_INVALID"))
    return "Incorrect password. Please try again.";
  if (errId === "AUTH_KEY_UNREGISTERED" || errId === "SESSION_REVOKED" ||
      msg.includes("AUTH_KEY_UNREGISTERED") || msg.includes("SESSION_REVOKED"))
    return "This session is no longer valid. Please run a new Backup.";
  if (errId === "USER_DEACTIVATED" || msg.includes("USER_DEACTIVATED"))
    return "This account has been deactivated.";
  if (errId === "PHONE_NUMBER_BANNED" || msg.includes("PHONE_NUMBER_BANNED"))
    return "This phone number is banned from Telegram.";
  if (errId === "PHONE_NUMBER_UNOCCUPIED" || msg.includes("PHONE_NUMBER_UNOCCUPIED"))
    return "No Telegram account found for this number.";
  if (errId === "AUTH_RESTART" || msg.includes("AUTH_RESTART"))
    return "Authorization failed. Please start over.";

  const seconds = e?.seconds ?? null;
  const isFlood = errId.startsWith("FLOOD_WAIT") ||
                  msg.includes("FLOOD_WAIT") ||
                  seconds !== null;
  if (isFlood) {
    const sec = parseInt(seconds ?? msg.match(/(\d+)/)?.[1] ?? "0", 10);
    if (sec >= 3600) {
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
      return `Too many requests. Please wait ${h}h${m ? " " + m + "m" : ""} before trying again.`;
    }
    if (sec >= 60) {
      const m = Math.floor(sec / 60), r = sec % 60;
      return `Too many requests. Please wait ${m}m${r ? " " + r + "s" : ""} before trying again.`;
    }
    if (sec > 0) return `Too many requests. Please wait ${sec}s before trying again.`;
    return "Too many requests. Please wait a moment and try again.";
  }

  if (msg.includes("NETWORK") || msg.includes("network") ||
      msg.includes("fetch") || msg.includes("WebSocket"))
    return "Network error. Please check your connection and try again.";

  if (msg && msg !== "null" && msg !== "undefined") return esc(msg);
  return "Something went wrong. Please try again.";
}
