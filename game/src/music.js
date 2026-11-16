// A gentle generative night-garden score: soft pads, sparse plucks and a low drone, with a
// different scale per biome and a faster, darker pulse while a boss is alive. It is scheduled
// ahead of the audio clock, so it never depends on render frame rate. There are no music files.
const SCALES = [
  { root: 146.83, notes: [293.66, 329.63, 369.99, 440.0, 493.88, 587.33] },
  { root: 130.81, notes: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] },
  { root: 164.81, notes: [329.63, 369.99, 415.3, 493.88, 554.37, 659.25] },
];

export function createMusic(context, destination) {
  const bus = context.createGain();
  bus.gain.value = 0.2;
  bus.connect(destination);

  const delay = context.createDelay(1.2);
  delay.delayTime.value = 0.46;
  const feedback = context.createGain();
  feedback.gain.value = 0.3;
  const wet = context.createGain();
  wet.gain.value = 0.35;
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(wet);
  wet.connect(bus);

  let biomeIndex = 0;
  let boss = false;
  let step = 0;
  let nextTime = 0;
  let timer = null;
  let running = false;

  function note(freq, when, duration, volume, type = 'sine', attack = 0.02, echo = false) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 8;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(bus);
    if (echo) gain.connect(delay);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  function pad(when) {
    const scale = SCALES[biomeIndex];
    const pick = scale.notes;
    const root = boss ? scale.root / 2 : scale.root;
    note(root, when, 3.8, 0.055, 'sine', 0.9);
    note(pick[step % pick.length], when, 3.3, 0.032, 'sine', 0.7, true);
    note(pick[(step + 2) % pick.length] * 2, when + 0.2, 2.6, 0.016, 'triangle', 0.6, true);
  }

  function pluck(when) {
    const scale = SCALES[biomeIndex];
    const noteFreq = scale.notes[Math.floor(Math.random() * scale.notes.length)];
    const octave = Math.random() < 0.22 ? 2 : 1;
    note(noteFreq * octave, when, 1.15, boss ? 0.045 : 0.036, 'triangle', 0.008, true);
  }

  function pulse(when) {
    const scale = SCALES[biomeIndex];
    note(scale.root / 2, when, 0.5, 0.06, 'sine', 0.01);
    note(scale.root * 0.75, when, 0.3, 0.025, 'sawtooth', 0.005);
  }

  function scheduleStep(when) {
    const beat = boss ? 0.3 : 0.54;
    if (step % 8 === 0) pad(when);
    if (step % 2 === 0 || Math.random() < 0.22) pluck(when + (Math.random() < 0.3 ? beat * 0.5 : 0));
    if (boss && step % 4 === 0) pulse(when);
    step += 1;
    nextTime += beat;
  }

  function tick() {
    if (!running) return;
    const now = context.currentTime;
    while (nextTime < now + 0.55) scheduleStep(nextTime);
  }

  return {
    start() {
      if (running) return;
      running = true;
      step = 0;
      nextTime = context.currentTime + 0.12;
      timer = window.setInterval(tick, 140);
    },
    stop() {
      running = false;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    },
    setScene(index, isBoss) {
      if (index !== biomeIndex) {
        biomeIndex = Math.max(0, Math.min(SCALES.length - 1, index | 0));
        if (running) nextTime = Math.min(nextTime, context.currentTime + 0.2);
      }
      boss = Boolean(isBoss);
    },
  };
}
