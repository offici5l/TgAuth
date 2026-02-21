import { TelegramClient } from "telegram/client/TelegramClient";
import { StringSession }  from "telegram/sessions/StringSession";
import { Api }            from "telegram";
import { API_ID, API_HASH, SITE_URL, encodeKey,
         $, clr, foc, notice, clearNotice, showStep,
         setLoading, friendlyError, killClient } from "./utils.js";

let bClient        = null;
let bPhone         = "";
let bName          = "";
let bPhoneCodeHash = "";
let bAttempts      = 0;

export function resetBackup() {
  const c = bClient; bClient = null;
  killClient(c);
  bPhone = bName = bPhoneCodeHash = "";
  bAttempts = 0;
  showStep("create", "step-phone");
  ["phone","session-name","code","tg-password"].forEach(clr);
  ["n-phone","n-code","n-password"].forEach(clearNotice);
  setLoading("btn-send-code", false);
  setLoading("btn-verify",    false);
  setLoading("btn-password",  false);
  $("btn-resend").style.display = "none";
  $("result-box").classList.remove("on");
}

async function createClient() {
  const c = bClient; bClient = null;
  killClient(c);
  bClient = new TelegramClient(new StringSession(""), API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS:        true,
    deviceModel:   bName,
    systemVersion: SITE_URL,
    langCode:      "en",
  });
  await bClient.connect();
}

export async function sendCode() {
  const phone = ($("phone")?.value || "").trim();
  bName = (($("session-name")?.value || "").trim() || "My Session").slice(0, 32);

  if (!phone) {
    notice("n-phone", "Please enter your phone number with country code.", "warn");
    return;
  }

  clearNotice("n-phone");
  setLoading("btn-send-code", true);

  try {
    await createClient();

    const result = await bClient.sendCode({ apiId: API_ID, apiHash: API_HASH }, phone);
    bPhone         = phone;
    bPhoneCodeHash = result.phoneCodeHash;
    bAttempts      = 0;

    setLoading("btn-send-code", false);
    clr("code");
    clearNotice("n-code");
    $("btn-resend").style.display = "none";
    showStep("create", "step-code");
    foc("code");

  } catch (e) {
    notice("n-phone", friendlyError(e), "err");
    setLoading("btn-send-code", false);
  }
}

export async function resendCode() {
  if (!bPhone) {
    notice("n-code", "Session expired. Please start over.", "warn");
    return;
  }

  clearNotice("n-code");
  setLoading("btn-resend", true);

  try {
    if (!bClient || !bClient.connected) {
      await createClient();
    }
    const result = await bClient.sendCode({ apiId: API_ID, apiHash: API_HASH }, bPhone);
    bPhoneCodeHash = result.phoneCodeHash;
    bAttempts      = 0;

    setLoading("btn-resend", false);
    $("btn-resend").style.display = "none";
    clr("code");
    notice("n-code", "A new verification code has been sent.", "ok");
    foc("code");

  } catch (e) {
    setLoading("btn-resend", false);
    notice("n-code", friendlyError(e), "err");
  }
}

export async function verifyCode() {
  const code = ($("code")?.value || "").trim();
  if (!code) {
    notice("n-code", "Please enter the verification code.", "warn");
    return;
  }
  if (!bPhoneCodeHash) {
    notice("n-code", "Session expired. Please start over.", "warn");
    return;
  }

  clearNotice("n-code");
  setLoading("btn-verify", true);

  try {
    const result = await bClient.invoke(new Api.auth.SignIn({
      phoneNumber:   bPhone,
      phoneCodeHash: bPhoneCodeHash,
      phoneCode:     code,
    }));

    if (result instanceof Api.auth.AuthorizationSignUpRequired) {
      notice("n-code", "No Telegram account exists for this phone number.", "err");
      setLoading("btn-verify", false);
      return;
    }

    await finishSession();

  } catch (e) {
    const errId = e?.errorMessage || "";

    if (errId === "SESSION_PASSWORD_NEEDED") {
      setLoading("btn-verify", false);
      clr("tg-password");
      clearNotice("n-password");
      showStep("create", "step-password");
      foc("tg-password");
      return;
    }

    if (errId === "PHONE_CODE_INVALID") {
      bAttempts++;
      setLoading("btn-verify", false);
      clr("code"); foc("code");
      if (bAttempts >= 3) {
        notice("n-code",
          "Too many incorrect attempts. Please request a new code.",
          "err");
        $("btn-resend").style.display = "block";
      } else {
        const left = 3 - bAttempts;
        notice("n-code",
          `Incorrect code. Please try again. (${left} attempt${left !== 1 ? "s" : ""} left)`,
          "err");
      }
      return;
    }

    if (errId === "PHONE_CODE_EXPIRED") {
      setLoading("btn-verify", false);
      clr("code");
      notice("n-code", "This code has expired. Please request a new one.", "warn");
      $("btn-resend").style.display = "block";
      return;
    }

    if (errId === "AUTH_RESTART") {
      setLoading("btn-verify", false);
      notice("n-phone", "Authorization failed. Please start over.", "err");
      killClient(bClient); bClient = null;
      bPhoneCodeHash = ""; bAttempts = 0;
      showStep("create", "step-phone");
      return;
    }

    notice("n-code", friendlyError(e), "err");
    setLoading("btn-verify", false);
  }
}

export async function submitPassword() {
  const pw = $("tg-password")?.value || "";
  if (!pw) {
    notice("n-password", "Please enter your Telegram password.", "warn");
    return;
  }

  clearNotice("n-password");
  setLoading("btn-password", true);

  try {

    await bClient.signInWithPassword(
      { apiId: API_ID, apiHash: API_HASH },
      {
        password:  async () => pw,
        onError:   (e)      => { throw e; },
      }
    );

    await finishSession();

  } catch (e) {
    const errId = e?.errorMessage || "";
    const msg   = String(e?.message || "");

    if (errId === "PASSWORD_HASH_INVALID" || msg.includes("PASSWORD_HASH_INVALID")) {
      notice("n-password", "Incorrect password. Please try again.", "err");
      setLoading("btn-password", false);
      clr("tg-password"); foc("tg-password");
      return;
    }

    if (errId === "SRP_ID_INVALID" || errId === "SRP_PASSWORD_CHANGED") {
      notice("n-password", "Password verification failed. Please try again.", "err");
      setLoading("btn-password", false);
      clr("tg-password"); foc("tg-password");
      return;
    }

    if (errId === "AUTH_RESTART" || msg.includes("AUTH_RESTART")) {
      notice("n-phone", "Authorization failed. Please start over.", "err");
      resetBackup();
      showStep("create", "step-phone");
      return;
    }

    notice("n-password", friendlyError(e), "err");
    setLoading("btn-password", false);
  }
}

async function finishSession() {
  const sessionStr = bClient.session.save();
  const key        = encodeKey(sessionStr, bName);

  setLoading("btn-verify",   false);
  setLoading("btn-password", false);
  showStep("create", "step-phone");

  $("result-value").textContent = key;
  $("result-name").textContent  = bName;
  $("result-site").textContent  = SITE_URL;

  const info = $("result-info");
  if (info) {
    info.className = "result-info on";
    info.innerHTML = `Session <strong>${bName}</strong> is active. To keep it active, paste your session key in the <strong>Recover</strong> tab and press <strong>Connect</strong> periodically — based on your expiry setting in <strong>Settings → Devices → If inactive for</strong>.`;
  }

  $("result-box").classList.add("on");
  bClient = null; bPhone = ""; bPhoneCodeHash = ""; bAttempts = 0;
}
