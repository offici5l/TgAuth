import { TelegramClient } from "telegram/client/TelegramClient";
import { StringSession }  from "telegram/sessions/StringSession";
import { NewMessage }     from "telegram/events/NewMessage";
import { API_ID, API_HASH, SITE_URL, decodeKey,
         $, dis, clr, esc, notice, clearNotice, showStep,
         setLoading, friendlyError, killClient } from "./utils.js";

let rClient    = null;
let feedCount  = 0;
let baselineId = 0;

export function resetRecover() {
  rClient = null;
  showStep("recover", "step-session");
  clr("session-input");
  clearNotice("n-session");
  dis("btn-connect", false);
  hideFeed();
}

export function stopRecover() {
  rClient = null;
  $("pulse").classList.add("off");
  $("feed-label").textContent = "Stopped";
  showStep("recover", "step-session");
  dis("btn-connect", false);
}

function hideFeed() {
  $("feed-box").classList.remove("on");
  $("feed-list").innerHTML = '<div class="feed-empty">Waiting for Telegram to send a code…</div>';
  $("pulse").classList.remove("off");
  $("feed-label").textContent = "Listening for messages…";
  $("feed-count").textContent = "";
  feedCount = 0; baselineId = 0;
}

function pushCard(text) {
  const list  = $("feed-list");
  const empty = list.querySelector(".feed-empty");
  if (empty) empty.remove();

  feedCount++;
  $("feed-count").textContent = `${feedCount} message${feedCount !== 1 ? "s" : ""}`;

  const codes   = [...text.matchAll(/\b(\d{5,6})\b/g)].map(m => m[1]);
  const hasCode = codes.length > 0;
  const time    = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" });

  const card = document.createElement("div");
  card.className = "msg-card" + (hasCode ? " code" : "");
  card.innerHTML = `<div class="msg-time">${time}</div><div class="msg-text">${esc(text)}</div>`;

  if (hasCode) {
    const code = codes[0];
    const row  = document.createElement("div");
    row.className = "code-row";
    row.innerHTML = `
      <span class="code-digits">${esc(code)}</span>
      <button class="copy-code" onclick="copyCode(this,'${esc(code)}')">Copy</button>
    `;
    card.appendChild(row);
  }

  list.prepend(card);
}

window.copyCode = function(btn, code) {
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "Copied!";
    btn.classList.add("ok");
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("ok"); }, 2000);
  });
};

export async function connectSession() {
  const raw = (($("session-input")?.value) || "").trim().replace(/\s+/g, "");
  if (raw.length < 20) { notice("n-session", "Please paste your complete session key.", "warn"); return; }

  const { sessionStr, name } = decodeKey(raw);
  let sess;
  try { sess = new StringSession(sessionStr); }
  catch (_) { notice("n-session", "Invalid session key. Please make sure you copied it correctly.", "err"); return; }

  clearNotice("n-session");
  setLoading("btn-connect", true);

  try {
    killClient(rClient);
    rClient = new TelegramClient(sess, API_ID, API_HASH, {
      connectionRetries: 5,
      useWSS:        true,
      deviceModel:   name,
      systemVersion: SITE_URL,
      langCode:      "en",
    });

    await rClient.connect();

    if (!await rClient.isUserAuthorized()) {
      notice("n-session", "This session has expired or been revoked. Please run a new Backup.", "err");
      rClient = null;
      setLoading("btn-connect", false);
      return;
    }

    try {
      const snap = await rClient.getMessages("777000", { limit: 1 });
      baselineId = snap[0]?.id || 0;
    } catch(_) { baselineId = 0; }

    showStep("recover", "step-live");
    $("feed-box").classList.add("on");
    setLoading("btn-connect", false);

    const cl = rClient;

    cl.addEventHandler((event) => {
      try {
        if (rClient !== cl) return;
        const msg = event.message;
        if (!msg?.text) return;
        const sid = String(msg.peerId?.userId ?? msg.fromId?.userId ?? "");
        if (sid !== "777000") return;
        if (msg.id <= baselineId) return;
        baselineId = Math.max(baselineId, msg.id);
        pushCard(msg.text);
      } catch(_) {}
    }, new NewMessage({}));

    const poll = setInterval(async () => {
      if (rClient !== cl) { clearInterval(poll); return; }
      try {
        const msgs = await rClient.getMessages("777000", { limit: 3 });
        for (const m of [...msgs].reverse()) {
          if (!m.text || m.id <= baselineId) continue;
          baselineId = Math.max(baselineId, m.id);
          pushCard(m.text);
        }
      } catch(_) {}
    }, 5000);

  } catch(e) {
    notice("n-session", friendlyError(e), "err");
    rClient = null;
    dis("btn-connect", false);
  }
}
