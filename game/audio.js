// audio.js — every sound in Vaultbreak is synthesized live with WebAudio.
// No audio files are loaded; each effect is a small oscillator/noise recipe.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let alarmNodes = null;

  function ensureContext() {
    if (ctx) return ctx;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.35;
      master.connect(ctx.destination);
    } catch (e) {
      ctx = null; // no audio device (e.g. headless): the game stays silent
    }
    return ctx;
  }

  // Unlock audio on the first user gesture (browsers block sound before one).
  function unlock() {
    const c = ensureContext();
    if (c && c.state === 'suspended') c.resume();
  }
  window.addEventListener('pointerdown', unlock, { once: false });
  window.addEventListener('keydown', unlock, { once: false });

  function tone(freq, dur, type, vol, slideTo) {
    const c = ensureContext();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.2, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(c.currentTime + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowFreq) {
    const c = ensureContext();
    if (!c || muted) return;
    const len = Math.floor(c.sampleRate * dur);
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq || 1200;
    const gain = c.createGain();
    gain.gain.setValueAtTime(vol || 0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
  }

  function playStep() { tone(180, 0.06, 'triangle', 0.05); }
  function playCoin() { tone(1320, 0.09, 'sine', 0.22); tone(1760, 0.14, 'sine', 0.18, 1980); }
  function playLoot() {
    tone(523, 0.12, 'triangle', 0.25);
    setTimeout(() => tone(659, 0.12, 'triangle', 0.25), 90);
    setTimeout(() => tone(784, 0.2, 'triangle', 0.28), 180);
  }
  function playSpotted() {
    tone(220, 0.18, 'sawtooth', 0.22, 440);
    setTimeout(() => tone(220, 0.18, 'sawtooth', 0.22, 440), 140);
  }
  function playEmp() { tone(1800, 0.35, 'square', 0.12, 120); noiseBurst(0.2, 0.12, 4000); }
  function playSmoke() { noiseBurst(0.5, 0.3, 600); }
  function playNoiseMaker() { tone(980, 0.1, 'square', 0.16); setTimeout(() => tone(980, 0.1, 'square', 0.16), 160); }
  function playLaser() { tone(1200, 0.15, 'sawtooth', 0.2, 300); }
  function playClick() { tone(700, 0.05, 'square', 0.12); }
  function playWin() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.25), i * 130));
  }
  function playLose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.18), i * 160));
  }

  function startAlarm() {
    const c = ensureContext();
    if (!c || muted || alarmNodes) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 620;
    lfo.type = 'sine';
    lfo.frequency.value = 2.2;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.value = 0.045;
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    lfo.start();
    alarmNodes = { osc, lfo, gain };
  }

  function stopAlarm() {
    if (!alarmNodes) return;
    try { alarmNodes.osc.stop(); alarmNodes.lfo.stop(); } catch (e) { /* already stopped */ }
    alarmNodes = null;
  }

  function setMuted(value) {
    muted = value;
    if (muted) stopAlarm();
  }

  return {
    unlock,
    playStep, playCoin, playLoot, playSpotted, playEmp, playSmoke,
    playNoiseMaker, playLaser, playClick, playWin, playLose,
    startAlarm, stopAlarm, setMuted,
    isMuted: () => muted,
  };
}
