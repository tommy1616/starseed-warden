// Every sound in Starseed Warden is synthesized here with WebAudio — no audio files.
// The context is created only on the first user gesture; before that the game is silent
// (browsers refuse to start audio otherwise). The game calls play(name) for one-shots and
// hands setScene() to the generative music module.
import { createMusic } from './music.js';

export function createAudio() {
  let context = null;
  let master = null;
  let music = null;
  let noiseBuffer = null;
  let muted = false;
  let ready = false;

  function makeNoise() {
    const length = Math.floor(context.sampleRate * 1.1);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.62 + white * 0.38;
      data[i] = last;
    }
    return buffer;
  }

  /** A pitched blip with an optional pitch slide and low-pass filter. */
  function tone(freq, duration, options = {}) {
    if (!ready) return;
    const {
      type = 'sine',
      volume = 0.16,
      attack = 0.005,
      slide = 1,
      delay = 0,
      detune = 0,
      filter = 0,
    } = options;
    const start = context.currentTime + delay;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), start);
    if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), start + duration);
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    let node = osc;
    if (filter > 0) {
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = filter;
      node.connect(lowpass);
      node = lowpass;
    }
    node.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.03);
  }

  /** A filtered noise burst: impacts, whooshes, roars. */
  function noise(duration, options = {}) {
    if (!ready) return;
    const {
      volume = 0.18,
      type = 'bandpass',
      frequency = 900,
      q = 0.8,
      sweep = 1,
      delay = 0,
    } = options;
    const start = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(frequency, start);
    if (sweep !== 1) filter.frequency.exponentialRampToValueAtTime(Math.max(40, frequency * sweep), start + duration);
    filter.Q.value = q;
    const gain = context.createGain();
    gain.gain.setValueAtTime(Math.max(0.0002, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  function arpeggio(notes, step, duration, volume, type = 'triangle') {
    notes.forEach((freq, index) => {
      tone(freq, duration, { type, volume, delay: index * step, filter: 2400 });
    });
  }

  const SFX = {
    shoot() {
      tone(760, 0.07, { type: 'triangle', volume: 0.05, slide: 0.62, filter: 2600 });
    },
    hit() {
      noise(0.045, { volume: 0.1, frequency: 2400, sweep: 0.45 });
      tone(240, 0.05, { type: 'square', volume: 0.035, slide: 0.7 });
    },
    kill() {
      noise(0.22, { volume: 0.13, frequency: 900, sweep: 0.25, type: 'lowpass' });
      tone(320, 0.24, { type: 'sawtooth', volume: 0.06, slide: 0.32, filter: 1100 });
    },
    playerHurt() {
      tone(150, 0.32, { type: 'sawtooth', volume: 0.16, slide: 0.45, filter: 700 });
      noise(0.18, { volume: 0.12, frequency: 500, sweep: 0.4 });
    },
    seedHurt() {
      tone(92, 0.55, { type: 'sine', volume: 0.18, slide: 0.72 });
      tone(138, 0.4, { type: 'triangle', volume: 0.07, slide: 0.8 });
      noise(0.2, { volume: 0.06, frequency: 320, sweep: 0.5 });
    },
    dash() {
      noise(0.22, { volume: 0.14, type: 'highpass', frequency: 700, sweep: 3.4 });
      tone(420, 0.16, { type: 'sine', volume: 0.05, slide: 2.1 });
    },
    pickup() {
      tone(880, 0.09, { type: 'sine', volume: 0.06, slide: 1.5 });
      tone(1320, 0.12, { type: 'triangle', volume: 0.03, delay: 0.03, slide: 1.2 });
    },
    bloom() {
      arpeggio([330, 440, 550, 660], 0.045, 0.5, 0.08, 'triangle');
      noise(0.6, { volume: 0.14, frequency: 1400, sweep: 0.18, type: 'lowpass' });
      tone(70, 0.7, { type: 'sine', volume: 0.16, slide: 0.85 });
    },
    card() {
      tone(660, 0.14, { type: 'triangle', volume: 0.07, slide: 1.35 });
      tone(990, 0.18, { type: 'sine', volume: 0.05, delay: 0.07, slide: 1.1 });
    },
    wave() {
      arpeggio([392, 523, 659, 784], 0.09, 0.34, 0.07, 'triangle');
    },
    bossRoar() {
      tone(58, 0.9, { type: 'sawtooth', volume: 0.16, slide: 0.7, filter: 320 });
      tone(87, 0.8, { type: 'sawtooth', volume: 0.1, slide: 0.75, detune: 14, filter: 420 });
      noise(0.9, { volume: 0.12, frequency: 260, sweep: 0.35, type: 'lowpass' });
    },
    victory() {
      arpeggio([523, 659, 784, 1046, 1318], 0.13, 0.7, 0.08, 'triangle');
      tone(262, 1.5, { type: 'sine', volume: 0.08 });
    },
    defeat() {
      arpeggio([392, 330, 262, 196], 0.16, 0.85, 0.075, 'sine');
      tone(98, 1.4, { type: 'sine', volume: 0.1, slide: 0.8 });
    },
    click() {
      tone(1180, 0.035, { type: 'square', volume: 0.035, filter: 3000 });
    },
    select() {
      tone(720, 0.06, { type: 'sine', volume: 0.045, slide: 1.2 });
    },
  };

  return {
    get muted() {
      return muted;
    },
    get ready() {
      return ready;
    },
    /** Called from the first gesture only; safe to call again. */
    unlock() {
      if (context) {
        if (context.state === 'suspended') context.resume();
        return;
      }
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      try {
        context = new Ctor();
        master = context.createGain();
        master.gain.value = muted ? 0 : 0.55;
        master.connect(context.destination);
        noiseBuffer = makeNoise();
        music = createMusic(context, master);
        music.start();
        ready = true;
      } catch {
        context = null;
        ready = false;
      }
    },
    play(name) {
      if (!ready || muted) return;
      const fn = SFX[name];
      if (fn) {
        try {
          fn();
        } catch {
          // A busy audio device is never a reason to stop the game.
        }
      }
    },
    setMuted(value) {
      muted = Boolean(value);
      if (master && context) {
        master.gain.setTargetAtTime(muted ? 0 : 0.55, context.currentTime, 0.04);
      }
      return muted;
    },
    toggleMuted() {
      return this.setMuted(!muted);
    },
    /** Tell the generative music which biome is playing and whether a boss is present. */
    setScene(biomeIndex, boss) {
      if (music) music.setScene(biomeIndex, boss);
    },
    suspend() {
      if (context && context.state === 'running') context.suspend();
    },
    resume() {
      if (context && context.state === 'suspended') context.resume();
    },
  };
}
