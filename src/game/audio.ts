import type { EnemyType, HazardKind, HudSnapshot, PickupType, SimulationEvent, WeaponType } from './types';

type MusicMode = 'briefing' | 'combat' | 'victory' | 'loss';

type WebkitWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

function midiToFrequency(midi: number) {
  return 440 * (2 ** ((midi - 69) / 12));
}

export class NeonDistrictAudioDirector {
  private context?: AudioContext;
  private masterGain?: GainNode;
  private musicGain?: GainNode;
  private sfxGain?: GainNode;
  private musicTimer: number | null = null;
  private noiseBuffer?: AudioBuffer;
  private mode: MusicMode = 'briefing';
  private intensity = 0;
  private muted = false;
  private musicSeed = 0;

  unlock() {
    if (!this.context) {
      const AudioContextCtor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!AudioContextCtor) return;

      this.context = new AudioContextCtor();
      this.masterGain = this.context.createGain();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();

      this.masterGain.gain.value = 0.78;
      this.musicGain.gain.value = 0.22;
      this.sfxGain.gain.value = 0.65;

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);
    }

    if (this.context.state === 'suspended') {
      void this.context.resume();
    }

    this.startMusicLoop();
    this.updateMuteState();
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    this.updateMuteState();
    return this.muted;
  }

  setMuted(nextMuted: boolean) {
    this.muted = nextMuted;
    this.updateMuteState();
  }

  sync(snapshot: HudSnapshot) {
    this.mode = snapshot.victory
      ? 'victory'
      : snapshot.gameOver
        ? 'loss'
        : snapshot.combatActive
          ? 'combat'
          : 'briefing';
    this.intensity = snapshot.threatLevel / 100;
  }

  handleEvents(events: SimulationEvent[]) {
    if (!this.context || !this.sfxGain || this.muted) return;

    events.forEach((event) => {
      if (event.type === 'shot-fired') {
        this.playShotByWeapon(event.weapon);
      } else if (event.type === 'dash') {
        this.playDash();
      } else if (event.type === 'weapon-swapped') {
        this.playWeaponSwap();
      } else if (event.type === 'pickup') {
        this.playPickupByType(event.pickupType);
      } else if (event.type === 'enemy-killed') {
        this.playEnemyKillByType(event.enemyType);
      } else if (event.type === 'player-hit') {
        this.playPlayerHit(event.usedShield);
      } else if (event.type === 'hazard-triggered') {
        this.playHazardTriggered(event.kind);
      } else if (event.type === 'sweep-activated') {
        this.playSweepActivated();
      } else if (event.type === 'overheat') {
        this.playOverheat();
      } else if (event.type === 'game-over') {
        this.playGameOver();
      } else if (event.type === 'mission-success') {
        this.playMissionSuccess();
      } else if (event.type === 'elite-spawned') {
        this.playEliteSpawn();
      } else if (event.type === 'tutorial-step') {
        this.playTutorialAdvance();
      }
    });
  }

  destroy() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }

    if (this.context) {
      void this.context.close();
      this.context = undefined;
    }
  }

  private updateMuteState() {
    if (!this.masterGain || !this.context) return;
    const now = this.context.currentTime;
    const nextGain = this.muted ? 0 : 0.78;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(nextGain, now + 0.08);
  }

  private startMusicLoop() {
    if (this.musicTimer !== null || !this.context) return;

    const schedule = () => {
      if (!this.context || this.muted || !this.musicGain) return;
      this.scheduleMusic();
    };

    schedule();
    this.musicTimer = window.setInterval(schedule, 920);
  }

  private scheduleMusic() {
    if (!this.context || !this.musicGain) return;

    const now = this.context.currentTime + 0.06;
    const root = this.mode === 'combat' ? 42 : this.mode === 'loss' ? 35 : this.mode === 'victory' ? 50 : 47;
    const accent = this.mode === 'combat' ? 0.028 + this.intensity * 0.018 : 0.02;

    if (this.mode === 'loss') {
      this.playTone(midiToFrequency(root), now, 1.6, 'triangle', 0.026, this.musicGain, 0.06, 1.1);
      this.playTone(midiToFrequency(root + 7), now + 0.32, 1.1, 'sine', 0.016, this.musicGain, 0.08, 0.8);
      this.playNoise(now, 0.5, 320, 0.006, this.musicGain);
      this.musicSeed += 1;
      return;
    }

    if (this.mode === 'victory') {
      this.playTone(midiToFrequency(root), now, 0.7, 'triangle', 0.024, this.musicGain, 0.03, 0.52);
      this.playTone(midiToFrequency(root + 7), now + 0.14, 0.58, 'sine', 0.02, this.musicGain, 0.03, 0.48);
      this.playTone(midiToFrequency(root + 12), now + 0.28, 0.72, 'triangle', 0.022, this.musicGain, 0.04, 0.64);
      this.playNoise(now + 0.08, 0.14, 2400, 0.005, this.musicGain);
      this.musicSeed += 1;
      return;
    }

    if (this.mode === 'combat') {
      for (let beat = 0; beat < 3; beat += 1) {
        const start = now + beat * 0.29;
        this.playTone(midiToFrequency(root), start, 0.18, 'sawtooth', accent, this.musicGain, 0.004, 0.16);
        this.playTone(midiToFrequency(root + 12), start + 0.02, 0.13, 'triangle', accent * 0.62, this.musicGain, 0.003, 0.18);
        this.playNoise(start, 0.07, 1800 + beat * 220, 0.008 + this.intensity * 0.004, this.musicGain);
      }

      this.playTone(midiToFrequency(root + 19), now + 0.6, 0.35, 'square', accent * 0.58, this.musicGain, 0.01, 0.28);
      this.playTone(midiToFrequency(root + 7), now + 0.44, 0.42, 'triangle', accent * 0.42, this.musicGain, 0.02, 0.48);
      this.musicSeed += 1;
      return;
    }

    this.playTone(midiToFrequency(root), now, 1.4, 'triangle', 0.022, this.musicGain, 0.08, 0.95);
    this.playTone(midiToFrequency(root + 12), now + 0.26, 1.1, 'sine', 0.014, this.musicGain, 0.06, 0.82);
    this.playTone(midiToFrequency(root + (this.musicSeed % 2 === 0 ? 19 : 7)), now + 0.7, 0.34, 'square', 0.008, this.musicGain, 0.008, 0.22);
    this.playNoise(now + 0.18, 0.18, 1400, 0.003, this.musicGain);
    this.musicSeed += 1;
  }

  private playPlayerHit(usedShield: boolean) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    if (usedShield) {
      this.playTone(midiToFrequency(78), now, 0.09, 'triangle', 0.06, this.sfxGain, 0.002, 0.16);
      this.playNoise(now, 0.06, 3200, 0.018, this.sfxGain);
      return;
    }

    this.playTone(midiToFrequency(40), now, 0.16, 'sawtooth', 0.07, this.sfxGain, 0.002, 0.22);
    this.playNoise(now, 0.08, 920, 0.016, this.sfxGain);
  }

  private playHazardTriggered(kind: HazardKind) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    if (kind === 'blackout') {
      this.playTone(midiToFrequency(48), now, 0.24, 'triangle', 0.038, this.sfxGain, 0.008, 0.22);
      this.playTone(midiToFrequency(55), now + 0.08, 0.18, 'sawtooth', 0.03, this.sfxGain, 0.006, 0.16);
      this.playNoise(now, 0.18, 780, 0.014, this.sfxGain, true);
      return;
    }

    if (kind === 'corrosive') {
      this.playTone(midiToFrequency(62), now, 0.16, 'square', 0.028, this.sfxGain, 0.004, 0.14);
      this.playTone(midiToFrequency(69), now + 0.05, 0.2, 'triangle', 0.024, this.sfxGain, 0.006, 0.18);
      this.playNoise(now, 0.12, 1450, 0.012, this.sfxGain);
      return;
    }

    this.playTone(midiToFrequency(71), now, 0.12, 'sawtooth', 0.034, this.sfxGain, 0.003, 0.12);
    this.playTone(midiToFrequency(83), now + 0.06, 0.14, 'triangle', 0.03, this.sfxGain, 0.003, 0.12);
    this.playNoise(now, 0.1, 2400, 0.014, this.sfxGain);
  }

  private playWeaponSwap() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(78), now, 0.08, 'square', 0.03, this.sfxGain, 0.002, 0.08);
    this.playTone(midiToFrequency(83), now + 0.04, 0.09, 'square', 0.026, this.sfxGain, 0.002, 0.1);
  }

  private playTutorialAdvance() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(74), now, 0.12, 'triangle', 0.032, this.sfxGain, 0.003, 0.12);
    this.playTone(midiToFrequency(81), now + 0.06, 0.16, 'triangle', 0.028, this.sfxGain, 0.004, 0.16);
  }

  private playSweepActivated() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(55), now, 0.18, 'sawtooth', 0.04, this.sfxGain, 0.01, 0.18);
    this.playTone(midiToFrequency(62), now + 0.12, 0.2, 'sawtooth', 0.036, this.sfxGain, 0.01, 0.2);
    this.playTone(midiToFrequency(69), now + 0.24, 0.26, 'triangle', 0.032, this.sfxGain, 0.015, 0.24);
    this.playNoise(now, 0.18, 2200, 0.012, this.sfxGain);
  }

  private playOverheat() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(80), now, 0.1, 'square', 0.04, this.sfxGain, 0.002, 0.08);
    this.playTone(midiToFrequency(76), now + 0.12, 0.1, 'square', 0.036, this.sfxGain, 0.002, 0.08);
    this.playNoise(now, 0.12, 2800, 0.014, this.sfxGain);
  }

  private playDash() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(57), now, 0.16, 'triangle', 0.036, this.sfxGain, 0.002, 0.18);
    this.playNoise(now, 0.12, 1800, 0.018, this.sfxGain, true);
  }

  private playGameOver() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(42), now, 0.5, 'sawtooth', 0.04, this.sfxGain, 0.02, 0.42);
    this.playTone(midiToFrequency(35), now + 0.08, 0.75, 'triangle', 0.035, this.sfxGain, 0.04, 0.7);
    this.playNoise(now, 0.28, 520, 0.012, this.sfxGain);
  }

  private playMissionSuccess() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(69), now, 0.2, 'triangle', 0.032, this.sfxGain, 0.01, 0.16);
    this.playTone(midiToFrequency(76), now + 0.12, 0.26, 'triangle', 0.03, this.sfxGain, 0.01, 0.22);
    this.playTone(midiToFrequency(81), now + 0.26, 0.42, 'sine', 0.028, this.sfxGain, 0.02, 0.34);
    this.playNoise(now, 0.18, 2100, 0.008, this.sfxGain);
  }

  private playEliteSpawn() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(52), now, 0.18, 'sawtooth', 0.036, this.sfxGain, 0.004, 0.16);
    this.playTone(midiToFrequency(59), now + 0.08, 0.18, 'sawtooth', 0.032, this.sfxGain, 0.004, 0.18);
    this.playTone(midiToFrequency(64), now + 0.18, 0.26, 'triangle', 0.03, this.sfxGain, 0.006, 0.24);
    this.playNoise(now, 0.2, 1600, 0.014, this.sfxGain);
  }

  private playShotByWeapon(weapon: WeaponType) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    if (weapon === 'scatter') {
      this.playTone(midiToFrequency(46), now, 0.14, 'sawtooth', 0.05, this.sfxGain, 0.002, 0.14);
      this.playNoise(now, 0.09, 1250, 0.03, this.sfxGain);
      return;
    }

    if (weapon === 'rail') {
      this.playTone(midiToFrequency(60), now, 0.22, 'sine', 0.028, this.sfxGain, 0.004, 0.16);
      this.playTone(midiToFrequency(84), now + 0.02, 0.18, 'triangle', 0.06, this.sfxGain, 0.003, 0.12);
      this.playNoise(now, 0.08, 3600, 0.018, this.sfxGain);
      return;
    }

    this.playTone(midiToFrequency(67), now, 0.08, 'square', 0.04, this.sfxGain, 0.002, 0.08);
    this.playNoise(now, 0.04, 2400, 0.012, this.sfxGain);
  }

  private playPickupByType(type: PickupType) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    if (type === 'energy') {
      this.playTone(midiToFrequency(83), now, 0.12, 'sine', 0.026, this.sfxGain, 0.004, 0.14);
      this.playTone(midiToFrequency(90), now + 0.06, 0.16, 'triangle', 0.024, this.sfxGain, 0.004, 0.16);
      return;
    }

    if (type === 'medkit') {
      this.playTone(midiToFrequency(71), now, 0.14, 'triangle', 0.024, this.sfxGain, 0.006, 0.18);
      this.playTone(midiToFrequency(78), now + 0.08, 0.18, 'triangle', 0.022, this.sfxGain, 0.008, 0.18);
      return;
    }

    this.playTone(midiToFrequency(76), now, 0.09, 'square', 0.022, this.sfxGain, 0.002, 0.08);
    this.playTone(midiToFrequency(83), now + 0.05, 0.1, 'square', 0.02, this.sfxGain, 0.002, 0.08);
  }

  private playEnemyKillByType(type: EnemyType) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const base = type === 'captain' ? 31 : type === 'brute' ? 36 : type === 'gunner' ? 44 : 51;
    const duration = type === 'captain' ? 0.34 : type === 'brute' ? 0.24 : 0.16;
    this.playTone(midiToFrequency(base), now, duration, 'sawtooth', type === 'captain' ? 0.06 : type === 'brute' ? 0.05 : 0.032, this.sfxGain, 0.002, duration);
    this.playNoise(now, 0.08, type === 'captain' ? 760 : type === 'brute' ? 980 : 1700, type === 'captain' ? 0.024 : type === 'brute' ? 0.022 : 0.012, this.sfxGain);
  }

  private playTone(
    frequency: number,
    start: number,
    duration: number,
    type: OscillatorType,
    peakGain: number,
    destination: GainNode,
    attack = 0.01,
    release = duration,
  ) {
    if (!this.context) return;

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(attack + 0.02, release));

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.08);
  }

  private playNoise(
    start: number,
    duration: number,
    filterFrequency: number,
    peakGain: number,
    destination: GainNode,
    sweepDown = false,
  ) {
    if (!this.context) return;

    const source = this.context.createBufferSource();
    source.buffer = this.getNoiseBuffer();

    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFrequency, start);
    if (sweepDown) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(220, filterFrequency * 0.42), start + duration);
    }

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peakGain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(start + duration + 0.04);
  }

  private getNoiseBuffer() {
    if (this.noiseBuffer || !this.context) {
      return this.noiseBuffer!;
    }

    const buffer = this.context.createBuffer(1, this.context.sampleRate * 0.8, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = (Math.random() * 2 - 1) * 0.8;
    }

    this.noiseBuffer = buffer;
    return buffer;
  }
}
