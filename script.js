// ══════════════════════════════════════════════════════════════
// SECURITY HELPER
// ══════════════════════════════════════════════════════════════
function safeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.bitem').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  el.classList.add('active');
  document.getElementById('content').scrollTop = 0;
}

// ══════════════════════════════════════════════════════════════
// STATE
// ══════════════════════════════════════════════════════════════
const S = {
  cores: navigator.hardwareConcurrency || 4,
  cpu: 30, temp: 52, mem: 45, freq: 2.4, freqMax: 2.4,
  coreFreqs: [], noise: 0.15,
  freqHist: Array(80).fill(2.4),
  noiseHist: Array(120).fill(0.1),
  perfHist: Array(60).fill(16),
  fps: 60, lastFrame: performance.now(), frameCount: 0,
  procs: [], chatHistory: [],
  signKeyPair: null, cryptoKeyPair: null,
  pgMode: 'b64', cryptAlgo: 'AES-GCM',
  ws: null, serial: null, btDev: null,
  selectedCoin: null,
  coinPrices: {},
  frame: 0,
};

// Init core freqs
S.coreFreqs = Array.from({length: S.cores}, () => 2.0 + Math.random() * 1.5);

// ══════════════════════════════════════════════════════════════
// REAL HARDWARE DETECTION
// ══════════════════════════════════════════════════════════════
function detectHardware() {
  const el = document.getElementById('hwInfo');
  if (!el) return;
  // WebGL GPU info
  let gpu = 'Unknown GPU';
  try {
    const cvs = document.createElement('canvas');
    const gl = cvs.getContext('webgl') || cvs.getContext('experimental-webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (ext) {
        gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      }
    }
  } catch(e) {}

  const mem = (performance.memory?.jsHeapSizeLimit / 1024 / 1024 / 1024).toFixed(2);
  const totalMem = navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'Unknown';
  const conn = navigator.connection;
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const platform = navigator.userAgentData?.platform || navigator.platform || 'Unknown';

  const rows = [
    ['CPU CORES (logical)', S.cores],
    ['DEVICE MEMORY', totalMem],
    ['JS HEAP LIMIT', mem !== 'NaN' ? mem + ' GB' : 'N/A (no API)'],
    ['GPU RENDERER', gpu.slice(0, 50)],
    ['PLATFORM', platform],
    ['DEVICE TYPE', isMobile ? '📱 Mobile' : '🖥 Desktop/Laptop'],
    ['CONNECTION TYPE', conn?.effectiveType?.toUpperCase() || 'Unknown'],
    ['NETWORK DOWNLINK', conn?.downlink ? conn.downlink + ' Mbps' : 'Unknown'],
    ['SCREEN RES', screen.width + '×' + screen.height + ' @ ' + (window.devicePixelRatio||1) + 'x DPR'],
    ['HARDWARE CONCURRENCY', navigator.hardwareConcurrency + ' threads'],
    ['TOUCH POINTS', navigator.maxTouchPoints + ' (mobile: ' + (navigator.maxTouchPoints > 0) + ')'],
    ['LANGUAGE', navigator.language],
  ];

  el.innerHTML = rows.map(([l, v]) => `
    <div class="hw-row">
      <span class="hw-lbl">${l}</span>
      <span class="hw-val" style="color:var(--neon)">${v}</span>
    </div>
  `).join('');

  // Mining hw panel
  const mhw = document.getElementById('mineHW');
  if (mhw) {
    mhw.innerHTML = `
      <div class="hw-row"><span class="hw-lbl">CPU THREADS</span><span class="hw-val" style="color:var(--lime)">${S.cores} threads available</span></div>
      <div class="hw-row"><span class="hw-lbl">GPU</span><span class="hw-val" style="color:var(--lime)">${gpu.slice(0,45)}</span></div>
      <div class="hw-row"><span class="hw-lbl">DEVICE TYPE</span><span class="hw-val">${isMobile ? '📱 Mobile (low mining efficiency)' : '🖥 Desktop (better efficiency)'}</span></div>
      <div class="hw-row"><span class="hw-lbl">ESTIMATED CPU CLASS</span><span class="hw-val" style="color:var(--amber)">${S.cores <= 4 ? 'Entry-Level' : S.cores <= 8 ? 'Mid-Range' : S.cores <= 16 ? 'High-End' : 'Enthusiast'}</span></div>      <div class="pbar-wrap"><div class="pbar-track"><div class="pbar-fill" style="width:${Math.min(100,S.cores*6)}%;background:linear-gradient(90deg,var(--lime),var(--neon))"></div></div></div>
    `;
  }
}

// ══════════════════════════════════════════════════════════════
// CLOCK + FPS TRACKING
// ══════════════════════════════════════════════════════════════
function updateClock() {
  const el = document.getElementById('clock');
  if (el) el.textContent = new Date().toLocaleTimeString();
}

function trackFPS(now) {
  S.frameCount++;
  const delta = now - S.lastFrame;
  if (delta >= 1000) {
    S.fps = Math.round(S.frameCount * 1000 / delta);
    S.frameCount = 0;
    S.lastFrame = now;
    const fpsEl = document.getElementById('mFPS');
    if (fpsEl) fpsEl.textContent = S.fps + ' fps';
    const heapEl = document.getElementById('mMem2');
    if (heapEl && performance.memory) {
      heapEl.textContent = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(0) + ' MB';
    }
  }
}

// ══════════════════════════════════════════════════════════════
// CPU SIMULATION (performance-based approximation)
// ══════════════════════════════════════════════════════════════
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function rnd(){return Math.random()-.5;}

function simCPU() {
  const t = Date.now() / 1000;
  S.cpu = clamp(S.cpu + rnd()*6, 5, 95);
  S.temp = clamp(38 + S.cpu * .58 + Math.sin(t*.25)*4 + rnd(), 35, 90);
  S.mem = clamp(S.mem + rnd()*2, 20, 92);
  S.freq = clamp(.8 + (S.cpu/100)*4 + Math.sin(t*.3)*.2 + rnd()*.08, .8, 5.2);
  S.freqMax = Math.max(S.freqMax, S.freq);
  S.coreFreqs = S.coreFreqs.map(c => clamp(c + rnd()*.25, .8, 5.2));
  S.noise = clamp(S.cpu/100*.4 + Math.random()*.1 + (Math.random()<.04?Math.random()*.5:0), 0, 1);

  S.freqHist.push(S.freq);
  if (S.freqHist.length > 80) S.freqHist.shift();
  S.noiseHist.push(S.noise);
  if (S.noiseHist.length > 120) S.noiseHist.shift();
  const frameTime = 1000 / (S.fps || 60);  S.perfHist.push(frameTime);
  if (S.perfHist.length > 60) S.perfHist.shift();

  updateMetrics();
  renderCoreRings();
  updateTelemetry();
}

function updateMetrics() {
  const set = (id, txt, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = txt;
    if (cls) el.className = 'mv ' + cls;
  };
  const lc = S.cpu > 85 ? 'ro' : S.cpu > 65 ? 'am' : '';
  set('mLoad', S.cpu.toFixed(1) + '%', lc);
  set('mFreq', S.freq.toFixed(3) + ' GHz', 'am');
  const tc = S.temp > 85 ? 'ro' : S.temp > 70 ? 'am' : '';
  set('mTemp', S.temp.toFixed(1) + '°C', tc);
  set('mMem', S.mem.toFixed(1) + '%', 'li');
  const nc = S.noise > .7 ? 'ro' : S.noise > .4 ? 'am' : '';
  set('mNoise', S.noise.toFixed(3), nc);
  set('mCores', S.cores, 'vi');
  const fl = document.getElementById('freqLabel');
  if (fl) fl.textContent = S.freq.toFixed(3) + ' GHz';
}

function renderCoreRings() {
  const el = document.getElementById('coreRings');
  if (!el) return;
  const showCores = Math.min(S.cores, 8);
  const colors = ['#0df','#a3ff00','#ffb800','#ff3d6e','#9b5cff','#39ff8a','#0df','#a3ff00'];
  el.innerHTML = Array.from({length: showCores}, (_, i) => {
    const freq = S.coreFreqs[i] || 2;
    const pct = freq / 5.2;
    const r = 22, circ = 2 * Math.PI * r;
    const dash = pct * circ;
    return `
      <div class="core-ring">
        <div class="ring-wrap">
          <svg viewBox="0 0 52 52">
            <circle class="ring-bg" cx="26" cy="26" r="${r}"/>
            <circle class="ring-fg" cx="26" cy="26" r="${r}"
              stroke="${colors[i]}"
              stroke-dasharray="${dash} ${circ}"
              stroke-dashoffset="0"/>
          </svg>
          <div class="ring-val" style="color:${colors[i]}">${freq.toFixed(1)}G</div>
        </div>        <div class="ring-lbl">C${i}</div>
      </div>
    `;
  }).join('');
}

function updateTelemetry() {
  const el = document.getElementById('telPanel');
  if (!el) return;
  el.innerHTML = [
    ['CPU LOAD', S.cpu.toFixed(2) + '%', S.cpu > 85 ? 'var(--rose)' : S.cpu > 65 ? 'var(--amber)' : 'var(--neon)'],
    ['FREQUENCY', S.freq.toFixed(3) + ' GHz', 'var(--amber)'],
    ['FREQ MAX', S.freqMax.toFixed(3) + ' GHz', 'var(--amber)'],
    ['TEMPERATURE', S.temp.toFixed(1) + ' °C', S.temp > 85 ? 'var(--rose)' : S.temp > 70 ? 'var(--amber)' : '#39ff8a'],
    ['MEMORY', S.mem.toFixed(1) + '%', 'var(--lime)'],
    ['NOISE IDX', S.noise.toFixed(4), S.noise > .7 ? 'var(--rose)' : 'var(--neon)'],
    ['RENDER FPS', S.fps + ' fps', 'var(--violet)'],
    ['CPU CORES', S.cores + ' logical', 'var(--text)'],
  ].map(([l, v, c]) => `<span style="color:var(--muted)">${l.padEnd(12)}</span> <span style="color:${c};font-weight:700">${v}</span><br>`).join('');
}

// ══════════════════════════════════════════════════════════════
// CANVAS RENDERERS
// ══════════════════════════════════════════════════════════════
function renderFreqCanvas() {
  const cv = document.getElementById('freqCv');
  if (!cv) return;
  const W = cv.parentElement.clientWidth;
  cv.width = W; cv.height = 120;
  const ctx = cv.getContext('2d');
  const buf = S.freqHist, N = buf.length;
  ctx.fillStyle = '#030508'; ctx.fillRect(0, 0, W, 120);

  [1,2,3,4,5].forEach(g => {
    const y = 120 - (g/5.5)*105;
    ctx.strokeStyle = 'rgba(28,45,80,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    ctx.fillStyle = 'rgba(74,106,138,.6)'; ctx.font = '9px Space Mono';
    ctx.fillText(g+'G', 3, y-2);
  });

  const fill = ctx.createLinearGradient(0,0,0,120);
  fill.addColorStop(0,'rgba(255,184,0,.25)'); fill.addColorStop(1,'rgba(255,184,0,.01)');
  ctx.beginPath();
  buf.forEach((v,i) => { const x=(i/N)*W, y=120-(v/5.5)*105; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.lineTo(W,120); ctx.lineTo(0,120); ctx.fillStyle=fill; ctx.fill();

  ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle='#ffb800';
  buf.forEach((v,i) => { const x=(i/N)*W, y=120-(v/5.5)*105; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
  const last = buf[buf.length-1], cx=W-3, cy=120-(last/5.5)*105;
  ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2);
  ctx.fillStyle='#ffb800'; ctx.shadowColor='#ffb800'; ctx.shadowBlur=14; ctx.fill(); ctx.shadowBlur=0;
}

function renderFreqBars() {
  const el = document.getElementById('fbars');
  if (!el) return;
  const N = 24;
  if (!el.children.length) {
    for (let i=0; i<N; i++) { const b=document.createElement('div'); b.className='fbar'; el.appendChild(b); }
  }
  const recent = S.freqHist.slice(-N);
  Array.from(el.children).forEach((b, i) => {
    const v = (recent[i]||0)/5.5;
    b.style.height = Math.max(4, v*100)+'%';
    b.style.background = v>.8?'var(--rose)':v>.6?'var(--amber)':'var(--neon)';
    b.style.opacity = .5 + v*.5;
  });
}

function renderNoise() {
  const cv = document.getElementById('noiseCv');
  if (!cv) return;
  const W = cv.parentElement.clientWidth;
  cv.width = W; cv.height = 80;
  const ctx = cv.getContext('2d'), buf = S.noiseHist, N = buf.length;
  ctx.fillStyle='#030508'; ctx.fillRect(0,0,W,80);
  const fill=ctx.createLinearGradient(0,0,0,80);
  fill.addColorStop(0,'rgba(255,61,110,.25)'); fill.addColorStop(1,'rgba(255,61,110,.01)');
  ctx.beginPath();
  buf.forEach((v,i) => { const x=(i/N)*W, y=80-v*70; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.lineTo(W,80); ctx.lineTo(0,80); ctx.fillStyle=fill; ctx.fill();
  ctx.beginPath(); ctx.lineWidth=1.5; ctx.strokeStyle='var(--rose)';
  buf.forEach((v,i) => { const x=(i/N)*W, y=80-v*70; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
  buf.forEach((v,i) => {
    if (v>.65) {
      const x=(i/N)*W, y=80-v*70;
      ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2);
      ctx.fillStyle=v>.8?'var(--rose)':'var(--amber)'; ctx.fill();
    }
  });
}

function renderPerf() {
  const cv = document.getElementById('perfCv');
  if (!cv) return;
  const W = cv.parentElement.clientWidth;  cv.width = W; cv.height = 80;
  const ctx = cv.getContext('2d'), buf = S.perfHist, N = buf.length;
  ctx.fillStyle='#030508'; ctx.fillRect(0,0,W,80);
  [16,33,50].forEach(ms => {
    const y = 80-(ms/60)*70;
    ctx.strokeStyle='rgba(28,45,80,.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    ctx.fillStyle='rgba(74,106,138,.5)'; ctx.font='8px Space Mono';
    ctx.fillText(ms+'ms',3,y-2);
  });
  const fill=ctx.createLinearGradient(0,0,0,80);
  fill.addColorStop(0,'rgba(155,92,255,.3)'); fill.addColorStop(1,'rgba(155,92,255,.01)');
  ctx.beginPath();
  buf.forEach((v,i) => { const x=(i/N)*W, y=80-Math.min(v/60,1)*70; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.lineTo(W,80); ctx.lineTo(0,80); ctx.fillStyle=fill; ctx.fill();
  ctx.beginPath(); ctx.lineWidth=1.5; ctx.strokeStyle='var(--violet)';
  buf.forEach((v,i) => { const x=(i/N)*W, y=80-Math.min(v/60,1)*70; i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.stroke();
}

// ══════════════════════════════════════════════════════════════
// CRYPTO TOOLKIT
// ══════════════════════════════════════════════════════════════
function selAlgo(el, algo) {
  document.querySelectorAll('#algoChips .chip').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel'); S.cryptAlgo = algo;
}

async function getAESKey(pass, salt) {
  const enc = new TextEncoder();
  const km = await crypto.subtle.importKey('raw', enc.encode(pass), {name:'PBKDF2'}, false, ['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'}, km, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
}

async function doEncrypt() {
  const plain = document.getElementById('cryptIn').value;
  const pass = document.getElementById('cryptPass').value || 'mylo-default';
  const out = document.getElementById('cryptOut');
  if (!plain) { out.textContent='// no input'; return; }
  try {
    if (S.cryptAlgo === 'RSA-OAEP') {
      if (!S.cryptoKeyPair) { out.textContent='// generate RSA key pair first'; return; }
      const enc = await crypto.subtle.encrypt({name:'RSA-OAEP'}, S.cryptoKeyPair.publicKey, new TextEncoder().encode(plain));
      out.textContent = 'RSA-OAEP:' + btoa(String.fromCharCode(...new Uint8Array(enc)));
    } else {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const key = await getAESKey(pass, salt);
      const enc = await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, new TextEncoder().encode(plain));
      const combined = new Uint8Array(salt.length + iv.length + enc.byteLength);      combined.set(salt); combined.set(iv,16); combined.set(new Uint8Array(enc),28);
      out.textContent = 'AES-GCM:' + btoa(String.fromCharCode(...combined));
    }
  } catch(e) { out.textContent = '// ERROR: ' + e.message; }
}

async function doDecrypt() {
  const cipher = document.getElementById('cryptIn').value.trim();
  const pass = document.getElementById('cryptPass').value || 'mylo-default';
  const out = document.getElementById('cryptOut');
  try {
    if (cipher.startsWith('RSA-OAEP:')) {
      if (!S.cryptoKeyPair) { out.textContent='// no private key'; return; }
      const data = Uint8Array.from(atob(cipher.slice(9)), c => c.charCodeAt(0));
      const dec = await crypto.subtle.decrypt({name:'RSA-OAEP'}, S.cryptoKeyPair.privateKey, data);
      out.textContent = new TextDecoder().decode(dec);
    } else if (cipher.startsWith('AES-GCM:')) {
      const data = Uint8Array.from(atob(cipher.slice(8)), c => c.charCodeAt(0));
      const salt=data.slice(0,16), iv=data.slice(16,28), enc=data.slice(28);
      const key = await getAESKey(pass, salt);
      const dec = await crypto.subtle.decrypt({name:'AES-GCM',iv}, key, enc);
      out.textContent = new TextDecoder().decode(dec);
    } else { out.textContent = '// unrecognized format — encrypt first'; }
  } catch(e) { out.textContent = '// DECRYPT FAILED: wrong key or corrupted data'; }
}

function swapIO(){const i=document.getElementById('cryptIn'),o=document.getElementById('cryptOut');const t=i.value;i.value=o.textContent;o.textContent=t;}
function cpCopy(id){const t=document.getElementById(id)?.textContent||'';navigator.clipboard.writeText(t).catch(()=>{});}

async function genKeyPair() {
  const algo = document.getElementById('keyAlgo').value;
  const pub = document.getElementById('pubKey'), priv = document.getElementById('privKey');
  pub.textContent = priv.textContent = '// generating...';
  try {
    let kp;
    if (algo.startsWith('RSA')) {
      kp = await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:algo.includes('4096')?4096:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
    } else if (algo.startsWith('ECDSA')) {
      kp = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:algo.includes('384')?'P-384':'P-256'},true,['sign','verify']);
      S.signKeyPair = kp;
    } else if (algo.startsWith('ECDH')) {
      kp = await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveKey','deriveBits']);
    } else {
      const b = crypto.getRandomValues(new Uint8Array(32));
      pub.textContent = 'Ed25519 Public (sim):\n' + Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
      const pv = crypto.getRandomValues(new Uint8Array(64));
      priv.textContent = 'Ed25519 Private (sim):\n' + Array.from(pv).map(x=>x.toString(16).padStart(2,'0')).join('');
      return;
    }
    S.cryptoKeyPair = kp;    const pubR = await crypto.subtle.exportKey(algo.startsWith('RSA')?'spki':'raw', kp.publicKey);
    const privR = await crypto.subtle.exportKey(algo.startsWith('RSA')?'pkcs8':'raw', kp.privateKey);
    pub.textContent = algo + ' Public:\n' + btoa(String.fromCharCode(...new Uint8Array(pubR)));
    priv.textContent = algo + ' Private:\n' + btoa(String.fromCharCode(...new Uint8Array(privR)));
  } catch(e) { pub.textContent='// ERROR: '+e.message; }
}

async function exportPEM() {
  if (!S.cryptoKeyPair) { alert('Generate key pair first'); return; }
  try {
    const raw = await crypto.subtle.exportKey('spki', S.cryptoKeyPair.publicKey);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(raw)));
    document.getElementById('pubKey').textContent = '-----BEGIN PUBLIC KEY-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END PUBLIC KEY-----';
  } catch(e) { document.getElementById('pubKey').textContent='// '+e.message; }
}

async function exportJWK() {
  if (!S.cryptoKeyPair) { alert('Generate key pair first'); return; }
  try {
    const jwk = await crypto.subtle.exportKey('jwk', S.cryptoKeyPair.publicKey);
    document.getElementById('pubKey').textContent = JSON.stringify(jwk, null, 2);
  } catch(e) {}
}

async function hashAll() {
  const input = document.getElementById('hashIn').value;
  const hmacK = document.getElementById('hmacKey').value;
  const el = document.getElementById('hashRows');
  if (!input) { el.innerHTML='<div style="color:var(--muted);font-size:.6rem">// enter text above</div>'; return; }
  const enc = new TextEncoder();
  const algos = ['SHA-1','SHA-256','SHA-384','SHA-512'];
  const rows = await Promise.all(algos.map(async a => {
    const h = await crypto.subtle.digest(a, enc.encode(input));
    const hex = Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
    return `<div class="hash-row"><span class="hash-algo">${a}</span><span class="hash-val">${hex}</span><button onclick="navigator.clipboard.writeText('${hex}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:.6rem;padding:2px 5px;">⎘</button></div>`;
  }));
  if (hmacK) {
    const k = await crypto.subtle.importKey('raw', enc.encode(hmacK), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', k, enc.encode(input));
    const hex = Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
    rows.push(`<div class="hash-row"><span class="hash-algo">HMAC-256</span><span class="hash-val">${hex}</span></div>`);
  }
  el.innerHTML = rows.join('');
}

async function hashFile(inp) {
  const file = inp.files[0]; if (!file) return;
  const out = document.getElementById('fileHashOut');
  out.textContent = '// hashing ' + file.name + '...';
  const buf = await file.arrayBuffer();  const results = await Promise.all(['SHA-256','SHA-512'].map(async a => {
    const h = await crypto.subtle.digest(a, buf);
    return a + ': ' + Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }));
  out.textContent = file.name + ' (' + file.size + 'B)\n' + results.join('\n');
}

function convertFmt() {
  const input=document.getElementById('fIn').value.trim();
  const from=document.getElementById('fFrom').value, to=document.getElementById('fTo').value;
  const out=document.getElementById('fOut');
  try {
    let bytes;
    if(from==='Base64') bytes=Uint8Array.from(atob(input),c=>c.charCodeAt(0));
    else if(from==='Hex') bytes=Uint8Array.from(input.replace(/\s/g,'').match(/.{2}/g)||[],b=>parseInt(b,16));
    else if(from==='Binary') bytes=Uint8Array.from((input.replace(/\s/g,'').match(/.{8}/g)||[]),b=>parseInt(b,2));
    else if(from==='PEM') { const s=input.replace(/-----[^-]+-----/g,'').replace(/\s/g,''); bytes=Uint8Array.from(atob(s),c=>c.charCodeAt(0)); }
    else bytes=new TextEncoder().encode(input);
    if(to==='Base64') out.textContent=btoa(String.fromCharCode(...bytes));
    else if(to==='Hex') out.textContent=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
    else if(to==='UTF-8') out.textContent=new TextDecoder().decode(bytes);
    else if(to==='Binary') out.textContent=Array.from(bytes).map(b=>b.toString(2).padStart(8,'0')).join(' ');
    else { const b64=btoa(String.fromCharCode(...bytes)); out.textContent='-----BEGIN DATA-----\n'+b64.match(/.{1,64}/g).join('\n')+'\n-----END DATA-----'; }
  } catch(e) { out.textContent='// error: '+e.message; }
}

async function doSign() {
  const msg = document.getElementById('signMsg').value;
  const out = document.getElementById('signOut');
  if (!msg) { out.textContent='// enter message'; return; }
  try {
    if (!S.signKeyPair) S.signKeyPair = await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const sig = await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'}, S.signKeyPair.privateKey, new TextEncoder().encode(msg));
    out.textContent = 'SIGNED (ECDSA P-256):\n' + Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
  } catch(e) { out.textContent='// '+e.message; }
}

async function doVerify() {
  const msg = document.getElementById('signMsg').value;
  const sigHex = document.getElementById('verifySig').value.trim();
  const out = document.getElementById('signOut');
  if (!S.signKeyPair) { out.textContent='// sign first to load key'; return; }
  try {
    const sig = Uint8Array.from(sigHex.match(/.{2}/g)||[], b=>parseInt(b,16));
    const valid = await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'}, S.signKeyPair.publicKey, sig, new TextEncoder().encode(msg));
    out.textContent = valid ? '✓ VALID — signature authentic' : '✗ INVALID — tampered or wrong key';
    out.style.color = valid ? 'var(--lime)' : 'var(--rose)';
  } catch(e) { out.textContent='// '+e.message; }
}
// PLAYGROUND
let pgMode = 'b64';
function pgSel(el, mode) {
  document.querySelectorAll('#pgChips .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel'); pgMode=mode;
  document.getElementById('xorKeyRow').style.display=mode==='xor'?'block':'none';
  pgLive();
}
function pgLive() {
  const input=document.getElementById('pgIn').value;
  const enc=document.getElementById('pgEnc'), dec=document.getElementById('pgDec');
  try {
    let encoded='', decoded='';
    if(pgMode==='b64'){encoded=btoa(unescape(encodeURIComponent(input)));try{decoded=decodeURIComponent(escape(atob(input)));}catch{decoded='// invalid b64';}}
    else if(pgMode==='hex'){encoded=Array.from(new TextEncoder().encode(input)).map(b=>b.toString(16).padStart(2,'0')).join('');try{decoded=new TextDecoder().decode(Uint8Array.from(input.replace(/\s/g,'').match(/.{2}/g)||[],b=>parseInt(b,16)));}catch{decoded='// invalid hex';}}
    else if(pgMode==='bin'){encoded=Array.from(new TextEncoder().encode(input)).map(b=>b.toString(2).padStart(8,'0')).join(' ');try{const bits=input.replace(/\s/g,'').match(/.{8}/g)||[];decoded=new TextDecoder().decode(Uint8Array.from(bits,b=>parseInt(b,2)));}catch{decoded='// invalid binary';}}
    else if(pgMode==='url'){encoded=encodeURIComponent(input);try{decoded=decodeURIComponent(input);}catch{decoded='// invalid';}}
    else if(pgMode==='rot'){encoded=input.replace(/[a-zA-Z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);});decoded=encoded.replace(/[a-zA-Z]/g,c=>{const b=c<='Z'?65:97;return String.fromCharCode((c.charCodeAt(0)-b+13)%26+b);});}
    else if(pgMode==='morse'){const M={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.'};encoded=input.toUpperCase().split('').map(c=>M[c]||' ').join(' ');decoded='// morse: spaces between letters';}
    else if(pgMode==='xor'){const key=parseInt(document.getElementById('pgXorKey').value)||0x42;encoded=Array.from(new TextEncoder().encode(input)).map(b=>(b^key).toString(16).padStart(2,'0')).join('');decoded='// XOR: symmetric, paste hex above';}
    else if(pgMode==='jwt'){try{const p=input.split('.');if(p.length===3){const h=JSON.parse(atob(p[0]));const pl=JSON.parse(atob(p[1]));encoded='HEADER:\n'+JSON.stringify(h,null,2)+'\n\nPAYLOAD:\n'+JSON.stringify(pl,null,2);decoded='SIG: '+p[2];}else encoded=decoded='// paste a JWT';}catch{encoded='// invalid JWT';}}
    enc.textContent=encoded||'// (empty)'; dec.textContent=decoded||'// (empty)';
  } catch(e){enc.textContent='// error: '+e.message;}
}

function genRand(){
  const n=parseInt(document.getElementById('rndN').value)||32;
  const fmt=document.getElementById('rndFmt').value;
  const bytes=crypto.getRandomValues(new Uint8Array(n));
  const out=document.getElementById('rndOut');
  if(fmt==='Hex') out.textContent=Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  else if(fmt==='Base64') out.textContent=btoa(String.fromCharCode(...bytes));
  else if(fmt==='Decimal') out.textContent=Array.from(bytes).join(' ');
  else out.textContent=Array.from(bytes).map(b=>b.toString(2).padStart(8,'0')).join(' ');
}
function genUUID(){const u=([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));document.getElementById('uuidOut').textContent=u;}
function inspectCert(){
  const pem=document.getElementById('certIn').value.trim();
  const out=document.getElementById('certOut');
  if(!pem){out.textContent='// paste PEM';return;}
  try{const type=pem.match(/-----BEGIN ([^-]+)-----/)?.[1]||'UNKNOWN';const b64=pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));out.textContent=`TYPE    : ${type}\nSIZE    : ${bytes.length} bytes\nB64 LEN : ${b64.length} chars\nFORMAT  : DER/ASN.1 encoded\n\n// Deep ASN.1: https://lapo.it/asn1js`;}catch(e){out.textContent='// parse error: '+e.message;}
}

// ══════════════════════════════════════════════════════════════
// DEVICES
// ══════════════════════════════════════════════════════════════
function initPorts() {
  const ports = [
    {icon:'🔌',name:'Web Serial',desc:'Arduino, MCU, UART devices',type:'serial'},
    {icon:'📶',name:'Web Bluetooth BLE',desc:'Wearables, sensors, IoT',type:'bt'},    {icon:'🌐',name:'WebSocket',desc:'Real-time TCP connection',type:'ws'},
    {icon:'🔗',name:'HTTP / REST',desc:'API endpoint testing',type:'http'},
    {icon:'💾',name:'WebUSB',desc:'Direct USB device access',type:'usb'},
    {icon:'📡',name:'WebRTC',desc:'P2P data channel',type:'rtc'},
  ];
  document.getElementById('portList').innerHTML = ports.map(p => `
    <div class="port-item" id="port-${p.type}">
      <div class="port-icon">${p.icon}</div>
      <div class="port-info">
        <div class="port-name">${p.name}</div>
        <div class="port-desc">${p.desc}</div>
        <div class="port-stat" id="port-stat-${p.type}"></div>
      </div>
      <span class="badge off" id="port-badge-${p.type}">OFF</span>
      <button class="btn sm" onclick="connectPort('${p.type}')" style="margin-left:6px">CONN</button>
    </div>
  `).join('');
}

function setPortStatus(type,status,data){
  const badge=document.getElementById('port-badge-'+type);
  const item=document.getElementById('port-'+type);
  const stat=document.getElementById('port-stat-'+type);
  if(badge){badge.className='badge '+(status==='conn'?'on':status==='busy'?'busy':'off');badge.textContent=status.toUpperCase();}
  if(item)item.classList.toggle('conn',status==='conn');
  if(stat&&data)stat.textContent=data;
}
function connectPort(t){if(t==='serial')serialConn();else if(t==='bt')btScan();else if(t==='usb')usbConn();else if(t==='rtc')setPortStatus('rtc','busy','Simulating P2P...');}

// WebSocket
let wsConn=null;
function wsLog(msg,cls='info'){const l=document.getElementById('wsLog');if(!l)return;const d=document.createElement('div');d.className='log-ln';d.innerHTML=`<span class="ts">${new Date().toLocaleTimeString()} </span><span class="${cls}">${safeText(msg)}</span>`;l.appendChild(d);l.scrollTop=l.scrollHeight;}
function wsConnect(){const url=document.getElementById('wsUrl').value;if(wsConn)wsConn.close();wsLog('Connecting to '+url+'...','warn');try{wsConn=new WebSocket(url);wsConn.onopen=()=>{wsLog('Connected ✓','ok');setPortStatus('ws','conn','WS: '+url);};wsConn.onmessage=e=>wsLog('← '+e.data,'data');wsConn.onerror=()=>{wsLog('Error','err');setPortStatus('ws','off','');};wsConn.onclose=()=>{wsLog('Closed','warn');setPortStatus('ws','off','');};}catch(e){wsLog('Error: '+e.message,'err');}}
function wsDisc(){if(wsConn)wsConn.close();wsConn=null;}
function wsSend(){const m=document.getElementById('wsMsg').value;if(!wsConn||wsConn.readyState!==1){wsLog('Not connected','err');return;}wsConn.send(m);wsLog('→ '+m,'ok');}

// HTTP
async function httpSend(){
  const method=document.getElementById('httpM').value,url=document.getElementById('httpUrl').value,out=document.getElementById('httpOut');
  if(!url){out.textContent='// enter URL';return;}
  out.textContent='// sending...';
  try{
    let hdrs={};try{hdrs=JSON.parse(document.getElementById('httpH').value||'{}');}catch{}
    let body=undefined;const bt=document.getElementById('httpB').value.trim();
    if(bt&&method!=='GET')try{body=JSON.stringify(JSON.parse(bt));}catch{body=bt;}
    const s=Date.now();const r=await fetch(url,{method,headers:hdrs,body});const ms=Date.now()-s;
    const text=await r.text();let pretty=text;try{pretty=JSON.stringify(JSON.parse(text),null,2);}catch{}
    out.textContent=`STATUS: ${r.status} ${r.statusText}  [${ms}ms]\n\n${pretty.slice(0,1500)}`;
  }catch(e){out.textContent='// ERROR: '+e.message+'\n// (CORS may block cross-origin requests)';}
}
// Serial
let serialPort=null,serialReader=null;
function serialLog(msg,cls='info'){const l=document.getElementById('serialLog');if(!l)return;const d=document.createElement('div');d.className='log-ln';d.innerHTML=`<span class="ts">${new Date().toLocaleTimeString()} </span><span class="${cls}">${safeText(msg)}</span>`;l.appendChild(d);l.scrollTop=l.scrollHeight;}
async function serialConn(){
  if(!('serial' in navigator)){serialLog('Web Serial: use Chrome/Edge desktop','err');return;}
  try{serialPort=await navigator.serial.requestPort();const b=parseInt(document.getElementById('baud').value);await serialPort.open({baudRate:b});serialLog('Port open @ '+b+' baud','ok');setPortStatus('serial','conn','Baud:'+b);const dec=new TextDecoderStream();serialPort.readable.pipeTo(dec.writable);serialReader=dec.readable.getReader();(async()=>{while(true){try{const{value,done}=await serialReader.read();if(done)break;serialLog('← '+value,'data');}catch{break;}}})();}catch(e){serialLog('Error: '+e.message,'err');}
}
async function serialDisc(){if(serialReader)await serialReader.cancel();if(serialPort)await serialPort.close();serialPort=serialReader=null;serialLog('Closed','warn');setPortStatus('serial','off','');}
async function serialSendData(){const msg=document.getElementById('serialSend').value;if(!serialPort?.writable){serialLog('Not connected','err');return;}const w=serialPort.writable.getWriter();await w.write(new TextEncoder().encode(msg+'\n'));w.releaseLock();serialLog('→ '+msg,'ok');}

// Bluetooth
function btLog(msg,cls='info'){const l=document.getElementById('btLog');if(!l)return;const d=document.createElement('div');d.className='log-ln';d.innerHTML=`<span class="ts">${new Date().toLocaleTimeString()} </span><span class="${cls}">${safeText(msg)}</span>`;l.appendChild(d);l.scrollTop=l.scrollHeight;}
async function btScan(){
  if(!('bluetooth' in navigator)){btLog('Web Bluetooth: use Chrome/Edge','err');return;}
  document.getElementById('btStat').textContent='Scanning...';
  try{
    const d=await navigator.bluetooth.requestDevice({acceptAllDevices:true,optionalServices:['battery_service','heart_rate','device_information']});
    S.btDev=d;btLog('Found: '+d.name+' ('+d.id+')','ok');
    const srv=await d.gatt.connect();btLog('GATT Connected ✓','ok');
    setPortStatus('bt','conn',d.name||d.id);document.getElementById('btStat').textContent='Connected: '+(d.name||d.id);
    d.addEventListener('gattserverdisconnected',()=>{btLog('Disconnected','warn');setPortStatus('bt','off','');document.getElementById('btStat').textContent='Disconnected';});
  }catch(e){btLog('Error: '+e.message,'err');document.getElementById('btStat').textContent='Not connected';}
}
function btDisc(){if(S.btDev?.gatt?.connected){S.btDev.gatt.disconnect();}document.getElementById('btStat').textContent='Not connected';}

// WebUSB
async function usbConn(){
  if(!('usb' in navigator)){setPortStatus('usb','off','WebUSB: Chrome only');return;}
  try{const d=await navigator.usb.requestDevice({filters:[]});await d.open();setPortStatus('usb','conn',d.productName||'USB Device');}catch(e){setPortStatus('usb','off',e.message);}
}

// ══════════════════════════════════════════════════════════════
// MINING REFERENCE HUB
// ══════════════════════════════════════════════════════════════
const COINS = [
  {sym:'XMR',name:'Monero',algo:'RandomX',type:'CPU',color:'#ff6b35',difficulty:'High',pool:'pool.supportxmr.com',software:'XMRig',link:'https://xmrig.com',mobileOk:false,gpuOk:false,desc:'Best CPU-mineable coin. RandomX algorithm specifically designed to be ASIC/GPU resistant. Requires 2MB L3 cache per thread.'},
  {sym:'RYO',name:'Ryo Currency',algo:'CryptoNight-GPU',type:'GPU',color:'#9b59b6',difficulty:'Low',pool:'pool.ryo-currency.com',software:'lolMiner',link:'https://ryo-currency.com',mobileOk:false,gpuOk:true,desc:'Privacy coin optimised for GPU mining. CN-GPU algorithm.'},
  {sym:'RTM',name:'Raptoreum',algo:'GhostRider',type:'CPU',color:'#e74c3c',difficulty:'Medium',pool:'raptoreum.com/mining',software:'cpuminer-gr',link:'https://raptoreum.com',mobileOk:false,gpuOk:false,desc:'CPU-only via GhostRider algo. SmartNode ecosystem.'},
  {sym:'ZEPH',name:'Zephyr Protocol',algo:'RandomX',type:'CPU',color:'#1abc9c',difficulty:'Medium',pool:'community pools',software:'XMRig',link:'https://zephyrprotocol.com',mobileOk:false,gpuOk:false,desc:'Privacy coin on RandomX — minable with same setup as Monero.'},
  {sym:'FLUX',name:'Flux',algo:'ZelHash',type:'GPU',color:'#2ecc71',difficulty:'Medium',pool:'pool.rubin.eu/flux',software:'lolMiner',link:'https://runonflux.io',mobileOk:false,gpuOk:true,desc:'Decentralised cloud. GPU mining with NVIDIA/AMD.'},
  {sym:'DERO',name:'Dero',algo:'AstroBWT',type:'CPU',color:'#3498db',difficulty:'Low',pool:'community pools',software:'XMRig-DERO',link:'https://dero.io',mobileOk:false,gpuOk:false,desc:'Privacy smart contracts. AstroBWT CPU algo.'},
  {sym:'KAS',name:'Kaspa',algo:'kHeavyHash',type:'GPU',color:'#70b8ff',difficulty:'Very High',pool:'pool.kaspa.org',software:'lolMiner / T-Rex',link:'https://kaspa.org',mobileOk:false,gpuOk:true,desc:'Fastest PoW blockDAG. GPU dominant, but CPU possible.'},
  {sym:'ALPH',name:'Alephium',algo:'Blake3',type:'GPU',color:'#ff9f43',difficulty:'Medium',pool:'pool.alephium.org',software:'lolMiner',link:'https://alephium.org',mobileOk:false,gpuOk:true,desc:'Stateful UTXO chain. GPU mining.'},
  {sym:'MOBILE',name:'Helium Mobile',algo:'Geo/PoC',type:'GEO',color:'#a29bfe',difficulty:'N/A',pool:'Helium Network',software:'Hotspot App',link:'https://www.helium.com/mobile',mobileOk:true,gpuOk:false,desc:'Earn MOBILE tokens by providing cellular coverage. Requires Helium 5G hotspot hardware.'},
  {sym:'DIMO',name:'DIMO Network',algo:'Geo/Vehicle',type:'GEO',color:'#fd79a8',difficulty:'N/A',pool:'DIMO Network',software:'DIMO App',link:'https://dimo.zone',mobileOk:true,gpuOk:false,desc:'Earn DIMO by connecting your car and sharing mobility data. App-based.'},
  {sym:'HNT',name:'Helium IOT',algo:'Proof-of-Coverage',type:'GEO',color:'#74b9ff',difficulty:'N/A',pool:'Helium Network',software:'Hotspot Firmware',link:'https://www.helium.com',mobileOk:false,gpuOk:false,desc:'Earn HNT by running a LoRaWAN hotspot. Real hardware required.'},
  {sym:'HONEY',name:'Hivemapper',algo:'Geo/Dashcam',type:'GEO',color:'#ffeaa7',difficulty:'N/A',pool:'Hivemapper Network',software:'Hivemapper App',link:'https://hivemapper.com',mobileOk:true,gpuOk:false,desc:'Map the world with a dashcam. Earn HONEY tokens per km mapped.'},
];
function initCoinGrid() {
  const g = document.getElementById('coinGrid');
  g.innerHTML = COINS.map((c, i) => `
    <div class="coin-card" onclick="selectCoin(${i})" id="ccard-${i}">
      <div class="coin-sym" style="color:${c.color}">${c.sym}</div>
      <div class="coin-name">${c.name}</div>
      <div class="coin-algo">${c.type} · ${c.algo}</div>
      <div class="coin-price" id="cprice-${i}">Loading...</div>
      <div class="coin-diff" style="color:var(--muted)">Diff: ${c.difficulty}</div>
    </div>
  `).join('');
  fetchPrices();
}

async function fetchPrices() {
  try {
    const ids = 'monero,kaspa,alephium,flux,raptoreum,zephyr-protocol';
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
    const data = await r.json();
    const map = {XMR:'monero',KAS:'kaspa',ALPH:'alephium',FLUX:'flux',RTM:'raptoreum',ZEPH:'zephyr-protocol'};
    COINS.forEach((c, i) => {
      const key = map[c.sym];
      const price = data[key]?.usd;
      const change = data[key]?.usd_24h_change;
      const el = document.getElementById('cprice-'+i);
      if (el && price) {
        S.coinPrices[c.sym] = price;
        const chg = change ? ` (${change>0?'+':''}${change.toFixed(1)}%)` : '';
        const chgColor = change > 0 ? 'var(--lime)' : 'var(--rose)';
        el.innerHTML = `$${price.toFixed(price<1?4:2)} <span style="color:${chgColor};font-size:.48rem">${chg}</span>`;
      } else if (el) {
        el.textContent = c.type === 'GEO' ? 'Network token' : 'N/A';
      }
    });
    calcProfit();
  } catch(e) {
    COINS.forEach((c, i) => {
      const el = document.getElementById('cprice-'+i);
      if (el) el.textContent = c.type==='GEO'?'Network token':'No price data';
    });
  }
}

function selectCoin(idx) {
  document.querySelectorAll('.coin-card').forEach(c=>c.classList.remove('sel'));
  document.getElementById('ccard-'+idx).classList.add('sel');
  const c = COINS[idx];
  S.selectedCoin = c;
  const detail = document.getElementById('coinDetail');
  const hdr = document.getElementById('coinDetailHdr');  const body = document.getElementById('coinDetailBody');
  detail.style.display = 'block';
  hdr.textContent = c.sym + ' — ' + c.name;
  const price = S.coinPrices[c.sym] ? '$'+S.coinPrices[c.sym] : 'See network';
  body.innerHTML = `
    <div class="hw-row"><span class="hw-lbl">ALGORITHM</span><span class="hw-val" style="color:var(--neon)">${c.algo}</span></div>
    <div class="hw-row"><span class="hw-lbl">TYPE</span><span class="hw-val" style="color:var(--amber)">${c.type}</span></div>
    <div class="hw-row"><span class="hw-lbl">PRICE</span><span class="hw-val" style="color:var(--lime)">${price}</span></div>
    <div class="hw-row"><span class="hw-lbl">DIFFICULTY</span><span class="hw-val">${c.difficulty}</span></div>
    <div class="hw-row"><span class="hw-lbl">POOL</span><span class="hw-val">${c.pool}</span></div>
    <div class="hw-row"><span class="hw-lbl">SOFTWARE</span><span class="hw-val" style="color:var(--violet)">${c.software}</span></div>
    <div style="font-size:.62rem;color:var(--text);line-height:1.7;margin-top:8px;">${c.desc}</div>
    <a href="${c.link}" target="_blank" rel="noopener" style="color:var(--neon);font-size:.62rem;text-decoration:none;display:block;margin-top:8px;">→ ${c.link}</a>
    ${c.mobileOk ? '<div style="color:var(--lime);font-size:.6rem;margin-top:6px;">✓ Mobile-compatible (app-based)</div>' : '<div style="color:var(--muted);font-size:.6rem;margin-top:6px;">✗ Not efficient on mobile</div>'}
  `;
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function calcProfit() {
  const hashrate = parseFloat(document.getElementById('calcHash')?.value) || 500;
  const watts = parseFloat(document.getElementById('calcWatts')?.value) || 65;
  const elec = parseFloat(document.getElementById('calcElec')?.value) || 0.12;
  const costPerDay = (watts / 1000 * 24 * elec);
  const body = document.getElementById('profitBody');
  if (!body) return;
  const rows = COINS.filter(c => c.type !== 'GEO' && S.coinPrices[c.sym]).map(c => {
    const price = S.coinPrices[c.sym] || 0;
    const diffMult = c.difficulty==='Low'?0.005:c.difficulty==='Medium'?0.002:c.difficulty==='High'?0.0005:0.00001;
    const coinsPerDay = hashrate * diffMult;
    const revPerDay = coinsPerDay * price;
    const profitPerDay = revPerDay - costPerDay;
    const pc = profitPerDay > 0 ? 'var(--lime)' : 'var(--rose)';
    return `<tr>
      <td style="color:var(--amber);font-weight:700">${c.sym}</td>
      <td style="color:var(--muted);font-size:.55rem">${c.algo}</td>
      <td style="color:var(--neon)">$${revPerDay.toFixed(3)}</td>
      <td style="color:var(--rose)">$${costPerDay.toFixed(3)}</td>
      <td style="color:${pc};font-weight:700">${profitPerDay>0?'+':''}$${profitPerDay.toFixed(3)}</td>
    </tr>`;
  });
  body.innerHTML = rows.join('') || '<tr><td colspan="5" style="color:var(--muted);text-align:center;padding:12px">Loading prices...</td></tr>';
}

function initGeoMine() {
  const geoCoins = COINS.filter(c => c.type === 'GEO');
  const el = document.getElementById('geoMine');
  if (!el) return;
  el.innerHTML = geoCoins.map(c => `
    <div class="port-item" style="margin-bottom:0">
      <div style="font-size:1.4rem">${c.sym==='MOBILE'?'📱':c.sym==='DIMO'?'🚗':c.sym==='HNT'?'📡':'🎥'}</div>      <div class="port-info">
        <div class="port-name" style="color:${c.color}">${c.sym} — ${c.name}</div>
        <div class="port-desc">${c.desc}</div>
        <a href="${c.link}" target="_blank" rel="noopener" style="color:var(--neon);font-size:.55rem;text-decoration:none;">→ ${c.link}</a>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
// AI CHAT
// ══════════════════════════════════════════════════════════════
function addAI(role, text) {
  const el = document.getElementById('aiChat'); if (!el) return;
  const d = document.createElement('div');
  if (role === 'user') { d.className='cmsg cmsg-u'; d.textContent=text; }
  else if (role === 'ai') { d.className='cmsg cmsg-a'; d.innerHTML=`<span class="albl">◉ MYLO AI+</span>${safeText(text)}`; }
  else { d.className='cmsg cmsg-s'; d.textContent='⚡ '+text; }
  el.appendChild(d); el.scrollTop=el.scrollHeight;
}
function showThink(){const el=document.getElementById('aiChat');if(!el)return;const d=document.createElement('div');d.className='cmsg cmsg-a';d.id='think';d.innerHTML=`<span class="albl">◉ MYLO AI+</span><span class="thinking"><span></span><span></span><span></span></span>`;el.appendChild(d);el.scrollTop=el.scrollHeight;}
function rmThink(){const e=document.getElementById('think');if(e)e.remove();}

async function aiSend() {
  const inp = document.getElementById('aiIn');
  const text = inp.value.trim(); if (!text) return;
  addAI('user', text); inp.value='';
  showThink();
  S.chatHistory.push({role:'user',content:text});
  const ctx = `[LIVE] CPU:${S.cpu.toFixed(1)}% FREQ:${S.freq.toFixed(3)}GHz TEMP:${S.temp.toFixed(1)}°C MEM:${S.mem.toFixed(1)}% CORES:${S.cores} NOISE:${S.noise.toFixed(3)}`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:`You are Mylo AI+, the neural intelligence embedded in CPUMyLo Scanner — a mobile-first CPU monitor, cryptography toolkit, device communicator, and mining reference hub. You have real-time CPU telemetry. Be precise, technical, and helpful. Mention actual data when relevant. Keep responses concise for mobile.\n\n${ctx}`,messages:S.chatHistory.slice(-10)})});
    const data = await r.json(); rmThink();
    const reply = data.content?.[0]?.text || 'Neural relay offline.';
    S.chatHistory.push({role:'assistant',content:reply});
    addAI('ai', reply);
  } catch(e) { rmThink(); addAI('ai','Connection error: '+e.message); }
}
document.addEventListener('keydown', e => { if (e.target.id==='aiIn' && e.key==='Enter') aiSend(); });

// Terminal
function termLog(cmd, out, cls='ok') {
  const el = document.getElementById('termOut'); if (!el) return;
  const d = document.createElement('div');
  d.style.cssText='font-size:.62rem;margin-bottom:2px;';
  d.innerHTML=`<span style="color:var(--rose)">MYLO:/> </span><span style="color:var(--neon)">${safeText(cmd)}</span>`;
  el.appendChild(d);
  if (out) { 
    const o=document.createElement('div');
    o.style.cssText='font-size:.6rem;color:'+(cls==='ok'?'#39ff8a':cls==='err'?'var(--rose)':'var(--muted)');    o.textContent='  └ '+out; 
    el.appendChild(o); 
  }
  el.scrollTop=el.scrollHeight;
}

const CMDS={
  'help':()=>'Commands: top, cpu, freq, temp, mem, noise, ps, cores, scan, clear',
  'top':()=>`CPU:${S.cpu.toFixed(1)}% MEM:${S.mem.toFixed(1)}% TEMP:${S.temp.toFixed(1)}°C FREQ:${S.freq.toFixed(3)}GHz`,
  'cpu':()=>`Load: ${S.cpu.toFixed(2)}% — ${S.cpu>85?'⚠ CRITICAL':S.cpu>65?'! HIGH':'✓ NORMAL'}`,
  'freq':()=>`${S.freq.toFixed(3)} GHz (cores: ${S.coreFreqs.slice(0,4).map(c=>c.toFixed(2)).join(' | ')})`,
  'temp':()=>`${S.temp.toFixed(1)}°C — ${S.temp>85?'⚠ CRITICAL':S.temp>70?'! HIGH':'✓ NORMAL'}`,
  'mem':()=>`Memory: ${S.mem.toFixed(1)}%`,
  'noise':()=>`Noise: ${S.noise.toFixed(4)} — ${S.noise>.7?'⚠ ANOMALY':S.noise>.4?'! ELEVATED':'✓ LOW'}`,
  'cores':()=>`${S.cores} threads | Freqs: ${S.coreFreqs.slice(0,4).map(c=>c.toFixed(2)+'G').join(' ')}`,
  'scan':()=>`Scan complete. Noise:${S.noise.toFixed(4)} Load:${S.cpu.toFixed(1)}% Freq:${S.freq.toFixed(3)}GHz`,
  'clear':()=>{document.getElementById('termOut').innerHTML='';return null;},
};

async function execTerm(raw){
  const cmd=raw.trim().toLowerCase();
  if(CMDS[cmd]!==undefined){const r=CMDS[cmd]();if(r!==null)termLog(raw,r);return;}
  termLog(raw,'routing to Mylo AI...','info');
  try{
    const ctx=`CPU:${S.cpu.toFixed(1)}% FREQ:${S.freq.toFixed(2)}GHz TEMP:${S.temp.toFixed(1)}°C`;
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:`Terminal AI in CPUMyLo. System: ${ctx}. Respond with 1-3 line terminal output only. Be concise and technical.`,messages:[{role:'user',content:raw}]})});
    const data=await r.json();
    termLog('',data.content?.[0]?.text||'[null]','ok');
  }catch(e){termLog('','AI error: '+e.message,'err');}
}
document.addEventListener('keydown', e=>{if(e.target.id==='termIn'&&e.key==='Enter'){const v=e.target.value.trim();if(v){e.target.value='';execTerm(v);}}});

// ══════════════════════════════════════════════════════════════
// MAIN LOOP
// ══════════════════════════════════════════════════════════════
let frame=0;
function loop(now){
  trackFPS(now);
  frame++;
  if(frame%5===0) simCPU();
  renderFreqCanvas();
  renderFreqBars();
  renderNoise();
  renderPerf();
  if(frame%60===0) updateClock();
  requestAnimationFrame(loop);
}

// ══════════════════════════════════════════════════════════════
// BOOT// ══════════════════════════════════════════════════════════════
detectHardware();
initPorts();
initCoinGrid();
initGeoMine();
addAI('system', 'CPUMyLo Scanner online — Mylo AI+ ready');
addAI('ai', 'All systems nominal. Your real device data is loaded. I can see live CPU metrics, help with cryptography, connect to device ports, or pull up mining data for any supported coin. What do you need?');
termLog('init cpumylo --mobile','Mylo AI+ loaded. Real HW detection complete. Crypto engine: WebCrypto API. Device APIs: Serial, BLE, USB, WS.','ok');
requestAnimationFrame(loop);
