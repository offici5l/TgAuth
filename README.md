# TgAuth

**[offici5l.github.io/TgAuth](https://offici5l.github.io/TgAuth/)**

---

## Why?

When you log out of Telegram, logging back in requires a verification code sent to your phone via SMS. This becomes a problem if:

- Your number charges fees to receive SMS, and you're worried about the cost when you log back in
- You created your Telegram account with a temporary number you no longer have access to, making it impossible to receive that code

TgAuth solves this by generating a session key **before** you log out — so you can receive login codes anytime, without needing SMS.

---

## How It Works

- **Create** — Sign in with your phone number to generate a session key
- **Recover** — Paste the session key later to receive login codes in real-time, without a device or SMS

> ⚠️ The session key grants full account access. Store it securely and never share it.
