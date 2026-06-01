# CPUMyLo — Mylo AI+
### The Ultimate Mobile-First System Monitor, Cryptography Toolkit, and Mining Reference Hub

**CPUMyLo** is a high-performance, cyberpunk-inspired Progressive Web App (PWA) that transforms your browser into a powerful diagnostic and security workstationPowered by **Mylo AI+**, it combines real-time hardware telemetry with advanced cryptographic utilities, device connectivity, and educational mining data.

### 🚀 Key Features

#### 1. Real-Time Hardware Telemetry
*   **Live CPU Monitoring:** Visualize CPU load, frequency fluctuations, temperature estimates, and memory usage in real-time.
*   **Core Frequency Map:** Individual ring graphs for each logical CPU core, displaying live clock speeds.
*   **Performance Timeline:** Track render FPS and JavaScript heap memory to monitor app efficiency.
*   **Noise Waveform:** A unique visualizer representing system "noise" or anomaly detection indices.
*   **Hardware Detection:** Automatically identifies GPU renderer, device memory, screen resolution, and connection type.

#### 2. Advanced Cryptography Toolkit
*   **Encrypt/Decrypt:** Support for **AES-GCM**, **AES-CBC**, **RSA-OAEP**, and **ChaCha20**. Securely encrypt text with passphrases.
*   **Key Pair Generation:** Generate RSA (2048/4096-bit) and ECDSA (P-256/P-384) key pairs directly in the browser using the Web Crypto API.
*   **Hash Suite:** Compute SHA-1, SHA-256, SHA-384, SHA-512, and HMAC hashes for text and files.
*   **Sign & Verify:** Digitally sign messages using ECDSA P-256 and verify signatures to ensure data integrity.
*   **Format Converter:** Instantly convert between Base64, Hex, UTF-8, Binary, and PEM formats.

#### 3. Playground & Utilities
*   **Live Encode/Decode:** Real-time conversion for Base64, Hex, Binary, URL encoding, ROT13, Morse Code, XOR, and JWT inspection.
*   **Secure Random Generator:** Generate cryptographically secure random bytes, UUIDs v4, and keys.
*   **Certificate Inspector:** Paste PEM certificates to inspect their structure and metadata.

#### 4. Device Connectivity Lab
*   **Web Serial API:** Connect to Arduino, MCU, and UART devices directly from the browser.
*   **Web Bluetooth BLE:** Scan and connect to nearby BLE devices (wearables, sensors).
*   **WebSocket Client:** Test real-time TCP connections with custom endpoints.
*   **HTTP/API Tester:** A built-in REST client for testing GET/POST/PUT/DELETE requests with JSON support.
*   **WebUSB:** Direct access to USB device information.

#### 5. Mining Reference Hub
*   **Coin Database:** Detailed profiles for mineable cryptocurrencies (Monero, Kaspa, Flux, Raptoreum, etc.), including algorithms, difficulty, and recommended software.
*   **Profitability Calculator:** Estimate daily revenue and profit based on your hashrate, power consumption, and electricity costs.
*   **Geo-Mining Info:** Guides for location-based mining networks like Helium Mobile, DIMO, and Hivemapper.
*   *Note: This is an informational hub. It does not run actual miners in the browser to prevent malware flags and battery drain.*

#### 6. Mylo AI+ Neural Interface
*   **Context-Aware Chat:** An integrated AI assistant that knows your current CPU stats, temperature, and hardware specs. Ask questions like *"Is my CPU temp normal?"* or *"How do I mine Monero?"* and get answers based on live data.
*   **Neural Terminal:** A command-line interface (CLI) for quick system checks (`top`, `cpu`, `freq`, `scan`) and natural language processing.

### 🎨 Design & UX
*   **Cyberpunk Aesthetic:** Dark mode UI with neon accents (Cyan, Lime, Amber, Rose, Violet), scanlines, and grid backgrounds.
*   **Mobile-First:** Fully responsive design optimized for touchscreens, with a fixed bottom navigation bar and safe-area support for notched devices.
*   **Zero-Install:** Runs entirely in the browser using standard Web APIs (WebCrypto, WebSerial, WebBluetooth). No backend server required for core features.

### 🛠 Tech Stack
*   **HTML5 / CSS3:** Custom variables, Flexbox/Grid layouts, and Canvas API for high-performance graphics.
*   **Vanilla JavaScript:** No frameworks. Pure ES6+ for maximum performance and minimal bundle size.
*   **Web Crypto API:** For all encryption, hashing, and key generation tasks.
*   **Web APIs:** Serial, Bluetooth, USB, WebSocket, and Performance Observer.

***

**Disclaimer:** *CPUMyLo is a diagnostic and educational tool. While it provides accurate hardware data where APIs allow, some metrics (like CPU temperature) are simulated based on load if direct browser access is restricted by the OS.Ai Model still in process, Mining data is for reference only; always use dedicated native software for actual mining.*
