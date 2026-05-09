// ═══════════════════════════════════════
// NAV TAB SWITCHING
// ═══════════════════════════════════════
const navBtns = document.querySelectorAll('.nav-btn');
const panels  = document.querySelectorAll('.tool-panel');

navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tool).classList.add('active');
  });
});

// ═══════════════════════════════════════
// COPY BUTTONS
// ═══════════════════════════════════════
document.querySelectorAll('.copy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = document.getElementById(btn.dataset.target);
    navigator.clipboard.writeText(target.textContent).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    });
  });
});

// ═══════════════════════════════════════
// COLOR PICKER
// ═══════════════════════════════════════
const colorInput   = document.getElementById('colorInput');
const colorPreview = document.getElementById('colorPreview');
const hexOut       = document.getElementById('hexOut');
const rgbOut       = document.getElementById('rgbOut');
const hslOut       = document.getElementById('hslOut');
const paletteRow   = document.getElementById('paletteRow');

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s;
  let l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function generatePalette(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const swatches = [
    `hsl(${h},${s}%,${Math.min(l + 30, 95)}%)`,
    `hsl(${h},${s}%,${Math.min(l + 15, 90)}%)`,
    `hsl(${h},${s}%,${l}%)`,
    `hsl(${h},${s}%,${Math.max(l - 15, 5)}%)`,
    `hsl(${h},${s}%,${Math.max(l - 30, 5)}%)`,
    `hsl(${(h + 30) % 360},${s}%,${l}%)`,
    `hsl(${(h + 180) % 360},${s}%,${l}%)`,
    `hsl(${(h + 210) % 360},${s}%,${l}%)`,
  ];

  paletteRow.innerHTML = '';
  swatches.forEach(color => {
    const div = document.createElement('div');
    div.className = 'palette-swatch';
    div.style.background = color;
    div.setAttribute('data-hex', color);
    div.title = color;
    paletteRow.appendChild(div);
  });
}

function updateColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  colorPreview.style.background = hex;
  hexOut.textContent = hex;
  rgbOut.textContent = `rgb(${r}, ${g}, ${b})`;
  hslOut.textContent = `hsl(${h}, ${s}%, ${l}%)`;
  generatePalette(hex);
}

colorInput.addEventListener('input', e => updateColor(e.target.value));
updateColor('#b76e79');

// ═══════════════════════════════════════
// POMODORO
// ═══════════════════════════════════════
let pomInterval  = null;
let pomSeconds   = 25 * 60;
let pomTotal     = 25 * 60;
let pomRunning   = false;
let pomSesCount  = 0;
let isCustomMode = false;

const pomDisplay    = document.getElementById('pomDisplay');
const pomRing       = document.getElementById('pomRing');
const pomStart      = document.getElementById('pomStart');
const pomReset      = document.getElementById('pomReset');
const pomSessions   = document.getElementById('pomSessions');
const pomModes      = document.querySelectorAll('.pom-mode');
const customTimeRow = document.getElementById('customTimeRow');

// Inject SVG gradient for ring
const svgEl = document.querySelector('.clock-ring svg');
const defs  = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
const grad  = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
grad.id = 'ringGrad';
grad.setAttribute('gradientUnits', 'userSpaceOnUse');
grad.setAttribute('x1', '100');
grad.setAttribute('y1', '0');
grad.setAttribute('x2', '100');
grad.setAttribute('y2', '200');
grad.innerHTML = `
  <stop offset="0%"   stop-color="#c9a96e"/>
  <stop offset="33%"  stop-color="#b76e79"/>
  <stop offset="66%"  stop-color="#9b7fc7"/>
  <stop offset="100%" stop-color="#c9a96e"/>
`;
defs.appendChild(grad);
svgEl.insertBefore(defs, svgEl.firstChild);
pomRing.setAttribute('stroke', 'url(#ringGrad)');

const circumference = 2 * Math.PI * 90;

function formatTime(totalSecs) {
  if (totalSecs >= 3600) {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSecs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }
  const m = Math.floor(totalSecs / 60).toString().padStart(2, '0');
  const s = (totalSecs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function updatePomDisplay() {
  if (isNaN(pomSeconds) || pomSeconds < 0) pomSeconds = 0;
  if (isNaN(pomTotal) || pomTotal <= 0) pomTotal = pomSeconds || 1;

  pomDisplay.textContent = formatTime(pomSeconds);
  pomDisplay.style.fontSize = pomSeconds >= 3600 ? '2rem' : '3rem';

  const progress = pomTotal > 0 ? pomSeconds / pomTotal : 1;
  pomRing.style.strokeDasharray  = circumference;
  pomRing.style.strokeDashoffset = circumference * (1 - progress);
}

function resetTimer() {
  clearInterval(pomInterval);
  pomRunning = false;
  pomStart.textContent = 'Start';
  pomSeconds = pomTotal;
  updatePomDisplay();
}

function playDoneSound() {
  const ctx  = new AudioContext();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.5, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
  osc.start();
  osc.stop(ctx.currentTime + 2);
}

pomModes.forEach(btn => {
  btn.addEventListener('click', () => {
    pomModes.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.mins === 'custom') {
      isCustomMode = true;
      customTimeRow.classList.add('visible');
    } else {
      isCustomMode = false;
      customTimeRow.classList.remove('visible');
      pomTotal   = parseInt(btn.dataset.mins) * 60;
      pomSeconds = pomTotal;
      resetTimer();
    }
  });
});

document.getElementById('setCustomTime').addEventListener('click', () => {
  const h     = parseInt(document.getElementById('customHours').value) || 0;
  const m     = parseInt(document.getElementById('customMins').value)  || 0;
  const s     = parseInt(document.getElementById('customSecs').value)  || 0;
  const total = h * 3600 + m * 60 + s;

  if (total <= 0) {
    customTimeRow.style.animation = 'none';
    customTimeRow.offsetHeight;
    customTimeRow.style.animation = 'shake 0.3s ease';
    return;
  }

  pomTotal   = total;
  pomSeconds = total;
  resetTimer();
});

pomStart.addEventListener('click', () => {
  if (pomRunning) {
    clearInterval(pomInterval);
    pomRunning = false;
    pomStart.textContent = 'Resume';
  } else {
    if (pomSeconds <= 0) return;
    pomRunning = true;
    pomStart.textContent = 'Pause';
    pomInterval = setInterval(() => {
      pomSeconds--;
      updatePomDisplay();
      if (pomSeconds <= 0) {
        clearInterval(pomInterval);
        pomRunning = false;
        pomStart.textContent = 'Start';
        pomSesCount++;
        pomSessions.textContent = pomSesCount;
        playDoneSound();
      }
    }, 1000);
  }
});

pomReset.addEventListener('click', resetTimer);

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25%       { transform: translateX(-6px); }
    75%       { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);

updatePomDisplay();

// ═══════════════════════════════════════
// WORD COUNTER
// ═══════════════════════════════════════
const wordInput     = document.getElementById('wordInput');
const wordCount     = document.getElementById('wordCount');
const charCount     = document.getElementById('charCount');
const charNoSpace   = document.getElementById('charNoSpace');
const sentenceCount = document.getElementById('sentenceCount');
const paraCount     = document.getElementById('paraCount');
const readTime      = document.getElementById('readTime');

wordInput.addEventListener('input', () => {
  const text  = wordInput.value;
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  wordCount.textContent     = words.length;
  charCount.textContent     = text.length;
  charNoSpace.textContent   = text.replace(/\s/g, '').length;
  sentenceCount.textContent = text.split(/[.!?]+/).filter(s => s.trim()).length;
  paraCount.textContent     = text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0);
  readTime.textContent      = Math.max(1, Math.ceil(words.length / 200));
});

document.getElementById('clearText').addEventListener('click', () => {
  wordInput.value = '';
  wordInput.dispatchEvent(new Event('input'));
});

// ═══════════════════════════════════════
// CALCULATOR
// ═══════════════════════════════════════
const calcDisplay = document.getElementById('calcDisplay');
let calcExpr  = '';
let calcNewNum = false;

document.querySelectorAll('.calc-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.dataset.val;

    if (val === 'clear') {
      calcExpr = '';
      calcDisplay.textContent = '0';
      calcNewNum = false;
      return;
    }

    if (val === 'backspace') {
      calcExpr = calcExpr.slice(0, -1);
      calcDisplay.textContent = calcExpr || '0';
      return;
    }

    if (val === '=') {
      try {
        const result = Function('"use strict"; return (' + calcExpr.replace(/%/g, '/100') + ')')();
        calcDisplay.textContent = parseFloat(result.toFixed(10)).toString();
        calcExpr = parseFloat(result.toFixed(10)).toString();
      } catch {
        calcDisplay.textContent = 'Error';
        calcExpr = '';
      }
      return;
    }

    calcExpr += val;
    calcDisplay.textContent = calcExpr;
  });
});

// ═══════════════════════════════════════
// RANDOM GENERATOR
// ═══════════════════════════════════════
const randTabs   = document.querySelectorAll('.rand-tab');
const randPanels = document.querySelectorAll('.rand-panel');
const randResult = document.getElementById('randResult');

const femNames  = ['Aurora','Celeste','Diana','Elena','Freya','Gemma','Iris','Luna','Maya','Nova','Ophelia','Petra','Quinn','Rose','Stella','Thea','Uma','Violet','Wren','Zara'];
const mascNames = ['Aiden','Blake','Cole','Dante','Eli','Finn','Gael','Hugo','Ivan','Jude','Kai','Leo','Milo','Noah','Oscar','Pierce','Quinn','Reid','Seth','Theo'];

randTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    randTabs.forEach(t => t.classList.remove('active'));
    randPanels.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`rand-${tab.dataset.rand}`).classList.add('active');
    randResult.textContent = '—';
  });
});

document.getElementById('generateRand').addEventListener('click', () => {
  const activeTab = document.querySelector('.rand-tab.active').dataset.rand;

  if (activeTab === 'number') {
    const min = parseInt(document.getElementById('randMin').value);
    const max = parseInt(document.getElementById('randMax').value);
    randResult.textContent = Math.floor(Math.random() * (max - min + 1)) + min;

  } else if (activeTab === 'name') {
    const gender = document.getElementById('nameGender').value;
    const pool   = gender === 'fem'  ? femNames
                 : gender === 'masc' ? mascNames
                 : [...femNames, ...mascNames];
    randResult.textContent = pool[Math.floor(Math.random() * pool.length)];

  } else if (activeTab === 'decision') {
    const opts = [
      document.getElementById('dec1').value,
      document.getElementById('dec2').value,
      document.getElementById('dec3').value,
    ].filter(o => o.trim());
    if (!opts.length) { randResult.textContent = 'Add options!'; return; }
    randResult.textContent = opts[Math.floor(Math.random() * opts.length)];
  }
});

// ═══════════════════════════════════════
// PASSWORD GENERATOR
// ═══════════════════════════════════════
const passLength   = document.getElementById('passLength');
const passLenLabel = document.getElementById('passLenLabel');
const passOutput   = document.getElementById('passOutput');
const strengthBar  = document.getElementById('strengthBar');
const strengthLbl  = document.getElementById('strengthLabel');

passLength.addEventListener('input', () => {
  passLenLabel.textContent = passLength.value;
});

function generatePassword() {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const nums    = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let charset   = '';

  if (document.getElementById('inclUpper').checked) charset += upper;
  if (document.getElementById('inclLower').checked) charset += lower;
  if (document.getElementById('inclNums').checked)  charset += nums;
  if (document.getElementById('inclSyms').checked)  charset += symbols;

  if (!charset) { passOutput.textContent = 'Select options!'; return; }

  const len  = parseInt(passLength.value);
  let pass   = '';
  for (let i = 0; i < len; i++) {
    pass += charset[Math.floor(Math.random() * charset.length)];
  }
  passOutput.textContent = pass;

  let score = 0;
  if (len >= 12) score++;
  if (len >= 16) score++;
  if (/[A-Z]/.test(pass))      score++;
  if (/[0-9]/.test(pass))      score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;

  const levels = [
    { label: 'Very Weak',   color: '#e74c3c', w: '20%'  },
    { label: 'Weak',        color: '#e67e22', w: '40%'  },
    { label: 'Fair',        color: '#f1c40f', w: '60%'  },
    { label: 'Strong',      color: '#2ecc71', w: '80%'  },
    { label: 'Very Strong', color: '#27ae60', w: '100%' },
  ];
  const lvl = levels[Math.min(score, 4)];
  strengthBar.style.width      = lvl.w;
  strengthBar.style.background = lvl.color;
  strengthLbl.textContent      = lvl.label;
}

document.getElementById('generatePass').addEventListener('click', generatePassword);
document.getElementById('copyPass').addEventListener('click', () => {
  navigator.clipboard.writeText(passOutput.textContent);
});

// ═══════════════════════════════════════
// UNIT CONVERTER
// ═══════════════════════════════════════
const unitDefs = {
  length: {
    units:  ['Meter','Kilometer','Mile','Yard','Foot','Inch','Centimeter','Millimeter'],
    toBase: { Meter:1, Kilometer:1000, Mile:1609.34, Yard:0.9144, Foot:0.3048, Inch:0.0254, Centimeter:0.01, Millimeter:0.001 },
  },
  weight: {
    units:  ['Kilogram','Gram','Pound','Ounce','Ton','Milligram'],
    toBase: { Kilogram:1, Gram:0.001, Pound:0.453592, Ounce:0.0283495, Ton:1000, Milligram:0.000001 },
  },
  temp: {
    units:  ['Celsius','Fahrenheit','Kelvin'],
    toBase: null,
  },
};

function populateUnits() {
  const cat  = document.getElementById('unitCategory').value;
  const from = document.getElementById('unitFrom');
  const to   = document.getElementById('unitTo');
  from.innerHTML = '';
  to.innerHTML   = '';
  unitDefs[cat].units.forEach(u => {
    from.innerHTML += `<option>${u}</option>`;
    to.innerHTML   += `<option>${u}</option>`;
  });
  if (unitDefs[cat].units.length > 1) to.selectedIndex = 1;
}

document.getElementById('unitCategory').addEventListener('change', populateUnits);
populateUnits();

document.getElementById('convertUnit').addEventListener('click', () => {
  const cat  = document.getElementById('unitCategory').value;
  const val  = parseFloat(document.getElementById('unitInput').value);
  const from = document.getElementById('unitFrom').value;
  const to   = document.getElementById('unitTo').value;

  if (isNaN(val)) { document.getElementById('unitResult').textContent = '?'; return; }

  let result;
  if (cat === 'temp') {
    if      (from === 'Celsius'    && to === 'Fahrenheit') result = val * 9 / 5 + 32;
    else if (from === 'Fahrenheit' && to === 'Celsius')    result = (val - 32) * 5 / 9;
    else if (from === 'Celsius'    && to === 'Kelvin')     result = val + 273.15;
    else if (from === 'Kelvin'     && to === 'Celsius')    result = val - 273.15;
    else if (from === 'Fahrenheit' && to === 'Kelvin')     result = (val - 32) * 5 / 9 + 273.15;
    else if (from === 'Kelvin'     && to === 'Fahrenheit') result = (val - 273.15) * 9 / 5 + 32;
    else result = val;
  } else {
    const base = val * unitDefs[cat].toBase[from];
    result = base / unitDefs[cat].toBase[to];
  }

  document.getElementById('unitResult').textContent = parseFloat(result.toFixed(6)).toString();
});

// ═══════════════════════════════════════
// GRADIENT GENERATOR
// ═══════════════════════════════════════
const gradientPreview = document.getElementById('gradientPreview');
const gradientCSS     = document.getElementById('gradientCSS');
const gradType        = document.getElementById('gradType');
const gradAngle       = document.getElementById('gradAngle');
const angleLabel      = document.getElementById('angleLabel');
const angleRow        = document.getElementById('angleRow');

function buildGradient() {
  const type  = gradType.value;
  const angle = gradAngle.value;
  const stops = document.querySelectorAll('.stop-row');
  let stopStr = '';

  stops.forEach(row => {
    const color = row.querySelector('.stop-color').value;
    const pos   = row.querySelector('.stop-pos').value;
    stopStr += `${color} ${pos}%, `;
  });
  stopStr = stopStr.replace(/, $/, '');

  let css;
  if (type === 'radial') {
    css = `radial-gradient(circle, ${stopStr})`;
    angleRow.style.display = 'none';
  } else {
    css = `linear-gradient(${angle}deg, ${stopStr})`;
    angleRow.style.display = 'flex';
  }

  gradientPreview.style.background = css;
  gradientCSS.textContent = `background: ${css};`;
}

gradType.addEventListener('change', buildGradient);
gradAngle.addEventListener('input', () => {
  angleLabel.textContent = gradAngle.value;
  buildGradient();
});

document.querySelectorAll('.stop-color, .stop-pos').forEach(el => {
  el.addEventListener('input', () => {
    if (el.classList.contains('stop-pos')) {
      el.nextElementSibling.textContent = el.value + '%';
    }
    buildGradient();
  });
});

document.getElementById('addStop').addEventListener('click', () => {
  const container = document.getElementById('colorStops');
  const row = document.createElement('div');
  row.className = 'stop-row';
  row.innerHTML = `
    <input type="color" class="stop-color" value="#9b7fc7"/>
    <input type="range" class="stop-pos" min="0" max="100" value="75"/>
    <span class="stop-pos-label">75%</span>
  `;
  row.querySelectorAll('.stop-color, .stop-pos').forEach(el => {
    el.addEventListener('input', () => {
      if (el.classList.contains('stop-pos')) {
        el.nextElementSibling.textContent = el.value + '%';
      }
      buildGradient();
    });
  });
  container.appendChild(row);
  buildGradient();
});

buildGradient();

// ═══════════════════════════════════════
// AGE CALCULATOR
// ═══════════════════════════════════════
document.getElementById('calcAge').addEventListener('click', () => {
  const bday = new Date(document.getElementById('birthdayInput').value);
  if (isNaN(bday)) return;
  const now = new Date();

  let years  = now.getFullYear() - bday.getFullYear();
  let months = now.getMonth()    - bday.getMonth();
  let days   = now.getDate()     - bday.getDate();

  if (days < 0) {
    months--;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMs      = now - bday;
  const totalSeconds = Math.floor(totalMs / 1000);
  const totalHours   = Math.floor(totalMs / 3600000);
  const totalMonths  = years * 12 + months;
  const totalDays    = Math.floor(totalMs / 86400000);

  document.getElementById('ageYears').textContent   = years;
  document.getElementById('ageMonths').textContent  = totalMonths;
  document.getElementById('ageDays').textContent    = totalDays.toLocaleString();
  document.getElementById('ageHours').textContent   = totalHours.toLocaleString();
  document.getElementById('ageSeconds').textContent = totalSeconds.toLocaleString();

  const nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
  if (nextBday <= now) nextBday.setFullYear(now.getFullYear() + 1);
  const daysUntil = Math.ceil((nextBday - now) / 86400000);
  document.getElementById('nextBday').textContent =
    daysUntil === 0 ? '🎂 Happy Birthday!' : `🎂 Next birthday in ${daysUntil} days`;
});

// ═══════════════════════════════════════
// METRONOME
// ═══════════════════════════════════════
let metroCtx      = null;
let metroInterval = null;
let metroRunning  = false;
let currentBeat   = 0;
let tapTimes      = [];

const pendulum   = document.getElementById('pendulum');
const bpmSlider  = document.getElementById('bpmSlider');
const bpmDisplay = document.getElementById('bpmDisplay');
const beatDots   = document.getElementById('beatDots');
const timeSig    = document.getElementById('timeSig');

function buildBeatDots() {
  const beats = parseInt(timeSig.value);
  beatDots.innerHTML = '';
  for (let i = 0; i < beats; i++) {
    const dot = document.createElement('div');
    dot.className = 'beat-dot' + (i === 0 ? ' accent' : '');
    beatDots.appendChild(dot);
  }
}

function getMetroCtx() {
  if (!metroCtx) metroCtx = new AudioContext();
  return metroCtx;
}

function playClick(isAccent) {
  const ctx  = getMetroCtx();
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.value = isAccent ? 1000 : 800;
  gain.gain.setValueAtTime(isAccent ? 0.6 : 0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

function metroTick() {
  const beats = parseInt(timeSig.value);
  const dots  = beatDots.querySelectorAll('.beat-dot');
  dots.forEach(d => d.classList.remove('active'));
  dots[currentBeat]?.classList.add('active');
  playClick(currentBeat === 0);

  const dir = currentBeat % 2 === 0 ? 'rotate(-30deg)' : 'rotate(30deg)';
  pendulum.style.transition = `transform ${60000 / parseInt(bpmSlider.value) / 1000 * 0.9}s ease-in-out`;
  pendulum.style.transform  = dir;
  currentBeat = (currentBeat + 1) % beats;
}

function startMetro() {
  if (metroRunning) return;
  metroRunning = true;
  currentBeat  = 0;
  const bpm    = parseInt(bpmSlider.value);
  const ms     = 60000 / bpm;
  metroTick();
  metroInterval = setInterval(metroTick, ms);
}

function stopMetro() {
  clearInterval(metroInterval);
  metroRunning = false;
  currentBeat  = 0;
  pendulum.style.transform = 'rotate(0deg)';
  beatDots.querySelectorAll('.beat-dot').forEach(d => d.classList.remove('active'));
}

bpmSlider.addEventListener('input', () => {
  bpmDisplay.textContent = `${bpmSlider.value} BPM`;
  if (metroRunning) { stopMetro(); startMetro(); }
});

timeSig.addEventListener('change', () => {
  buildBeatDots();
  if (metroRunning) { stopMetro(); startMetro(); }
});

document.getElementById('metroStart').addEventListener('click', startMetro);
document.getElementById('metroStop').addEventListener('click', stopMetro);

document.getElementById('tapTempo').addEventListener('click', () => {
  const now = Date.now();
  tapTimes.push(now);
  if (tapTimes.length > 8) tapTimes.shift();

  if (tapTimes.length >= 2) {
    const gaps = [];
    for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i - 1]);
    const avg     = gaps.reduce((a, b) => a + b) / gaps.length;
    const bpm     = Math.round(60000 / avg);
    const clamped = Math.min(300, Math.max(20, bpm));
    bpmSlider.value = clamped;
    bpmDisplay.textContent = `${clamped} BPM`;
    if (metroRunning) { stopMetro(); startMetro(); }
  }
});

buildBeatDots();

// ═══════════════════════════════════════
// CHROMATIC TUNER
// ═══════════════════════════════════════
let tunerStream   = null;
let tunerCtx      = null;
let tunerAnalyser = null;
let tunerRunning  = false;
let tunerAnim     = null;

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function freqToNote(freq) {
  const semitones = 12 * Math.log2(freq / 440) + 69;
  const noteIndex = Math.round(semitones) % 12;
  const octave    = Math.floor(Math.round(semitones) / 12) - 1;
  const cents     = Math.round((semitones - Math.round(semitones)) * 100);
  return {
    note:   NOTES[(noteIndex + 12) % 12],
    octave: octave,
    cents:  cents,
  };
}

function autoCorrelate(buffer, sampleRate) {
  let SIZE = buffer.length;
  let rms   = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1 = 0, r2 = SIZE - 1;
  for (let i = 0; i < SIZE / 2; i++) { if (Math.abs(buffer[i]) < 0.2) { r1 = i; break; } }
  for (let i = 1; i < SIZE / 2; i++) { if (Math.abs(buffer[SIZE - i]) < 0.2) { r2 = SIZE - i; break; } }
  buffer = buffer.slice(r1, r2);
  SIZE   = buffer.length;

  const c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) c[i] = c[i] + buffer[j] * buffer[j + i];
  }

  let d = 0;
  while (c[d] > c[d + 1]) d++;
  let maxVal = -1, maxPos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  }

  let T0 = maxPos;
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  const a  = (x1 + x3 - 2 * x2) / 2;
  const b2 = (x3 - x1) / 2;
  if (a) T0 = T0 - b2 / (2 * a);
  return sampleRate / T0;
}

function tunerLoop() {
  if (!tunerRunning) return;
  const buffer = new Float32Array(tunerAnalyser.fftSize);
  tunerAnalyser.getFloatTimeDomainData(buffer);
  const freq = autoCorrelate(buffer, tunerCtx.sampleRate);

  if (freq > 0) {
    const { note, octave, cents } = freqToNote(freq);
    document.getElementById('tunerNote').textContent  = `${note}${octave}`;
    document.getElementById('tunerFreq').textContent  = `${freq.toFixed(1)} Hz`;
    document.getElementById('tunerCents').textContent = `${cents > 0 ? '+' : ''}${cents} cents`;
    const needlePos = 50 + (cents / 50) * 50;
    document.getElementById('tunerNeedle').style.left = `${Math.min(100, Math.max(0, needlePos))}%`;
  }

  tunerAnim = requestAnimationFrame(tunerLoop);
}

document.getElementById('tunerStart').addEventListener('click', async () => {
  if (tunerRunning) return;
  try {
    tunerStream   = await navigator.mediaDevices.getUserMedia({ audio: true });
    tunerCtx      = new AudioContext();
    tunerAnalyser = tunerCtx.createAnalyser();
    tunerAnalyser.fftSize = 2048;
    const src = tunerCtx.createMediaStreamSource(tunerStream);
    src.connect(tunerAnalyser);
    tunerRunning = true;
    tunerLoop();
  } catch (e) {
    alert('Microphone access denied. Please allow mic access and try again.');
  }
});

document.getElementById('tunerStop').addEventListener('click', () => {
  tunerRunning = false;
  cancelAnimationFrame(tunerAnim);
  if (tunerStream) tunerStream.getTracks().forEach(t => t.stop());
  if (tunerCtx)   tunerCtx.close();
  document.getElementById('tunerNote').textContent  = '—';
  document.getElementById('tunerFreq').textContent  = '— Hz';
  document.getElementById('tunerCents').textContent = '0 cents';
  document.getElementById('tunerNeedle').style.left = '50%';
});

// ═══════════════════════════════════════
// FULLSCREEN POMODORO
// ═══════════════════════════════════════
let fsSeconds    = 25 * 60;
let fsTotal      = 25 * 60;
let fsRunning    = false;
let fsInterval   = null;
let fsSesCount   = 0;
let fsCustomMode = false;

const fsOverlay   = document.getElementById('fsOverlay');
const fsDisplay   = document.getElementById('fsDisplay');
const fsRing      = document.getElementById('fsRing');
const fsStart     = document.getElementById('fsStart');
const fsReset     = document.getElementById('fsReset');
const fsExit      = document.getElementById('fsExit');
const fsSessions  = document.getElementById('fsSessions');
const fsCustomRow = document.getElementById('fsCustomRow');
const fsModeBtns  = document.querySelectorAll('.fs-mode-btn');

const fsCircumference = 2 * Math.PI * 90;
fsRing.setAttribute('stroke', 'url(#fsRingGrad)');

function updateFsDisplay() {
  if (isNaN(fsSeconds) || fsSeconds < 0) fsSeconds = 0;
  if (isNaN(fsTotal)   || fsTotal   <= 0) fsTotal  = fsSeconds || 1;

  fsDisplay.textContent    = formatTime(fsSeconds);
  fsDisplay.style.fontSize = fsSeconds >= 3600
    ? 'clamp(1.8rem, 5vmin, 3rem)'
    : 'clamp(2.5rem, 8vmin, 4.5rem)';

  const progress = fsTotal > 0 ? fsSeconds / fsTotal : 1;
  fsRing.style.strokeDasharray  = fsCircumference;
  fsRing.style.strokeDashoffset = fsCircumference * (1 - progress);
}

function stopFs() {
  clearInterval(fsInterval);
  fsRunning = false;
  fsStart.textContent = 'Start';
}

function resetFs() {
  stopFs();
  fsSeconds = fsTotal;
  updateFsDisplay();
}

fsModeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    fsModeBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.mins === 'custom') {
      fsCustomMode = true;
      fsCustomRow.classList.add('visible');
    } else {
      fsCustomMode = false;
      fsCustomRow.classList.remove('visible');
      fsTotal   = parseInt(btn.dataset.mins) * 60;
      fsSeconds = fsTotal;
      resetFs();
    }
  });
});

document.getElementById('fsSetCustom').addEventListener('click', () => {
  const h     = parseInt(document.getElementById('fsCustomHours').value) || 0;
  const m     = parseInt(document.getElementById('fsCustomMins').value)  || 0;
  const s     = parseInt(document.getElementById('fsCustomSecs').value)  || 0;
  const total = h * 3600 + m * 60 + s;

  if (total <= 0) {
    fsCustomRow.style.animation = 'none';
    fsCustomRow.offsetHeight;
    fsCustomRow.style.animation = 'shake 0.3s ease';
    return;
  }

  fsTotal   = total;
  fsSeconds = total;
  resetFs();
});

fsStart.addEventListener('click', () => {
  if (fsRunning) {
    stopFs();
    fsStart.textContent = 'Resume';
  } else {
    if (fsSeconds <= 0) return;
    fsRunning = true;
    fsStart.textContent = 'Pause';
    fsInterval = setInterval(() => {
      fsSeconds--;
      updateFsDisplay();
      if (fsSeconds <= 0) {
        stopFs();
        fsStart.textContent = 'Start';
        fsSesCount++;
        fsSessions.textContent = fsSesCount;
        playDoneSound();
        fsRing.style.filter = 'drop-shadow(0 0 30px rgba(183,110,121,0.9))';
        setTimeout(() => { fsRing.style.filter = ''; }, 1000);
      }
    }, 1000);
  }
});

fsReset.addEventListener('click', resetFs);

document.getElementById('pomFullscreen').addEventListener('click', () => {
  fsTotal    = pomTotal;
  fsSeconds  = pomSeconds;
  fsSesCount = pomSesCount;
  fsSessions.textContent = fsSesCount;
  updateFsDisplay();
  fsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  startParticles();
  fsExit.classList.add('visible');
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});

// ═══════════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════════
const canvas = document.getElementById('fsCanvas');
const ctx2d  = canvas.getContext('2d');
let particles       = [];
let shootingStars   = [];
let animFrame       = null;
let particleRunning = false;

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', () => {
  if (particleRunning) resizeCanvas();
});

const PARTICLE_COUNT = 80;
const COLORS = [
  'rgba(183, 110, 121,',
  'rgba(155, 127, 199,',
  'rgba(201, 169, 110,',
  'rgba(232, 196, 196,',
  'rgba(255, 255, 255,',
];

class Particle {
  constructor() { this.reset(true); }

  reset(randomY = false) {
    this.x             = Math.random() * canvas.width;
    this.y             = randomY ? Math.random() * canvas.height : canvas.height + 10;
    this.size          = Math.random() * 2.5 + 0.5;
    this.speedX        = (Math.random() - 0.5) * 0.4;
    this.speedY        = -(Math.random() * 0.6 + 0.2);
    this.opacity       = Math.random() * 0.6 + 0.1;
    this.color         = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.twinkle       = Math.random() * Math.PI * 2;
    this.twinkleSpd    = Math.random() * 0.03 + 0.01;
    this.shape         = Math.random() > 0.85 ? 'diamond' : 'circle';
    this.currentOpacity = this.opacity;
  }

  update() {
    this.x       += this.speedX;
    this.y       += this.speedY;
    this.twinkle += this.twinkleSpd;
    this.speedX  += (Math.random() - 0.5) * 0.01;
    this.speedX   = Math.max(-0.5, Math.min(0.5, this.speedX));
    this.currentOpacity = this.opacity * (0.7 + 0.3 * Math.sin(this.twinkle));
    if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) this.reset();
  }

  draw() {
    ctx2d.save();
    ctx2d.globalAlpha = this.currentOpacity;
    ctx2d.fillStyle   = `${this.color}1)`;

    if (this.shape === 'diamond') {
      ctx2d.shadowBlur  = 6;
      ctx2d.shadowColor = `${this.color}0.8)`;
      ctx2d.beginPath();
      ctx2d.moveTo(this.x,             this.y - this.size * 2);
      ctx2d.lineTo(this.x + this.size, this.y);
      ctx2d.lineTo(this.x,             this.y + this.size * 2);
      ctx2d.lineTo(this.x - this.size, this.y);
      ctx2d.closePath();
      ctx2d.fill();
    } else {
      ctx2d.shadowBlur  = 4;
      ctx2d.shadowColor = `${this.color}0.6)`;
      ctx2d.beginPath();
      ctx2d.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx2d.fill();
    }

    ctx2d.restore();
  }
}

class ShootingStar {
  constructor() { this.reset(); }

  reset() {
    this.x       = Math.random() * canvas.width;
    this.y       = Math.random() * canvas.height * 0.5;
    this.len     = Math.random() * 100 + 60;
    this.speed   = Math.random() * 4 + 3;
    this.angle   = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
    this.opacity = 0;
    this.fadeIn  = true;
    this.active  = false;
    this.timer   = Math.random() * 300 + 60;
  }

  update() {
    if (!this.active) { this.timer--; if (this.timer <= 0) this.active = true; return; }
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;

    if (this.fadeIn) {
      this.opacity += 0.05;
      if (this.opacity >= 0.8) this.fadeIn = false;
    } else {
      this.opacity -= 0.03;
    }

    if (this.opacity <= 0 || this.x > canvas.width || this.y > canvas.height) this.reset();
  }

  draw() {
    if (!this.active || this.opacity <= 0) return;
    ctx2d.save();
    ctx2d.globalAlpha = this.opacity;

    const grad = ctx2d.createLinearGradient(
      this.x, this.y,
      this.x - Math.cos(this.angle) * this.len,
      this.y - Math.sin(this.angle) * this.len,
    );
    grad.addColorStop(0,   'rgba(255, 220, 220, 0.9)');
    grad.addColorStop(0.4, 'rgba(183, 110, 121, 0.4)');
    grad.addColorStop(1,   'rgba(183, 110, 121, 0)');

    ctx2d.strokeStyle = grad;
    ctx2d.lineWidth   = 1.5;
    ctx2d.shadowBlur  = 8;
    ctx2d.shadowColor = 'rgba(183, 110, 121, 0.6)';
    ctx2d.beginPath();
    ctx2d.moveTo(this.x, this.y);
    ctx2d.lineTo(
      this.x - Math.cos(this.angle) * this.len,
      this.y - Math.sin(this.angle) * this.len,
    );
    ctx2d.stroke();
    ctx2d.restore();
  }
}

function startParticles() {
  particleRunning = true;
  resizeCanvas();
  particles     = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  shootingStars = Array.from({ length: 4 }, () => new ShootingStar());
  animateParticles();
}

function stopParticles() {
  particleRunning = false;
  cancelAnimationFrame(animFrame);
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);
  particles     = [];
  shootingStars = [];
}

function animateParticles() {
  if (!particleRunning) return;
  ctx2d.clearRect(0, 0, canvas.width, canvas.height);

  // Constellation lines
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx   = particles[i].x - particles[j].x;
      const dy   = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        ctx2d.save();
        ctx2d.globalAlpha = (1 - dist / 80) * 0.08;
        ctx2d.strokeStyle = 'rgba(183, 110, 121, 1)';
        ctx2d.lineWidth   = 0.5;
        ctx2d.beginPath();
        ctx2d.moveTo(particles[i].x, particles[i].y);
        ctx2d.lineTo(particles[j].x, particles[j].y);
        ctx2d.stroke();
        ctx2d.restore();
      }
    }
  }

  particles.forEach(p     => { p.update(); p.draw(); });
  shootingStars.forEach(s => { s.update(); s.draw(); });
  animFrame = requestAnimationFrame(animateParticles);
}

updateFsDisplay();

// ═══════════════════════════════════════
// CLOSE FULLSCREEN
// ═══════════════════════════════════════
function closeFs() {
  stopFs();
  fsOverlay.classList.remove('active');
  setTimeout(() => {
    fsExit.classList.remove('visible');
  }, 500);
  document.body.style.overflow = '';
  stopParticles();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

fsExit.addEventListener('click', closeFs);

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && fsOverlay.classList.contains('active')) closeFs();
});

// ═══════════════════════════════════════
// EXIT BUTTON PROXIMITY REVEAL
// ═══════════════════════════════════════
const PROXIMITY = 150;

document.addEventListener('mousemove', e => {
  if (!fsOverlay.classList.contains('active')) return;

  const btnCenterX = window.innerWidth - 45;
  const btnCenterY = 45;
  const dx         = e.clientX - btnCenterX;
  const dy         = e.clientY - btnCenterY;
  const dist       = Math.sqrt(dx * dx + dy * dy);

  if (dist < PROXIMITY) {
    fsExit.classList.add('visible');
  } else {
    fsExit.classList.remove('visible');
  }
});

// ═══════════════════════════════════════
// CHORD TOOL
// ═══════════════════════════════════════

const ALL_NOTES  = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLAT_NOTES = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

const ENHARMONIC = {
  'C#':'Db', 'Db':'C#', 'D#':'Eb', 'Eb':'D#',
  'F#':'Gb', 'Gb':'F#', 'G#':'Ab', 'Ab':'G#',
  'A#':'Bb', 'Bb':'A#',
};

const CHORD_FORMULAS = {
  // Triads
  '':        { name: 'Major',           intervals: [0,4,7]          },
  'maj':     { name: 'Major',           intervals: [0,4,7]          },
  'M':       { name: 'Major',           intervals: [0,4,7]          },
  'm':       { name: 'Minor',           intervals: [0,3,7]          },
  'min':     { name: 'Minor',           intervals: [0,3,7]          },
  'dim':     { name: 'Diminished',      intervals: [0,3,6]          },
  'aug':     { name: 'Augmented',       intervals: [0,4,8]          },
  'sus2':    { name: 'Suspended 2nd',   intervals: [0,2,7]          },
  'sus4':    { name: 'Suspended 4th',   intervals: [0,5,7]          },
  '5':       { name: 'Power Chord',     intervals: [0,7]            },
  // 7th chords
  '7':       { name: 'Dominant 7th',    intervals: [0,4,7,10]       },
  'maj7':    { name: 'Major 7th',       intervals: [0,4,7,11]       },
  'M7':      { name: 'Major 7th',       intervals: [0,4,7,11]       },
  'm7':      { name: 'Minor 7th',       intervals: [0,3,7,10]       },
  'min7':    { name: 'Minor 7th',       intervals: [0,3,7,10]       },
  'dim7':    { name: 'Diminished 7th',  intervals: [0,3,6,9]        },
  'm7b5':    { name: 'Half Diminished', intervals: [0,3,6,10]       },
  'ø7':      { name: 'Half Diminished', intervals: [0,3,6,10]       },
  'aug7':    { name: 'Augmented 7th',   intervals: [0,4,8,10]       },
  'augmaj7': { name: 'Augmented Maj7',  intervals: [0,4,8,11]       },
  'mmaj7':   { name: 'Minor Major 7th', intervals: [0,3,7,11]       },
  // 9th chords
  '9':       { name: 'Dominant 9th',    intervals: [0,4,7,10,14]    },
  'maj9':    { name: 'Major 9th',       intervals: [0,4,7,11,14]    },
  'm9':      { name: 'Minor 9th',       intervals: [0,3,7,10,14]    },
  'add9':    { name: 'Add 9',           intervals: [0,4,7,14]       },
  'madd9':   { name: 'Minor Add 9',     intervals: [0,3,7,14]       },
  '6/9':     { name: 'Six Nine',        intervals: [0,4,7,9,14]     },
  // 11th chords
  '11':      { name: 'Dominant 11th',   intervals: [0,4,7,10,14,17] },
  'maj11':   { name: 'Major 11th',      intervals: [0,4,7,11,14,17] },
  'm11':     { name: 'Minor 11th',      intervals: [0,3,7,10,14,17] },
  // 13th chords
  '13':      { name: 'Dominant 13th',   intervals: [0,4,7,10,14,17,21] },
  'maj13':   { name: 'Major 13th',      intervals: [0,4,7,11,14,17,21] },
  'm13':     { name: 'Minor 13th',      intervals: [0,3,7,10,14,17,21] },
  // 6th chords
  '6':       { name: 'Major 6th',       intervals: [0,4,7,9]        },
  'm6':      { name: 'Minor 6th',       intervals: [0,3,7,9]        },
  // Altered
  '7b5':     { name: 'Dominant 7b5',    intervals: [0,4,6,10]       },
  '7#5':     { name: 'Dominant 7#5',    intervals: [0,4,8,10]       },
  '7b9':     { name: 'Dominant 7b9',    intervals: [0,4,7,10,13]    },
  '7#9':     { name: 'Dominant 7#9',    intervals: [0,4,7,10,15]    },
  '7#11':    { name: 'Lydian Dominant', intervals: [0,4,7,10,14,18] },
  'alt':     { name: 'Altered',         intervals: [0,4,6,10,13,15] },
};

const GUITAR_VOICINGS = {
  'C':  [
    { frets: [-1,3,2,0,1,0],      name: 'Open C'       },
    { frets: [-1,3,2,0,1,3],      name: 'Open C (full)' },
    { frets: [8,10,10,9,8,8],     name: 'Barre VIII'   },
  ],
  'Cm': [
    { frets: [-1,3,5,5,4,3],      name: 'Barre III'  },
    { frets: [8,10,10,8,8,8],     name: 'Barre VIII' },
  ],
  'C7': [
    { frets: [-1,3,2,3,1,0],      name: 'Open C7'    },
    { frets: [8,10,8,9,8,8],      name: 'Barre VIII' },
  ],
  'Cmaj7': [
    { frets: [-1,3,2,0,0,0],      name: 'Open Cmaj7' },
    { frets: [8,10,9,9,8,8],      name: 'Barre VIII' },
  ],
  'Cm7': [
    { frets: [-1,3,5,3,4,3],      name: 'Barre III'  },
    { frets: [8,10,8,8,8,8],      name: 'Barre VIII' },
  ],
  'Cdim':  [{ frets: [-1,-1,1,2,1,2],   name: 'Cdim'  }],
  'Caug':  [{ frets: [-1,-1,2,1,1,0],   name: 'Caug'  }],
  'Csus2': [{ frets: [-1,3,0,0,1,3],    name: 'Csus2' }],
  'Csus4': [{ frets: [-1,3,3,0,1,1],    name: 'Csus4' }],
  'D':  [
    { frets: [-1,-1,0,2,3,2],     name: 'Open D'       },
    { frets: [-1,5,4,2,3,2],      name: 'Open D (full)' },
    { frets: [10,12,12,11,10,10], name: 'Barre X'      },
  ],
  'Dm': [
    { frets: [-1,-1,0,2,3,1],     name: 'Open Dm' },
    { frets: [10,12,12,10,10,10], name: 'Barre X' },
  ],
  'D7': [
    { frets: [-1,-1,0,2,1,2],     name: 'Open D7' },
    { frets: [10,12,10,11,10,10], name: 'Barre X' },
  ],
  'Dmaj7': [{ frets: [-1,-1,0,2,2,2],   name: 'Open Dmaj7' }],
  'Dm7':   [
    { frets: [-1,-1,0,2,1,1],     name: 'Open Dm7' },
    { frets: [10,12,10,10,10,10], name: 'Barre X'  },
  ],
  'Dsus2': [{ frets: [-1,-1,0,2,3,0],   name: 'Dsus2' }],
  'Dsus4': [{ frets: [-1,-1,0,2,3,3],   name: 'Dsus4' }],
  'E':  [
    { frets: [0,2,2,1,0,0],       name: 'Open E'    },
    { frets: [7,9,9,8,7,7],       name: 'Barre VII' },
  ],
  'Em': [
    { frets: [0,2,2,0,0,0],       name: 'Open Em'   },
    { frets: [7,9,9,7,7,7],       name: 'Barre VII' },
  ],
  'E7': [
    { frets: [0,2,0,1,0,0],       name: 'Open E7'   },
    { frets: [7,9,7,8,7,7],       name: 'Barre VII' },
  ],
  'Emaj7': [{ frets: [0,2,1,1,0,0],     name: 'Open Emaj7' }],
  'Em7':   [
    { frets: [0,2,0,0,0,0],       name: 'Open Em7'  },
    { frets: [7,9,7,7,7,7],       name: 'Barre VII' },
  ],
  'F':  [
    { frets: [1,3,3,2,1,1],       name: 'Barre I'   },
    { frets: [-1,-1,3,2,1,1],     name: 'Mini F'    },
    { frets: [8,10,10,9,8,8],     name: 'Barre VIII' },
  ],
  'Fm':    [{ frets: [1,3,3,1,1,1],     name: 'Barre I' }],
  'F7':    [{ frets: [1,3,1,2,1,1],     name: 'Barre I' }],
  'Fmaj7': [
    { frets: [-1,-1,3,2,1,0],     name: 'Open Fmaj7' },
    { frets: [1,3,2,2,1,1],       name: 'Barre I'    },
  ],
  'Fm7':   [{ frets: [1,3,1,1,1,1],     name: 'Barre I' }],
  'G':  [
    { frets: [3,2,0,0,0,3],       name: 'Open G'      },
    { frets: [3,2,0,0,3,3],       name: 'Open G (alt)' },
    { frets: [3,5,5,4,3,3],       name: 'Barre III'   },
  ],
  'Gm':    [{ frets: [3,5,5,3,3,3],     name: 'Barre III' }],
  'G7':    [
    { frets: [3,2,0,0,0,1],       name: 'Open G7'  },
    { frets: [3,5,3,4,3,3],       name: 'Barre III' },
  ],
  'Gmaj7': [{ frets: [3,2,0,0,0,2],     name: 'Open Gmaj7' }],
  'Gm7':   [{ frets: [3,5,3,3,3,3],     name: 'Barre III'  }],
  'A':  [
    { frets: [-1,0,2,2,2,0],      name: 'Open A'       },
    { frets: [-1,0,2,2,2,2],      name: 'Open A (full)' },
    { frets: [5,7,7,6,5,5],       name: 'Barre V'      },
  ],
  'Am': [
    { frets: [-1,0,2,2,1,0],      name: 'Open Am' },
    { frets: [5,7,7,5,5,5],       name: 'Barre V' },
  ],
  'A7': [
    { frets: [-1,0,2,0,2,0],      name: 'Open A7' },
    { frets: [5,7,5,6,5,5],       name: 'Barre V' },
  ],
  'Amaj7': [{ frets: [-1,0,2,1,2,0],    name: 'Open Amaj7' }],
  'Am7':   [
    { frets: [-1,0,2,0,1,0],      name: 'Open Am7' },
    { frets: [5,7,5,5,5,5],       name: 'Barre V'  },
  ],
  'Asus2': [{ frets: [-1,0,2,2,0,0],    name: 'Asus2' }],
  'Asus4': [{ frets: [-1,0,2,2,3,0],    name: 'Asus4' }],
  'B':  [
    { frets: [-1,2,4,4,4,2],      name: 'Barre II'  },
    { frets: [7,9,9,8,7,7],       name: 'Barre VII' },
  ],
  'Bm': [
    { frets: [-1,2,4,4,3,2],      name: 'Barre II'  },
    { frets: [7,9,9,7,7,7],       name: 'Barre VII' },
  ],
  'B7': [
    { frets: [-1,2,1,2,0,2],      name: 'Open B7'   },
    { frets: [7,9,7,8,7,7],       name: 'Barre VII' },
  ],
  'Bmaj7': [{ frets: [-1,2,4,3,4,2],    name: 'Barre II'  }],
  'Bm7':   [
    { frets: [-1,2,4,2,3,2],      name: 'Barre II'  },
    { frets: [7,9,7,7,7,7],       name: 'Barre VII' },
  ],
};

const VOICING_ALIASES = {
  'Db':'C#', 'C#':'Db',
  'Eb':'D#', 'D#':'Eb',
  'Gb':'F#', 'F#':'Gb',
  'Ab':'G#', 'G#':'Ab',
  'Bb':'A#', 'A#':'Bb',
};

function generateBarreVoicing(rootNote, suffix) {
  const rootIdx = getNoteIndex(rootNote);
  const baseE   = {
    '':     [0,2,2,1,0,0],  'm':    [0,2,2,0,0,0],
    '7':    [0,2,0,1,0,0],  'maj7': [0,2,1,1,0,0],
    'm7':   [0,2,0,0,0,0],  'dim':  [0,1,2,0,-1,-1],
    'sus2': [0,2,2,2,0,0],  'sus4': [0,2,2,2,3,0],
  };
  const baseA = {
    '':     [-1,0,2,2,2,0], 'm':    [-1,0,2,2,1,0],
    '7':    [-1,0,2,0,2,0], 'maj7': [-1,0,2,1,2,0],
    'm7':   [-1,0,2,0,1,0],
  };

  const eRoots = ['E','F','F#','G','G#','A','A#','B','C','C#','D','D#'];
  const aRoots = ['A','A#','B','C','C#','D','D#','E','F','F#','G','G#'];

  const normalSuffix = suffix.replace('min', 'm').replace('M7', 'maj7');
  const shape        = baseE[normalSuffix] || baseE[''];
  const eIdx         = eRoots.indexOf(ALL_NOTES[rootIdx]);

  if (eIdx !== -1 && eIdx > 0) {
    return [{ frets: shape.map(f => f === -1 ? -1 : f + eIdx), name: `Barre ${toRoman(eIdx)}` }];
  }

  const aShape = baseA[normalSuffix] || baseA[''];
  const aIdx   = aRoots.indexOf(ALL_NOTES[rootIdx]);
  if (aIdx !== -1) {
    return [{ frets: aShape.map(f => f === -1 ? -1 : f + aIdx), name: `Barre ${toRoman(aIdx)}` }];
  }

  return [];
}

function toRoman(n) {
  const vals = [10,'X', 9,'IX', 8,'VIII', 7,'VII', 6,'VI', 5,'V', 4,'IV', 3,'III', 2,'II', 1,'I'];
  let result  = '';
  for (let i = 0; i < vals.length; i += 2) {
    while (n >= vals[i]) { result += vals[i + 1]; n -= vals[i]; }
  }
  return result;
}

function getNoteIndex(note) {
  let idx = ALL_NOTES.indexOf(note);
  if (idx === -1) idx = FLAT_NOTES.indexOf(note);
  return idx;
}

function transposeNote(note, semitones) {
  const idx = getNoteIndex(note);
  if (idx === -1) return note;
  const newIdx    = (idx + semitones + 12) % 12;
  const flatRoots = ['F','Bb','Eb','Ab','Db','Gb'];
  if (flatRoots.some(r => note.includes('b') || semitones > 0)) {
    return FLAT_NOTES[newIdx];
  }
  return ALL_NOTES[newIdx];
}

function parseChord(input) {
  input = input.trim();
  if (!input) return null;

  const rootMatch = input.match(/^([A-Ga-g][#b]?)/);
  if (!rootMatch) return null;

  let root = rootMatch[1];
  root = root.charAt(0).toUpperCase() + root.slice(1);

  const suffix = input.slice(root.length);
  let formula  = CHORD_FORMULAS[suffix];

  if (!formula) {
    const lc = suffix.toLowerCase();
    for (const key of Object.keys(CHORD_FORMULAS)) {
      if (key.toLowerCase() === lc) { formula = CHORD_FORMULAS[key]; break; }
    }
  }

  if (!formula) return null;

  const rootIdx  = getNoteIndex(root);
  if (rootIdx === -1) return null;

  const useFlats = ['F','Bb','Eb','Ab','Db','Gb'].includes(root) || root.includes('b');

  const notes = formula.intervals.map(interval => {
    const noteIdx = (rootIdx + interval) % 12;
    return useFlats ? FLAT_NOTES[noteIdx] : ALL_NOTES[noteIdx];
  });

  return {
    root,
    suffix,
    fullName:      root + suffix,
    chordTypeName: formula.name,
    intervals:     formula.intervals,
    notes,
  };
}

function getVoicings(root, suffix) {
  const key     = root + suffix;
  let voicings  = GUITAR_VOICINGS[key];

  if (!voicings) {
    const alt = VOICING_ALIASES[root];
    if (alt) voicings = GUITAR_VOICINGS[alt + suffix];
  }

  if (!voicings || voicings.length === 0) {
    voicings = generateBarreVoicing(root, suffix);
  }

  return voicings || [];
}

function buildPiano(chordNotes, rootNote) {
  const piano = document.getElementById('piano');
  piano.innerHTML = '';

  const whitePattern = [
    { note:'C', oct:4 }, { note:'D', oct:4 }, { note:'E', oct:4 },
    { note:'F', oct:4 }, { note:'G', oct:4 }, { note:'A', oct:4 }, { note:'B', oct:4 },
    { note:'C', oct:5 }, { note:'D', oct:5 }, { note:'E', oct:5 },
    { note:'F', oct:5 }, { note:'G', oct:5 }, { note:'A', oct:5 }, { note:'B', oct:5 },
  ];

  const blackPattern = [
    { note:'C#', offset:1  }, { note:'D#', offset:2  },
    { note:'F#', offset:4  }, { note:'G#', offset:5  }, { note:'A#', offset:6  },
    { note:'C#', offset:8  }, { note:'D#', offset:9  },
    { note:'F#', offset:11 }, { note:'G#', offset:12 }, { note:'A#', offset:13 },
  ];

  const whiteKeyWidth = 37;
  const container     = document.createElement('div');
  container.style.position = 'relative';
  container.style.width    = `${whitePattern.length * whiteKeyWidth}px`;
  container.style.height   = '140px';

  whitePattern.forEach((k, i) => {
    const key = document.createElement('div');
    key.className  = 'piano-key white';
    key.style.position = 'absolute';
    key.style.left     = `${i * whiteKeyWidth}px`;
    key.style.width    = `${whiteKeyWidth - 1}px`;

    const isActive = chordNotes.some(n => {
      const ni = getNoteIndex(n);
      const ki = getNoteIndex(k.note);
      return ni !== -1 && ki !== -1 && ni === ki;
    });
    const isRoot = getNoteIndex(k.note) === getNoteIndex(rootNote);

    if (isRoot && isActive)  key.classList.add('root-key');
    else if (isActive)       key.classList.add('active');

    container.appendChild(key);
  });

  blackPattern.forEach(k => {
    const key = document.createElement('div');
    key.className  = 'piano-key black';
    key.style.left = `${k.offset * whiteKeyWidth - 11}px`;

    const enharmonic = ENHARMONIC[k.note] || '';
    const isActive   = chordNotes.some(n => {
      const ni = getNoteIndex(n);
      const ki = getNoteIndex(k.note);
      return ni !== -1 && ki !== -1 && ni === ki;
    });
    const isRoot = getNoteIndex(k.note)    === getNoteIndex(rootNote) ||
                   getNoteIndex(enharmonic) === getNoteIndex(rootNote);

    if (isRoot && isActive)  key.classList.add('root-key');
    else if (isActive)       key.classList.add('active');

    container.appendChild(key);
  });

  piano.appendChild(container);
}

let currentVoicingIndex = 0;

function buildFretboard(voicings, chordData) {
  if (!voicings.length) {
    document.getElementById('fretboard').innerHTML =
      '<p style="color:var(--text-muted);text-align:center;padding:1rem">No voicing found</p>';
    return;
  }

  const voicingTabs = document.getElementById('voicingTabs');
  voicingTabs.innerHTML = '';
  voicings.forEach((v, i) => {
    const tab = document.createElement('button');
    tab.className   = 'voicing-tab' + (i === currentVoicingIndex ? ' active' : '');
    tab.textContent = v.name;
    tab.addEventListener('click', () => {
      currentVoicingIndex = i;
      document.querySelectorAll('.voicing-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderFretboard(voicings[i], chordData);
    });
    voicingTabs.appendChild(tab);
  });

  renderFretboard(voicings[currentVoicingIndex], chordData);
}

function renderFretboard(voicing, chordData) {
  const fretboard  = document.getElementById('fretboard');
  const fretCount  = parseInt(document.getElementById('fretCount').value);
  const tuningStr  = document.getElementById('guitarTuning').value;
  const tuning     = tuningStr.split(',');

  document.getElementById('voicingName').textContent = voicing.name;

  // Find the lowest non-open fret pressed to anchor the display window
  const playedFrets = voicing.frets.filter(f => f > 0);
  const minFret     = playedFrets.length ? Math.min(...playedFrets) : 1;
  // If any fret is 1 or 2, start at fret 1 (open position), otherwise start at minFret
  const startFret   = minFret <= 2 ? 1 : minFret;

  fretboard.innerHTML = '';

  const inlayFrets       = [3, 5, 7, 9, 12, 15, 17, 19, 24];
  const doubleInlays     = [12, 24];
  const stringsContainer = document.createElement('div');
  stringsContainer.className = 'fretboard-strings';

  // Reverse so low E (string 6) is at top visually
  const reversedFrets  = [...voicing.frets];
  const reversedTuning = [...tuning];

  reversedFrets.forEach((fretNum, strIdx) => {
    const row = document.createElement('div');
    row.className = 'fret-row';

    // String label (e.g. E, A, D...)
    const label = document.createElement('div');
    label.className   = 'string-name';
    label.textContent = reversedTuning[strIdx];
    row.appendChild(label);

    // Pre-nut cell: shows ✕ muted or ○ open
    const openCell = document.createElement('div');
    openCell.className = 'fret-cell open-indicator';

    if (fretNum === -1) {
      const dot = document.createElement('div');
      dot.className   = 'fret-dot muted';
      dot.textContent = '✕';
      openCell.appendChild(dot);
    } else if (fretNum === 0) {
      const dot        = document.createElement('div');
      dot.className    = 'fret-dot open';
      dot.textContent  = '○';

      const openNote    = reversedTuning[strIdx];
      const noteInChord = chordData.notes.some(n =>
        getNoteIndex(n) === getNoteIndex(openNote)
      );
      const isRoot = getNoteIndex(openNote) === getNoteIndex(chordData.root);

      if (isRoot)           dot.classList.add('root-dot');
      else if (noteInChord) dot.classList.add('note');

      openCell.appendChild(dot);
    }
    row.appendChild(openCell);

    // Fret cells for the visible window [startFret .. startFret + fretCount - 1]
    for (let f = startFret; f < startFret + fretCount; f++) {
      const cell = document.createElement('div');
      cell.className = 'fret-cell';

      // String line running through the cell
      const stringLine = document.createElement('div');
      stringLine.className = 'string-line';
      cell.appendChild(stringLine);

      // Nut indicator on the left edge of fret 1
      if (f === 1 && startFret === 1) {
        cell.classList.add('at-nut');
      }

      // Place a dot if this string is fretted here
      if (fretNum === f) {
        const openNoteIdx    = getNoteIndex(reversedTuning[strIdx]);
        const frettedNoteIdx = (openNoteIdx + f) % 12;
        const isRoot         = frettedNoteIdx === getNoteIndex(chordData.root);

        const dot = document.createElement('div');
        dot.className   = isRoot ? 'fret-dot root-dot' : 'fret-dot note';
        dot.textContent = isRoot ? 'R' : '';
        cell.appendChild(dot);
      }

      row.appendChild(cell);
    }

    stringsContainer.appendChild(row);
  });

  fretboard.appendChild(stringsContainer);

  // ── Fret number labels ──
  const fretNumsRow = document.createElement('div');
  fretNumsRow.className = 'fret-numbers';

  // Spacer to align under fret cells (past string-name + open-indicator)
  const numSpacer = document.createElement('div');
  numSpacer.className = 'fret-num-spacer';
  fretNumsRow.appendChild(numSpacer);

  for (let f = startFret; f < startFret + fretCount; f++) {
    const num = document.createElement('div');
    num.className   = 'fret-number';
    num.textContent = f;
    fretNumsRow.appendChild(num);
  }
  fretboard.appendChild(fretNumsRow);

  // ── Inlay dots ──
  const inlayRow = document.createElement('div');
  inlayRow.className = 'fretboard-inlays';

  const inlaySpacer = document.createElement('div');
  inlaySpacer.className = 'fret-num-spacer';
  inlayRow.appendChild(inlaySpacer);

  for (let f = startFret; f < startFret + fretCount; f++) {
    const cell = document.createElement('div');
    cell.className = 'inlay-cell';

    if (doubleInlays.includes(f)) {
      // Double dot at 12th and 24th
      const dotWrap = document.createElement('div');
      dotWrap.className = 'inlay-dot-wrap double';
      dotWrap.innerHTML = `<div class="inlay-dot"></div><div class="inlay-dot"></div>`;
      cell.appendChild(dotWrap);
    } else if (inlayFrets.includes(f)) {
      const dot = document.createElement('div');
      dot.className = 'inlay-dot';
      cell.appendChild(dot);
    }

    inlayRow.appendChild(cell);
  }
  fretboard.appendChild(inlayRow);
}

function buildRelatedChords(root) {
  const rootIdx  = getNoteIndex(root);
  const useFlats = ['F','Bb','Eb','Ab','Db','Gb'].includes(root) || root.includes('b');

  const majorScale = [0,2,4,5,7,9,11].map(i => {
    const ni = (rootIdx + i) % 12;
    return useFlats ? FLAT_NOTES[ni] : ALL_NOTES[ni];
  });

  const diatonicSuffixes = ['','m','m','','','m','dim'];
  const diatonicNames    = ['I','ii','iii','IV','V','vi','vii°'];
  const grid             = document.getElementById('relatedChordsGrid');
  grid.innerHTML = '';

  majorScale.forEach((note, i) => {
    const btn = document.createElement('button');
    btn.className = 'related-chord-btn';
    btn.innerHTML = `${note}${diatonicSuffixes[i]}<br><small>${diatonicNames[i]}</small>`;
    btn.addEventListener('click', () => {
      document.getElementById('chordInput').value = note + diatonicSuffixes[i];
      handleChordInput(note + diatonicSuffixes[i]);
    });
    grid.appendChild(btn);
  });

  const v7Note = majorScale[4];
  const v7btn  = document.createElement('button');
  v7btn.className = 'related-chord-btn';
  v7btn.innerHTML = `${v7Note}7<br><small>V7</small>`;
  v7btn.addEventListener('click', () => {
    document.getElementById('chordInput').value = v7Note + '7';
    handleChordInput(v7Note + '7');
  });
  grid.appendChild(v7btn);
}

const COMMON_SUFFIXES = [
  '','m','7','maj7','m7','dim','aug','sus2','sus4',
  '9','maj9','m9','6','m6','dim7','m7b5','add9','5',
  '11','13','7b9','7#9','mmaj7','augmaj7',
];

function showSuggestions(input) {
  const sugBox = document.getElementById('chordSuggestions');
  sugBox.innerHTML = '';
  if (!input || input.length < 1) return;

  const rootMatch = input.match(/^([A-Ga-g][#b]?)/);
  if (!rootMatch) return;

  const root  = rootMatch[1].charAt(0).toUpperCase() + rootMatch[1].slice(1);
  const typed = input.slice(root.length).toLowerCase();

  const matches = COMMON_SUFFIXES
    .filter(s => s.toLowerCase().startsWith(typed))
    .slice(0, 6);

  if (!matches.length || (matches.length === 1 && matches[0].toLowerCase() === typed)) return;

  matches.forEach(s => {
    const formula = CHORD_FORMULAS[s];
    if (!formula) return;
    const item = document.createElement('div');
    item.className = 'chord-suggestion-item';
    item.innerHTML = `
      <span class="sugg-name">${root}${s}</span>
      <span class="sugg-type">${formula.name}</span>
    `;
    item.addEventListener('click', () => {
      document.getElementById('chordInput').value = root + s;
      sugBox.innerHTML = '';
      handleChordInput(root + s);
    });
    sugBox.appendChild(item);
  });
}

function handleChordInput(value) {
  const chord = parseChord(value);

  if (!chord) {
    document.getElementById('chordInfo').style.display            = 'none';
    document.getElementById('chordVisualSection').style.display   = 'none';
    document.getElementById('chordTransposeRow').style.display    = 'none';
    document.getElementById('relatedChordsSection').style.display = 'none';
    return;
  }

  document.getElementById('chordInfo').style.display            = 'flex';
  document.getElementById('chordVisualSection').style.display   = 'block';
  document.getElementById('chordTransposeRow').style.display    = 'block';
  document.getElementById('relatedChordsSection').style.display = 'block';

  document.getElementById('chordNameDisplay').textContent = chord.fullName;
  document.getElementById('chordFormula').textContent     = chord.chordTypeName;

  const notesRow = document.getElementById('chordNotesRow');
  notesRow.innerHTML = '';
  chord.notes.forEach((note, i) => {
    const pill = document.createElement('div');
    pill.className   = 'chord-note-pill' + (i === 0 ? ' root' : '');
    pill.textContent = note;
    notesRow.appendChild(pill);
  });

  const woodwindInfo = isWoodwind();
  if (woodwindInfo) {
    buildFingerings(chord.notes, chord.root, woodwindInfo);
  } else {
    buildPiano(chord.notes, chord.root);
  }

  const oldLegend = document.querySelector('.fingering-legend');
  if (oldLegend && !woodwindInfo) oldLegend.remove();

  currentVoicingIndex = 0;
  const voicings      = getVoicings(chord.root, chord.suffix);
  buildFretboard(voicings, chord);

  updateTransposition(chord);
  buildRelatedChords(chord.root);
}

function updateTransposition(chord) {
  const semitones = parseInt(document.getElementById('transposeInstrument').value);
  const resultDiv = document.getElementById('transposedResult');

  if (semitones === 0) {
    resultDiv.style.display = 'none';
    return;
  }

  resultDiv.style.display = 'flex';
  const newRoot = transposeNote(chord.root, semitones);
  document.getElementById('transposedChord').textContent = newRoot + chord.suffix;
}

const chordInputEl = document.getElementById('chordInput');

chordInputEl.addEventListener('input', e => {
  showSuggestions(e.target.value);
  handleChordInput(e.target.value);
});

chordInputEl.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.getElementById('chordSuggestions').innerHTML = '';
  }
});

document.addEventListener('click', e => {
  if (!e.target.closest('.chord-search-wrap')) {
    document.getElementById('chordSuggestions').innerHTML = '';
  }
});

document.getElementById('transposeInstrument').addEventListener('change', () => {
  const chord = parseChord(chordInputEl.value);
  if (!chord) return;
  updateTransposition(chord);

  const woodwindInfo = isWoodwind();
  const oldLegend    = document.querySelector('.fingering-legend');
  if (woodwindInfo) {
    buildFingerings(chord.notes, chord.root, woodwindInfo);
  } else {
    if (oldLegend) oldLegend.remove();
    buildPiano(chord.notes, chord.root);
  }
});

document.getElementById('fretCount').addEventListener('input', e => {
  document.getElementById('fretCountLabel').textContent = e.target.value;
  const chord = parseChord(chordInputEl.value);
  if (chord) {
    const voicings = getVoicings(chord.root, chord.suffix);
    if (voicings.length) renderFretboard(voicings[currentVoicingIndex], chord);
  }
});

document.getElementById('guitarTuning').addEventListener('change', () => {
  const chord = parseChord(chordInputEl.value);
  if (chord) {
    const voicings = getVoicings(chord.root, chord.suffix);
    if (voicings.length) renderFretboard(voicings[currentVoicingIndex], chord);
  }
});

// ═══════════════════════════════════════
// BASE CONVERTER
// ═══════════════════════════════════════
const baseFrom           = document.getElementById('baseFrom');
const baseFromCustomRow  = document.getElementById('baseFromCustomRow');
const baseInput          = document.getElementById('baseInput');
const customBaseResult   = document.getElementById('customBaseResult');
const bitVisual          = document.getElementById('bitVisual');
const bitRow             = document.getElementById('bitRow');
const bitNote            = document.getElementById('bitNote');

baseFrom.addEventListener('change', () => {
  baseFromCustomRow.style.display = baseFrom.value === 'custom' ? 'flex' : 'none';
});

document.querySelectorAll('.copy-btn[data-base]').forEach(btn => {
  btn.addEventListener('click', () => {
    const base = btn.dataset.base;
    const el   = base === 'custom'
      ? document.getElementById('baseOutCustom')
      : document.getElementById(`baseOut${base}`);
    if (!el || el.textContent === '—' || el.textContent === 'Invalid') return;
    navigator.clipboard.writeText(el.textContent).then(() => {
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = orig, 1500);
    });
  });
});

function updateBitVisual(decValue) {
  if (decValue < 0 || decValue > 4294967295) {
    bitVisual.style.display = 'none';
    return;
  }
  bitVisual.style.display = 'block';

  const bits   = decValue <= 255 ? 8 : decValue <= 65535 ? 16 : 32;
  const binStr = decValue.toString(2).padStart(bits, '0');
  bitRow.innerHTML = '';

  for (let i = 0; i < binStr.length; i++) {
    if (i > 0 && i % 4 === 0) {
      const spacer = document.createElement('div');
      spacer.style.width = '6px';
      bitRow.appendChild(spacer);
    }
    const cell = document.createElement('div');
    cell.className   = `bit-cell ${binStr[i] === '1' ? 'on' : 'off'}`;
    cell.textContent = binStr[i];
    bitRow.appendChild(cell);
  }

  bitNote.textContent = `${bits}-bit · ${
    decValue <= 255   ? '1 byte' :
    decValue <= 65535 ? '2 bytes' : '4 bytes'
  }`;
}

document.getElementById('convertBase').addEventListener('click', () => {
  const rawInput = baseInput.value.trim().toUpperCase();
  if (!rawInput) return;

  const fromBase = baseFrom.value === 'custom'
    ? parseInt(document.getElementById('baseFromCustom').value)
    : parseInt(baseFrom.value);

  if (isNaN(fromBase) || fromBase < 2 || fromBase > 36) {
    baseInput.style.borderColor = 'var(--accent-rose)';
    return;
  }
  baseInput.style.borderColor = '';

  const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, fromBase);
  const isValid    = rawInput.split('').every(c => validChars.includes(c));

  if (!isValid) {
    document.getElementById('baseOut2').textContent        = 'Invalid';
    document.getElementById('baseOut8').textContent        = 'Invalid';
    document.getElementById('baseOut10').textContent       = 'Invalid';
    document.getElementById('baseOut16').textContent       = 'Invalid';
    document.getElementById('baseOutCustom').textContent   = 'Invalid';
    bitVisual.style.display = 'none';
    return;
  }

  const decVal = parseInt(rawInput, fromBase);
  document.getElementById('baseOut2').textContent  = decVal.toString(2);
  document.getElementById('baseOut8').textContent  = decVal.toString(8);
  document.getElementById('baseOut10').textContent = decVal.toString(10);
  document.getElementById('baseOut16').textContent = decVal.toString(16).toUpperCase();

  const toCustomBase = parseInt(document.getElementById('baseFromCustom').value);
  if (!isNaN(toCustomBase) && toCustomBase >= 2 && toCustomBase <= 36) {
    customBaseResult.style.display = 'block';
    document.getElementById('customBaseTag').textContent   = `B${toCustomBase}`;
    document.getElementById('customBaseLabel').textContent = `Base ${toCustomBase}`;
    document.getElementById('baseOutCustom').textContent   = decVal.toString(toCustomBase).toUpperCase();
  }

  updateBitVisual(decVal);
});

baseInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('convertBase').click();
});

document.getElementById('asciiCharInput').addEventListener('input', e => {
  const char = e.target.value;
  if (!char) {
    document.getElementById('asciiDec').textContent = '—';
    document.getElementById('asciiHex').textContent = '—';
    document.getElementById('asciiBin').textContent = '—';
    return;
  }
  const code = char.charCodeAt(0);
  document.getElementById('asciiDec').textContent = code;
  document.getElementById('asciiHex').textContent = code.toString(16).toUpperCase().padStart(2, '0');
  document.getElementById('asciiBin').textContent = code.toString(2).padStart(8, '0');
});

console.log('chord input el:', document.getElementById('chordInput'));
console.log('chord info el:',  document.getElementById('chordInfo'));
console.log('parse test:',     parseChord('Cm7'));

// ═══════════════════════════════════════
// WOODWIND FINGERING SYSTEM
// ═══════════════════════════════════════
const CLARINET_FINGERINGS = {
  // ── Chalumeau register (register key OFF) ──

  // E3: All main holes closed, throat keys closed
  'E3':  { holes:['c','c','c','c','c','c','c','c'], lKeys:[], rKeys:[], register:false },

  // F3: RH4 open
  'F3':  { holes:['c','c','c','c','c','c','c','o'], lKeys:[], rKeys:[], register:false },

  // F#3/Gb3: RH3 open, RH4 closed
  'F#3': { holes:['c','c','c','c','c','c','o','c'], lKeys:[], rKeys:[], register:false },
  'Gb3': { holes:['c','c','c','c','c','c','o','c'], lKeys:[], rKeys:[], register:false },

  // G3: RH3 and RH4 open
  'G3':  { holes:['c','c','c','c','c','c','o','o'], lKeys:[], rKeys:[], register:false },

  // G#3/Ab3: G3 fingering + side G# key
  'G#3': { holes:['c','c','c','c','c','c','o','o'], lKeys:['Gsharp'], rKeys:[], register:false },
  'Ab3': { holes:['c','c','c','c','c','c','o','o'], lKeys:['Gsharp'], rKeys:[], register:false },

  // A3: LH1+LH2+LH3+RH1 closed, RH2+RH3+RH4 open
  'A3':  { holes:['c','c','c','c','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // Bb3/A#3: A3 fingering + side Bb key (long Bb)
  'Bb3': { holes:['c','c','c','c','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:false },
  'A#3': { holes:['c','c','c','c','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:false },

  // B3: LH1+LH2+LH3 closed, RH1 open, rest open
  'B3':  { holes:['c','c','c','o','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // C4: LH1+LH2 closed, rest open (throat C)
  'C4':  { holes:['c','c','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // C#4/Db4: LH1 only closed (throat C#)
  'C#4': { holes:['c','o','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:false },
  'Db4': { holes:['c','o','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // D4: all open, use side trill key or standard
  // Standard D4: LH1+LH2+LH3 + RH1+RH2+RH3 closed (fork fingering)
  'D4':  { holes:['c','c','c','c','c','c','o','o'], lKeys:[], rKeys:[], register:false },
  // Note: D4 is typically played with register key OFF using the same fingering as D5 but no register

  // D#4/Eb4: Like D4 but add Eb/D# side key
  'D#4': { holes:['c','c','c','c','c','c','o','o'], lKeys:['Gsharp'], rKeys:[], register:false },
  'Eb4': { holes:['c','c','c','c','c','c','o','o'], lKeys:['Gsharp'], rKeys:[], register:false },

  // E4: LH1+LH2+LH3+RH1 closed, RH2+ open
  'E4':  { holes:['c','c','c','c','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // F4: LH1+LH2+LH3 closed, all RH open
  'F4':  { holes:['c','c','c','o','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // F#4/Gb4: F4 + side F# key
  'F#4': { holes:['c','c','c','o','o','o','o','o'], lKeys:[], rKeys:['Fsharp'], register:false },
  'Gb4': { holes:['c','c','c','o','o','o','o','o'], lKeys:[], rKeys:['Fsharp'], register:false },

  // G4: LH1+LH2 closed, rest open
  'G4':  { holes:['c','c','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:false },

  // G#4/Ab4: LH1 closed + G# key
  'G#4': { holes:['c','o','o','o','o','o','o','o'], lKeys:['Gsharp'], rKeys:[], register:false },
  'Ab4': { holes:['c','o','o','o','o','o','o','o'], lKeys:['Gsharp'], rKeys:[], register:false },

  // ── Clarion register (register key ON) ──
  // These mirror the chalumeau fingerings but with register:true
  // The register key (thumb hole vented) raises pitch a 12th

  'A4':  { holes:['c','c','c','c','c','c','c','c'], lKeys:[], rKeys:[], register:true },
  'Bb4': { holes:['c','c','c','c','c','c','c','o'], lKeys:[], rKeys:[], register:true },
  'A#4': { holes:['c','c','c','c','c','c','c','o'], lKeys:[], rKeys:[], register:true },
  'B4':  { holes:['c','c','c','c','c','c','o','c'], lKeys:[], rKeys:[], register:true },
  'C5':  { holes:['c','c','c','c','c','c','o','o'], lKeys:[], rKeys:[], register:true },
  'C#5': { holes:['c','c','c','c','c','c','o','o'], lKeys:['Gsharp'], rKeys:[], register:true },
  'Db5': { holes:['c','c','c','c','c','c','o','o'], lKeys:['Gsharp'], rKeys:[], register:true },
  'D5':  { holes:['c','c','c','c','o','o','o','o'], lKeys:[], rKeys:[], register:true },
  'D#5': { holes:['c','c','c','c','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:true },
  'Eb5': { holes:['c','c','c','c','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:true },
  'E5':  { holes:['c','c','c','o','o','o','o','o'], lKeys:[], rKeys:[], register:true },
  'F5':  { holes:['c','c','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:true },
  'F#5': { holes:['c','c','o','o','o','o','o','o'], lKeys:[], rKeys:['Fsharp'], register:true },
  'Gb5': { holes:['c','c','o','o','o','o','o','o'], lKeys:[], rKeys:['Fsharp'], register:true },
  'G5':  { holes:['c','o','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:true },
  'G#5': { holes:['c','o','o','o','o','o','o','o'], lKeys:['Gsharp'], rKeys:[], register:true },
  'Ab5': { holes:['c','o','o','o','o','o','o','o'], lKeys:['Gsharp'], rKeys:[], register:true },

  // Upper clarion / altissimo begins around A5
  'A5':  { holes:['c','c','c','c','o','o','o','o'], lKeys:[], rKeys:[], register:true },
  'Bb5': { holes:['c','c','c','o','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:true },
  'A#5': { holes:['c','c','c','o','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:true },
  'B5':  { holes:['c','c','o','o','o','o','o','o'], lKeys:['Bb'], rKeys:[], register:true },
  'C6':  { holes:['c','o','o','o','o','o','o','o'], lKeys:[], rKeys:[], register:true },
};

function getFingering(noteName, octave) {
  // Try exact match first
  const key = noteName + octave;
  if (CLARINET_FINGERINGS[key]) return CLARINET_FINGERINGS[key];
  
  // Try enharmonic equivalent at same octave
  const enh = ENHARMONIC[noteName];
  if (enh && CLARINET_FINGERINGS[enh + octave]) 
    return CLARINET_FINGERINGS[enh + octave];
  
  // Try adjacent octaves only as last resort
  // (avoids showing wildly wrong fingerings)
  for (const delta of [1, -1]) {
    const alt = noteName + (octave + delta);
    if (CLARINET_FINGERINGS[alt]) return CLARINET_FINGERINGS[alt];
    if (enh) {
      const altEnh = enh + (octave + delta);
      if (CLARINET_FINGERINGS[altEnh]) return CLARINET_FINGERINGS[altEnh];
    }
  }
  
  return null;
}

const WOODWIND_INSTRUMENTS = {
  'Bb Clarinet':                        { label: 'Bb Clarinet',   db: 'clarinet', defaultOct: 4 },
  'Bass Clarinet (sounds M9 lower)':    { label: 'Bass Clarinet', db: 'clarinet', defaultOct: 4 },
  'A Clarinet':                         { label: 'A Clarinet',    db: 'clarinet', defaultOct: 4 },
  'Tenor Saxophone':                    { label: 'Tenor Sax',     db: 'clarinet', defaultOct: 4 },
  'Soprano Saxophone':                  { label: 'Soprano Sax',   db: 'clarinet', defaultOct: 4 },
  'Alto Saxophone':                     { label: 'Alto Sax',      db: 'clarinet', defaultOct: 4 },
  'Baritone Saxophone':                 { label: 'Bari Sax',      db: 'clarinet', defaultOct: 4 },
};

function isWoodwind() {
  const sel = document.getElementById('transposeInstrument');
  const opt = sel.options[sel.selectedIndex].text.trim();
  if (WOODWIND_INSTRUMENTS[opt]) return WOODWIND_INSTRUMENTS[opt];
  for (const key of Object.keys(WOODWIND_INSTRUMENTS)) {
    if (opt.includes(key) || key.includes(opt)) return WOODWIND_INSTRUMENTS[key];
  }
  return null;
}

function drawClarinetSVG(fingering, noteName, octave, isRoot, isSax) {
  if (!fingering) {
    return `<svg viewBox="0 0 70 240" width="70" height="240" 
      xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="62" height="232" rx="6" fill="none"
        stroke="rgba(183,110,121,0.2)" stroke-width="1"/>
      <text x="35" y="125" text-anchor="middle" font-size="9"
        fill="#7a6085" font-family="Raleway,sans-serif">no fingering</text>
    </svg>`;
  }

  const h          = fingering.holes; // [LH1, LH2, LH3, RH1, RH2, RH3, RH4(pinky)]
  const reg        = fingering.register;
  const isSaxFlag  = isSax;

  // Colours depending on root vs chord tone
  const closedFill  = isRoot ? '#c9a96e' : '#b76e79';
  const closedGlow  = isRoot ? 'rgba(201,169,110,0.55)' : 'rgba(183,110,121,0.55)';
  const openFill    = 'rgba(255,255,255,0.05)';
  const openStroke  = isRoot ? 'rgba(201,169,110,0.5)' : 'rgba(183,110,121,0.35)';
  const bodyStroke  = isSaxFlag ? '#c9a96e' : '#9b7fc7';

  // Layout constants
  const W        = 70;   // viewBox width
  const H        = 240;  // viewBox height
  const cx       = W / 2; // 35 — centre x of body tube
  const tubeW    = 14;   // width of the body tube rect
  const tubeX    = cx - tubeW / 2; // left edge of tube

  // Hole radii
  const holeR    = 6;    // main tone holes
  const regR     = 4;    // register/thumb hole

  // Y positions — register thumb at top, then LH group, gap, RH group, bell
  const regY     = 28;

  // Left hand holes: indices 0,1,2 → LH1 (index), LH2 (middle), LH3 (ring)
  const lhStartY = 55;
  const lhStep   = 22;
  const lhY      = [lhStartY, lhStartY + lhStep, lhStartY + lhStep * 2];

  // Right hand holes: indices 3,4,5,6 → RH1,RH2,RH3,RH4(pinky)
  // RH4 (pinky) is smaller and offset slightly right
  const rhStartY  = lhY[2] + 32; // gap between LH and RH groups
  const rhStep    = 20;
  const rhY       = [
    rhStartY,
    rhStartY + rhStep,
    rhStartY + rhStep * 2,
    rhStartY + rhStep * 3,
  ];
  const pinkeyR  = 4; // smaller pinky hole

  // Bell starts below RH group
  const bellTop  = rhY[3] + 18;
  const bellBot  = H - 6;

  // ── Begin SVG ────────────────────────────────────────────────────
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="70" height="240"
    xmlns="http://www.w3.org/2000/svg">`;

  // ── Note label ───────────────────────────────────────────────────
  const labelColor = isRoot ? '#c9a96e' : '#e8c4c4';
  svg += `<text x="${cx}" y="14" text-anchor="middle"
    font-size="11" font-weight="600" fill="${labelColor}"
    font-family="Cormorant Garamond,serif"
    letter-spacing="0.05em">${noteName}${octave}</text>`;

  // ── Body tube ────────────────────────────────────────────────────
  // Tube runs from just below label down to bell flare
  const tubeTopY = regY - regR - 4;
  svg += `<rect x="${tubeX}" y="${tubeTopY}" width="${tubeW}"
    height="${bellTop - tubeTopY}"
    rx="4"
    fill="rgba(30,10,55,0.6)"
    stroke="${bodyStroke}" stroke-opacity="0.25" stroke-width="1.2"/>`;

  // ── Bell flare ───────────────────────────────────────────────────
  // Flare widens from tubeW to ~28px at the bottom
  const flareTopW  = tubeW;
  const flareBotW  = 28;
  const flareTopX  = tubeX;
  const flareBotX  = cx - flareBotW / 2;
  svg += `<path d="
    M ${flareTopX} ${bellTop}
    L ${flareBotX} ${bellBot}
    L ${flareBotX + flareBotW} ${bellBot}
    L ${flareTopX + flareTopW} ${bellTop}
    Z"
    fill="rgba(30,10,55,0.5)"
    stroke="${bodyStroke}" stroke-opacity="0.25" stroke-width="1.2"/>`;

  // ── Register / thumb key ─────────────────────────────────────────
  // Shown as a small circle to the RIGHT of the tube (thumb goes on back,
  // but we show it on the side so it's visible). Filled = register on.
  const regX = tubeX + tubeW + 7; // to the right
  if (reg) {
    svg += `<circle cx="${regX}" cy="${regY}" r="${regR}"
      fill="${closedFill}"
      stroke="${closedGlow}" stroke-width="1.5"
      filter="url(#glow)"/>`;
    // connecting line to tube
    svg += `<line x1="${tubeX + tubeW}" y1="${regY}"
      x2="${regX - regR}" y2="${regY}"
      stroke="${bodyStroke}" stroke-opacity="0.3" stroke-width="1"/>`;
    svg += `<text x="${regX + regR + 3}" y="${regY + 4}"
      font-size="7" fill="${closedFill}" font-family="Raleway,sans-serif"
      opacity="0.8">R</text>`;
  } else {
    svg += `<circle cx="${regX}" cy="${regY}" r="${regR}"
      fill="${openFill}"
      stroke="${openStroke}" stroke-width="1.2"/>`;
    svg += `<line x1="${tubeX + tubeW}" y1="${regY}"
      x2="${regX - regR}" y2="${regY}"
      stroke="${bodyStroke}" stroke-opacity="0.2" stroke-width="1"/>`;
  }

  // ── Glow filter def ──────────────────────────────────────────────
  svg += `<defs>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;

  // ── Helper: draw one tone hole ───────────────────────────────────
  function holeCircle(state, hx, hy, r) {
    if (state === 'c') {
      // Closed — filled
      return `<circle cx="${hx}" cy="${hy}" r="${r}"
        fill="${closedFill}"
        stroke="${closedGlow}" stroke-width="2"
        filter="url(#glow)"/>`;
    } else if (state === 'h') {
      // Half-hole — left half filled
      return `
        <circle cx="${hx}" cy="${hy}" r="${r}"
          fill="${openFill}" stroke="${openStroke}" stroke-width="1.5"/>
        <path d="M ${hx} ${hy - r}
                 A ${r} ${r} 0 0 0 ${hx} ${hy + r} Z"
          fill="${closedFill}" stroke="none"/>`;
    } else {
      // Open
      return `<circle cx="${hx}" cy="${hy}" r="${r}"
        fill="${openFill}"
        stroke="${openStroke}" stroke-width="1.5"/>`;
    }
  }

  // ── LH holes (indices 0-2) ───────────────────────────────────────
  // Centred on tube
  for (let i = 0; i < 3; i++) {
    svg += holeCircle(h[i], cx, lhY[i], holeR);
  }

  // ── RH holes (indices 3-5, normal size; index 6, pinky) ─────────
  for (let i = 3; i <= 5; i++) {
    svg += holeCircle(h[i], cx, rhY[i - 3], holeR);
  }
  // Pinky hole (index 6) — smaller, offset slightly right
  if (h[6] !== undefined) {
    const pinkeyX = cx + 4;
    svg += holeCircle(h[6], pinkeyX, rhY[3], pinkeyR);
  }

  // ── LH / RH group labels ─────────────────────────────────────────
  svg += `<text x="${tubeX - 5}" y="${lhY[1] + 4}"
    text-anchor="end" font-size="7"
    fill="${bodyStroke}" opacity="0.45"
    font-family="Raleway,sans-serif">L</text>`;
  svg += `<text x="${tubeX - 5}" y="${rhY[1] + 4}"
    text-anchor="end" font-size="7"
    fill="${bodyStroke}" opacity="0.45"
    font-family="Raleway,sans-serif">R</text>`;

  svg += `</svg>`;
  return svg;
}

function buildFingerings(chordNotes, rootNote, instrumentInfo) {
  const container = document.getElementById('piano');
  container.innerHTML = '';
  container.style.cssText = `
    height: auto;
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 10px;
    justify-content: flex-start;
    align-items: flex-end;
    padding: 0.5rem 0.25rem 0.75rem;
    filter: none;
    -webkit-overflow-scrolling: touch;
  `;
  // centre if few enough notes to fit
  const totalW = chordNotes.length * 90;
  if (totalW < 650) {
    container.style.justifyContent = 'center';
  }

  const isSax = instrumentInfo.label.toLowerCase().includes('sax');

  chordNotes.forEach(note => {
    // Determine the best octave to show for this note
    // Clarinet written range: E3–C6 (sounding a M2 lower for Bb clarinet)
    // We pick octave based on note name — keep notes in mid range
    let octave = 4;
    const noteIdx = getNoteIndex(note);

    // Notes that naturally sit in chalumeau (lower) octave:
    // E F F# G G# A Bb B → octave 3
    // C C# D D# onwards → octave 4 in chalumeau, or octave 5 in clarion
    // For display we just show one representative fingering per note
    const lowerNotes = ['E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
    if (lowerNotes.includes(note)) octave = 3;
    else octave = 4;

    const fingering = getFingering(note, octave)
                   || getFingering(note, octave + 1)
                   || getFingering(note, octave - 1);

    const isRoot  = getNoteIndex(note) === getNoteIndex(rootNote);
    const wrapper = document.createElement('div');
    wrapper.className = 'fingering-card';
    wrapper.innerHTML = drawClarinetSVG(fingering, note, octave, isRoot, isSax);
    container.appendChild(wrapper);
  });

  // Remove old legend if any
  const oldLegend = document.querySelector('.fingering-legend');
  if (oldLegend) oldLegend.remove();

  const legend = document.createElement('div');
  legend.className = 'fingering-legend';
  legend.innerHTML = `
    <span class="fleg-item">
      <span class="fleg-dot closed"></span> closed
    </span>
    <span class="fleg-item">
      <span class="fleg-dot open"></span> open
    </span>
    <span class="fleg-item">
      <span class="fleg-reg"></span> register key (R)
    </span>
    <span class="fleg-root">gold = root note</span>
  `;
  container.after(legend);
}