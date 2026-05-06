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
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return {r, g, b};
}

function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){ h=s=0; }
  else {
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){
      case r: h=((g-b)/d+(g<b?6:0))/6; break;
      case g: h=((b-r)/d+2)/6; break;
      case b: h=((r-g)/d+4)/6; break;
    }
  }
  return {
    h: Math.round(h*360),
    s: Math.round(s*100),
    l: Math.round(l*100)
  };
}

function generatePalette(hex) {
  const {r,g,b} = hexToRgb(hex);
  const {h,s,l} = rgbToHsl(r,g,b);
  const swatches = [
    `hsl(${h},${s}%,${Math.min(l+30,95)}%)`,
    `hsl(${h},${s}%,${Math.min(l+15,90)}%)`,
    `hsl(${h},${s}%,${l}%)`,
    `hsl(${h},${s}%,${Math.max(l-15,5)}%)`,
    `hsl(${h},${s}%,${Math.max(l-30,5)}%)`,
    `hsl(${(h+30)%360},${s}%,${l}%)`,
    `hsl(${(h+180)%360},${s}%,${l}%)`,
    `hsl(${(h+210)%360},${s}%,${l}%)`,
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
  const {r,g,b} = hexToRgb(hex);
  const {h,s,l} = rgbToHsl(r,g,b);
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
const defs  = document.createElementNS('http://www.w3.org/2000/svg','defs');
const grad  = document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
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
pomRing.setAttribute('stroke','url(#ringGrad)');

const circumference = 2 * Math.PI * 90;

function formatTime(totalSecs) {
  if (totalSecs >= 3600) {
    // Show H:MM:SS when over an hour
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60).toString().padStart(2,'0');
    const s = (totalSecs % 60).toString().padStart(2,'0');
    return `${h}:${m}:${s}`;
  }
  const m = Math.floor(totalSecs / 60).toString().padStart(2,'0');
  const s = (totalSecs % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

function updatePomDisplay() {
  // Safety check
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

// Mode buttons (Focus / Short Break / Long Break / Custom)
pomModes.forEach(btn => {
  btn.addEventListener('click', () => {
    pomModes.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (btn.dataset.mins === 'custom') {
      // Show custom input, don't change time yet
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

// Set custom time button
document.getElementById('setCustomTime').addEventListener('click', () => {
  const h   = parseInt(document.getElementById('customHours').value) || 0;
  const m   = parseInt(document.getElementById('customMins').value)  || 0;
  const s   = parseInt(document.getElementById('customSecs').value)  || 0;
  const total = h * 3600 + m * 60 + s;

  if (total <= 0) {
    // Shake the inputs if nothing entered
    customTimeRow.style.animation = 'none';
    customTimeRow.offsetHeight;
    customTimeRow.style.animation = 'shake 0.3s ease';
    return;
  }

  pomTotal   = total;
  pomSeconds = total;
  resetTimer();
});

// Start / Pause
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

// Reset
pomReset.addEventListener('click', resetTimer);

// Add shake animation to css dynamically
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
  const text = wordInput.value;
  const words = text.trim() === '' ? [] : text.trim().split(/\s+/);
  wordCount.textContent     = words.length;
  charCount.textContent     = text.length;
  charNoSpace.textContent   = text.replace(/\s/g,'').length;
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
let calcExpr = '';
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
      calcExpr = calcExpr.slice(0,-1);
      calcDisplay.textContent = calcExpr || '0';
      return;
    }
    if (val === '=') {
      try {
        const result = Function('"use strict"; return (' + calcExpr.replace(/%/g,'/100') + ')')();
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
    let pool = gender === 'fem' ? femNames : gender === 'masc' ? mascNames : [...femNames, ...mascNames];
    randResult.textContent = pool[Math.floor(Math.random() * pool.length)];
  } else if (activeTab === 'decision') {
    const opts = [
      document.getElementById('dec1').value,
      document.getElementById('dec2').value,
      document.getElementById('dec3').value
    ].filter(o => o.trim());
    if (!opts.length) { randResult.textContent = 'Add options!'; return; }
    randResult.textContent = opts[Math.floor(Math.random() * opts.length)];
  }
});

// ═══════════════════════════════════════
// PASSWORD GENERATOR
// ═══════════════════════════════════════
const passLength  = document.getElementById('passLength');
const passLenLabel= document.getElementById('passLenLabel');
const passOutput  = document.getElementById('passOutput');
const strengthBar = document.getElementById('strengthBar');
const strengthLbl = document.getElementById('strengthLabel');

passLength.addEventListener('input', () => {
  passLenLabel.textContent = passLength.value;
});

function generatePassword() {
  const upper   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower   = 'abcdefghijklmnopqrstuvwxyz';
  const nums    = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let charset = '';
  if (document.getElementById('inclUpper').checked) charset += upper;
  if (document.getElementById('inclLower').checked) charset += lower;
  if (document.getElementById('inclNums').checked)  charset += nums;
  if (document.getElementById('inclSyms').checked)  charset += symbols;
  if (!charset) { passOutput.textContent = 'Select options!'; return; }
  const len = parseInt(passLength.value);
  let pass = '';
  for (let i = 0; i < len; i++) {
    pass += charset[Math.floor(Math.random() * charset.length)];
  }
  passOutput.textContent = pass;
  // Strength
  let score = 0;
  if (len >= 12) score++;
  if (len >= 16) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  const levels = [
    { label: 'Very Weak', color: '#e74c3c', w: '20%' },
    { label: 'Weak',      color: '#e67e22', w: '40%' },
    { label: 'Fair',      color: '#f1c40f', w: '60%' },
    { label: 'Strong',    color: '#2ecc71', w: '80%' },
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
    units: ['Meter','Kilometer','Mile','Yard','Foot','Inch','Centimeter','Millimeter'],
    toBase: { Meter:1, Kilometer:1000, Mile:1609.34, Yard:0.9144, Foot:0.3048, Inch:0.0254, Centimeter:0.01, Millimeter:0.001 }
  },
  weight: {
    units: ['Kilogram','Gram','Pound','Ounce','Ton','Milligram'],
    toBase: { Kilogram:1, Gram:0.001, Pound:0.453592, Ounce:0.0283495, Ton:1000, Milligram:0.000001 }
  },
  temp: {
    units: ['Celsius','Fahrenheit','Kelvin'],
    toBase: null
  }
};

function populateUnits() {
  const cat = document.getElementById('unitCategory').value;
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
    if (from === 'Celsius' && to === 'Fahrenheit') result = val * 9/5 + 32;
    else if (from === 'Fahrenheit' && to === 'Celsius') result = (val-32) * 5/9;
    else if (from === 'Celsius' && to === 'Kelvin') result = val + 273.15;
    else if (from === 'Kelvin' && to === 'Celsius') result = val - 273.15;
    else if (from === 'Fahrenheit' && to === 'Kelvin') result = (val-32)*5/9+273.15;
    else if (from === 'Kelvin' && to === 'Fahrenheit') result = (val-273.15)*9/5+32;
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
  const bday  = new Date(document.getElementById('birthdayInput').value);
  if (isNaN(bday)) return;
  const now   = new Date();

  let years   = now.getFullYear() - bday.getFullYear();
  let months  = now.getMonth()    - bday.getMonth();
  let days    = now.getDate()     - bday.getDate();

  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }

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

  // Next birthday
  const nextBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
  if (nextBday <= now) nextBday.setFullYear(now.getFullYear() + 1);
  const daysUntil = Math.ceil((nextBday - now) / 86400000);
  document.getElementById('nextBday').textContent =
    daysUntil === 0 ? '🎂 Happy Birthday!' : `🎂 Next birthday in ${daysUntil} days`;
});

// ═══════════════════════════════════════
// METRONOME
// ═══════════════════════════════════════
let metroCtx       = null;
let metroInterval  = null;
let metroRunning   = false;
let currentBeat    = 0;
let tapTimes       = [];
const pendulum     = document.getElementById('pendulum');
const bpmSlider    = document.getElementById('bpmSlider');
const bpmDisplay   = document.getElementById('bpmDisplay');
const beatDots     = document.getElementById('beatDots');
const timeSig      = document.getElementById('timeSig');

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
  // Swing pendulum
  const dir = currentBeat % 2 === 0 ? 'rotate(-30deg)' : 'rotate(30deg)';
  pendulum.style.transition = `transform ${60000/parseInt(bpmSlider.value)/1000 * 0.9}s ease-in-out`;
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

// Tap Tempo
document.getElementById('tapTempo').addEventListener('click', () => {
  const now = Date.now();
  tapTimes.push(now);
  if (tapTimes.length > 8) tapTimes.shift();
  if (tapTimes.length >= 2) {
    const gaps = [];
    for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i-1]);
    const avg = gaps.reduce((a,b) => a+b) / gaps.length;
    const bpm = Math.round(60000 / avg);
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
let tunerStream    = null;
let tunerCtx       = null;
let tunerAnalyser  = null;
let tunerRunning   = false;
let tunerAnim      = null;

const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

function freqToNote(freq) {
  const semitones = 12 * Math.log2(freq / 440) + 69;
  const noteIndex = Math.round(semitones) % 12;
  const octave    = Math.floor(Math.round(semitones) / 12) - 1;
  const cents     = Math.round((semitones - Math.round(semitones)) * 100);
  return {
    note:   NOTES[(noteIndex + 12) % 12],
    octave: octave,
    cents:  cents
  };
}

function autoCorrelate(buffer, sampleRate) {
  let SIZE = buffer.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1;

  let r1=0, r2=SIZE-1;
  for (let i=0; i<SIZE/2; i++) { if (Math.abs(buffer[i]) < 0.2) { r1=i; break; } }
  for (let i=1; i<SIZE/2; i++) { if (Math.abs(buffer[SIZE-i]) < 0.2) { r2=SIZE-i; break; } }
  buffer = buffer.slice(r1, r2);
  SIZE = buffer.length;

  const c = new Array(SIZE).fill(0);
  for (let i=0; i<SIZE; i++)
    for (let j=0; j<SIZE-i; j++) c[i] = c[i] + buffer[j] * buffer[j+i];

  let d = 0;
  while (c[d] > c[d+1]) d++;
  let maxVal = -1, maxPos = -1;
  for (let i=d; i<SIZE; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
  }
  let T0 = maxPos;
  const x1 = c[T0-1], x2 = c[T0], x3 = c[T0+1];
  const a = (x1 + x3 - 2*x2) / 2;
  const b2 = (x3 - x1) / 2;
  if (a) T0 = T0 - b2 / (2*a);
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
    // Needle position: 0% = far flat, 50% = center, 100% = far sharp
    const needlePos = 50 + (cents / 50) * 50;
    document.getElementById('tunerNeedle').style.left = `${Math.min(100, Math.max(0, needlePos))}%`;
  }
  tunerAnim = requestAnimationFrame(tunerLoop);
}

document.getElementById('tunerStart').addEventListener('click', async () => {
  if (tunerRunning) return;
  try {
    tunerStream  = await navigator.mediaDevices.getUserMedia({ audio: true });
    tunerCtx     = new AudioContext();
    tunerAnalyser = tunerCtx.createAnalyser();
    tunerAnalyser.fftSize = 2048;
    const src = tunerCtx.createMediaStreamSource(tunerStream);
    src.connect(tunerAnalyser);
    tunerRunning = true;
    tunerLoop();
  } catch(e) {
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

// ── Mode buttons ──
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

// ── Set custom time ──
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

// ── Start / Pause ──
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
        // Flash ring
        fsRing.style.filter = 'drop-shadow(0 0 30px rgba(183,110,121,0.9))';
        setTimeout(() => { fsRing.style.filter = ''; }, 1000);
      }
    }, 1000);
  }
});

// ── Reset ──
fsReset.addEventListener('click', resetFs);

// ── Open fullscreen ──
document.getElementById('pomFullscreen').addEventListener('click', () => {
  fsTotal    = pomTotal;
  fsSeconds  = pomSeconds;
  fsSesCount = pomSesCount;
  fsSessions.textContent = fsSesCount;
  updateFsDisplay();
  fsOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  startParticles();
  // Show exit button immediately when overlay opens
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
    this.x          = Math.random() * canvas.width;
    this.y          = randomY ? Math.random() * canvas.height : canvas.height + 10;
    this.size       = Math.random() * 2.5 + 0.5;
    this.speedX     = (Math.random() - 0.5) * 0.4;
    this.speedY     = -(Math.random() * 0.6 + 0.2);
    this.opacity    = Math.random() * 0.6 + 0.1;
    this.color      = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.twinkle    = Math.random() * Math.PI * 2;
    this.twinkleSpd = Math.random() * 0.03 + 0.01;
    this.shape      = Math.random() > 0.85 ? 'diamond' : 'circle';
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
      this.y - Math.sin(this.angle) * this.len
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
      this.y - Math.sin(this.angle) * this.len
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
  // Delay removing visible until after the overlay fade (500ms transition)
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

  const dx   = e.clientX - btnCenterX;
  const dy   = e.clientY - btnCenterY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < PROXIMITY) {
    fsExit.classList.add('visible');
  } else {
    fsExit.classList.remove('visible');
  }
});

// ═══════════════════════════════════════
// BASE CONVERTER
// ═══════════════════════════════════════
const baseFrom        = document.getElementById('baseFrom');
const baseFromCustomRow = document.getElementById('baseFromCustomRow');
const baseInput       = document.getElementById('baseInput');
const customBaseResult = document.getElementById('customBaseResult');
const bitVisual       = document.getElementById('bitVisual');
const bitRow          = document.getElementById('bitRow');
const bitNote         = document.getElementById('bitNote');

// Show/hide custom base input
baseFrom.addEventListener('change', () => {
  baseFromCustomRow.style.display =
    baseFrom.value === 'custom' ? 'flex' : 'none';
});

// Copy buttons for base results
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
  // Only show for values that fit reasonably
  if (decValue < 0 || decValue > 4294967295) {
    bitVisual.style.display = 'none';
    return;
  }
  bitVisual.style.display = 'block';

  const bits = decValue <= 255 ? 8 : decValue <= 65535 ? 16 : 32;
  const binStr = decValue.toString(2).padStart(bits, '0');

  bitRow.innerHTML = '';

  // Group into nibbles of 4
  for (let i = 0; i < binStr.length; i++) {
    if (i > 0 && i % 4 === 0) {
      const spacer = document.createElement('div');
      spacer.style.width = '6px';
      bitRow.appendChild(spacer);
    }
    const cell = document.createElement('div');
    cell.className = `bit-cell ${binStr[i] === '1' ? 'on' : 'off'}`;
    cell.textContent = binStr[i];
    bitRow.appendChild(cell);
  }

  bitNote.textContent = `${bits}-bit · ${decValue <= 255 ? '1 byte' : decValue <= 65535 ? '2 bytes' : '4 bytes'}`;
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

  // Validate input for the given base
  const validChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, fromBase);
  const isValid    = rawInput.split('').every(c => validChars.includes(c));

  if (!isValid) {
    document.getElementById('baseOut2').textContent   = 'Invalid';
    document.getElementById('baseOut8').textContent   = 'Invalid';
    document.getElementById('baseOut10').textContent  = 'Invalid';
    document.getElementById('baseOut16').textContent  = 'Invalid';
    document.getElementById('baseOutCustom').textContent = 'Invalid';
    bitVisual.style.display = 'none';
    return;
  }

  // Convert to decimal first
  const decVal = parseInt(rawInput, fromBase);

  // Output to all bases
  document.getElementById('baseOut2').textContent  = decVal.toString(2);
  document.getElementById('baseOut8').textContent  = decVal.toString(8);
  document.getElementById('baseOut10').textContent = decVal.toString(10);
  document.getElementById('baseOut16').textContent = decVal.toString(16).toUpperCase();

  // Custom output base
  const toCustomBase = parseInt(document.getElementById('baseFromCustom').value);
  if (!isNaN(toCustomBase) && toCustomBase >= 2 && toCustomBase <= 36) {
    customBaseResult.style.display = 'block';
    document.getElementById('customBaseTag').textContent   = `B${toCustomBase}`;
    document.getElementById('customBaseLabel').textContent = `Base ${toCustomBase}`;
    document.getElementById('baseOutCustom').textContent   = decVal.toString(toCustomBase).toUpperCase();
  }

  // Bit visualization
  updateBitVisual(decVal);
});

// Also convert on Enter key
baseInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('convertBase').click();
});

// ── ASCII helper ──
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
