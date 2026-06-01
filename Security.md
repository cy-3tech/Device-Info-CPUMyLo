# 🔒 CPUMyLo Security Architecture

This document outlines the security measures implemented in **CPUMyLo — Mylo AI+** to ensure data privacy, prevent code injection, and maintain a secure client-side environment.

## 1. Content Security Policy (CSP)

CPUMyLo implements a strict **Content Security Policy** via the `<meta>` tag in `index.html`. This acts as an allowlist for resources, preventing the browser from loading malicious scripts or sending data to unauthorized endpoints.

### Policy Breakdown
*   **`default-src 'self'`**: By default, only resources from the same origin (your local folder/host) are allowed.
*   **`script-src 'self' 'unsafe-inline'`**: Allows local scripts. *Note: `'unsafe-inline'` is required for the single-file architecture but is mitigated by input sanitization.*
*   **`connect-src`**: Restricts network requests to only trusted APIs:
    *   `https://api.anthropic.com` (Mylo AI+)
    *   `https://api.coingecko.com` (Crypto Prices)
    *   `wss://echo.websocket.org` (WebSocket Testing)
*   **`font-src` & `style-src`**: Allows Google Fonts and inline styles required for the cyberpunk UI.

> **Why this matters:** Even if an attacker tries to inject a script to send your private keys to a remote server, the CSP will block the connection because that domain is not in the `connect-src` allowlist.

## 2. Input Sanitization (XSS Prevention)

To prevent **Cross-Site Scripting (XSS)** attacks—where malicious code is injected into the Terminal or Chat interfaces—the application uses a dedicated sanitization helper in `script.js`.

### The `safeText()` Helper
```javascript
function safeText(text) {
  const div = document.createElement('div');
  div.textContent = text; // Browser automatically escapes HTML entities
  return div.innerHTML;
}
```

### Implementation
All user-generated content or external API responses rendered as HTML are passed through `safeText()`:
*   **Terminal Logs:** `termLog()` sanitizes commands before rendering.
*   **AI Chat:** `addAI()` sanitizes both user inputs and AI responses.
*   **Device Logs:** WebSocket, Serial, and Bluetooth logs are sanitized before display.

> **Why this matters:** If a user types `<script>alert('hacked')</script>` into the terminal, `safeText()` converts it to harmless text (`&lt;script&gt;...`), preventing execution.

## 3. Client-Side Cryptography

All cryptographic operations are performed using the native **Web Crypto API**.

*   **Key Generation:** RSA and ECDSA keys are generated in-memory using `crypto.subtle.generateKey`.
*   **Non-Extractable Keys:** Private keys are marked as `extractable: false` where possible, meaning they cannot be easily exported or stolen by malicious scripts running in the same context.
*   **No Server Storage:** No keys, passwords, or encrypted messages are ever sent to a backend server. Everything stays in your browser's memory.

## 4. Data Privacy & Permissions

CPUMyLo follows a **Zero-Knowledge** principle for hardware data:

*   **Local Processing:** CPU telemetry, memory usage, and GPU info are calculated locally.
*   **Explicit Consent:** Access to sensitive hardware (Serial Ports, Bluetooth Devices, USB) requires explicit user permission via browser prompts every time.
*   **No Tracking:** There are no analytics trackers, cookies, or fingerprinting scripts embedded in the code.

## 5. Limitations & Best Practices

While CPUMyLo is secured against common web threats, please observe the following:

1.  **Browser Trust:** The security of this app depends on the integrity of your browser. Keep Chrome/Edge/Firefox updated.
2.  **HTTPS Required:** For Web Serial, Bluetooth, and USB APIs to work, the app **must** be served over `https://` or `localhost`. Browsers block these features on insecure `http://` connections.
3.  **AI Interactions:** When using **Mylo AI+**, prompts are sent to Anthropic’s API. Do not paste highly sensitive secrets (like raw private keys) into the chat interface, as they are transmitted to the third-party AI provider.

## 6. Audit Checklist

If you wish to audit the code yourself, check these files:

| File | What to Check |
| :--- | :--- |
| `index.html` | Verify the `<meta http-equiv="Content-Security-Policy">` tag matches the documented allowlist. |
| `script.js` | Search for `innerHTML`. Ensure every instance either uses static content or wraps variables in `safeText()`. |
| `script.js` | Verify `crypto.subtle` is used for all encryption/hash operations instead of custom math. |

---

*Last Updated: June 02, 2026*
*Version: 1.0.0 (Secure Build)*
