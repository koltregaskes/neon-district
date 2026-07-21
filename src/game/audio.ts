import type { EnemyType, HazardKind, HudSnapshot, MissionPhase, PickupType, SimulationEvent, WeaponType } from './types';

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
  private currentPhase: MissionPhase = 'recon';
  private elitePressureActive = false;
  private extractionCountdownMark: number | null = null;
  private briefingTrack?: HTMLAudioElement;
  private combatTrack?: HTMLAudioElement;
  private activeTrack?: HTMLAudioElement;
  private musicCombat = false;

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
    const phaseChanged = snapshot.objectivePhase !== this.currentPhase;
    const eliteTriggered = snapshot.eliteActive && !this.elitePressureActive;

    this.currentPhase = snapshot.objectivePhase;
    this.elitePressureActive = snapshot.eliteActive;
    this.mode = snapshot.victory
      ? 'victory'
      : snapshot.gameOver
        ? 'loss'
        : snapshot.combatActive
          ? 'combat'
          : 'briefing';
    const combatNow = this.mode === 'combat';
    if (combatNow !== this.musicCombat) {
      this.musicCombat = combatNow;
      this.applyMusicForMode();
    }
    this.intensity = Math.min(
      1,
      snapshot.threatLevel / 100
        + (snapshot.objectivePhase === 'hold-upload' ? 0.12 : 0)
        + (snapshot.objectivePhase === 'extract' ? 0.18 : 0)
        + (snapshot.eliteActive ? 0.2 : 0),
    );

    if (phaseChanged) {
      if (snapshot.objectivePhase === 'hold-upload') {
        this.playUploadLock();
      } else if (snapshot.objectivePhase === 'extract') {
        this.extractionCountdownMark = null;
        this.playExtractionWindow(snapshot.extractionDuration);
      } else {
        this.extractionCountdownMark = null;
      }
    }

    if (eliteTriggered) {
      this.playEliteSpawn();
    }

    if (snapshot.objectivePhase === 'extract' && !snapshot.victory && !snapshot.gameOver) {
      const secondsLeft = Math.ceil(snapshot.extractionTimeRemaining);
      const markedSecond = secondsLeft <= 3
        ? secondsLeft
        : secondsLeft <= 5
          ? 5
          : secondsLeft <= 10
            ? 10
            : null;
      if (markedSecond !== null && markedSecond !== this.extractionCountdownMark) {
        this.extractionCountdownMark = markedSecond;
        this.playExtractionCountdown(markedSecond);
      }
    } else {
      this.extractionCountdownMark = null;
    }
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
      } else if (event.type === 'shield-contact') {
        this.playShieldContact(event.shieldBroken);
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
      } else if (event.type === 'extraction-window') {
        this.extractionCountdownMark = null;
        this.playExtractionWindow(event.duration);
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
    if (this.activeTrack) { try { this.activeTrack.pause(); } catch { /* ignore */ } }

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
    if (this.activeTrack) {
      this.activeTrack.volume = this.muted ? 0 : 0.6;
      if (this.muted) { try { this.activeTrack.pause(); } catch { /* ignore */ } }
      else { void this.activeTrack.play().catch(() => { /* ignore */ }); }
    }
  }

  private startMusicLoop() {
    // Real streamed tracks (assets/audio/music-*.mp3) replace the synth music scheduler.
    // Fall back to the procedural synth only if HTMLAudioElement is unavailable.
    if (typeof Audio === 'undefined') {
      if (this.musicTimer === null && this.context) {
        this.musicTimer = window.setInterval(() => {
          if (this.context && !this.muted && this.musicGain) this.scheduleMusic();
        }, 920);
      }
      return;
    }
    this.ensureMusicTracks();
    this.applyMusicForMode();
  }

  private ensureMusicTracks() {
    if (!this.briefingTrack) {
      this.briefingTrack = new Audio(new URL('assets/audio/music-briefing.mp3', document.baseURI).href);
      this.briefingTrack.loop = true;
      this.briefingTrack.preload = 'auto';
    }
    if (!this.combatTrack) {
      this.combatTrack = new Audio(new URL('assets/audio/music-combat.mp3', document.baseURI).href);
      this.combatTrack.loop = true;
      this.combatTrack.preload = 'auto';
    }
  }

  private applyMusicForMode() {
    this.ensureMusicTracks();
    const next = this.mode === 'combat' ? this.combatTrack : this.briefingTrack;
    if (next && this.activeTrack !== next) {
      if (this.activeTrack) { try { this.activeTrack.pause(); } catch { /* ignore */ } }
      this.activeTrack = next;
    }
    if (!this.activeTrack) return;
    this.activeTrack.volume = this.muted ? 0 : 0.6;
    if (this.muted) { try { this.activeTrack.pause(); } catch { /* ignore */ } }
    else { void this.activeTrack.play().catch(() => { /* autoplay gate */ }); }
  }

  private scheduleMusic() {
    if (!this.context || !this.musicGain) return;

    const now = this.context.currentTime + 0.06;
    const extractionPhase = this.currentPhase === 'extract';
    const holdPhase = this.currentPhase === 'hold-upload';
    const root = this.mode === 'combat'
      ? extractionPhase
        ? 38
        : holdPhase
          ? 40
          : 42
      : this.mode === 'loss'
        ? 35
        : this.mode === 'victory'
          ? 50
          : this.currentPhase === 'reach-terminal'
            ? 45
            : 47;
    const accent = this.mode === 'combat'
      ? 0.026 + this.intensity * 0.02
      : 0.018;

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
        this.playNoise(start, 0.07, extractionPhase ? 1200 + beat * 180 : 1800 + beat * 220, 0.008 + this.intensity * 0.004, this.musicGain);
      }

      this.playTone(midiToFrequency(root + 19), now + 0.6, 0.35, extractionPhase ? 'triangle' : 'square', accent * 0.58, this.musicGain, 0.01, 0.28);
      this.playTone(midiToFrequency(root + 7), now + 0.44, 0.42, 'triangle', accent * 0.42, this.musicGain, 0.02, 0.48);
      if (holdPhase || extractionPhase) {
        this.playTone(midiToFrequency(root - 12), now, 0.82, 'sine', 0.01 + this.intensity * 0.01, this.musicGain, 0.04, 0.78);
      }
      if (this.elitePressureActive) {
        this.playTone(midiToFrequency(root - 5), now + 0.18, 0.64, 'sawtooth', 0.014 + this.intensity * 0.01, this.musicGain, 0.02, 0.58);
      }
      this.musicSeed += 1;
      return;
    }

    this.playTone(midiToFrequency(root), now, 1.4, 'triangle', 0.02, this.musicGain, 0.08, 0.95);
    this.playTone(midiToFrequency(root + 12), now + 0.26, 1.1, 'sine', 0.013, this.musicGain, 0.06, 0.82);
    this.playTone(midiToFrequency(root + (this.musicSeed % 2 === 0 ? 19 : 7)), now + 0.7, 0.34, 'square', 0.008, this.musicGain, 0.008, 0.22);
    this.playNoise(now + 0.18, 0.18, this.currentPhase === 'recon' ? 980 : 1400, 0.004, this.musicGain);
    this.playNoise(now + 0.52, 0.22, this.currentPhase === 'reach-terminal' ? 2100 : 1600, 0.0025, this.musicGain, true);
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

  private playShieldContact(shieldBroken: boolean) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    if (shieldBroken) {
      this.playTone(midiToFrequency(84), now, 0.08, 'square', 0.05, this.sfxGain, 0.002, 0.08);
      this.playTone(midiToFrequency(72), now + 0.03, 0.18, 'triangle', 0.038, this.sfxGain, 0.003, 0.16);
      this.playNoise(now, 0.14, 2800, 0.022, this.sfxGain, true);
      return;
    }

    this.playTone(midiToFrequency(79), now, 0.09, 'triangle', 0.032, this.sfxGain, 0.002, 0.1);
    this.playTone(midiToFrequency(91), now + 0.02, 0.08, 'sine', 0.02, this.sfxGain, 0.002, 0.08);
    this.playNoise(now, 0.08, 3400, 0.012, this.sfxGain);
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
    this.playTone(midiToFrequency(45), now, 0.38, 'sawtooth', 0.038, this.sfxGain, 0.02, 0.34);
    this.playTone(midiToFrequency(52), now + 0.1, 0.24, 'sawtooth', 0.036, this.sfxGain, 0.004, 0.2);
    this.playTone(midiToFrequency(59), now + 0.18, 0.26, 'triangle', 0.032, this.sfxGain, 0.006, 0.24);
    this.playNoise(now, 0.24, 1180, 0.016, this.sfxGain);
  }

  private playUploadLock() {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    this.playTone(midiToFrequency(57), now, 0.12, 'square', 0.022, this.sfxGain, 0.004, 0.1);
    this.playTone(midiToFrequency(64), now + 0.06, 0.14, 'triangle', 0.024, this.sfxGain, 0.004, 0.12);
    this.playNoise(now, 0.1, 2400, 0.01, this.sfxGain);
  }

  private playExtractionWindow(duration: number) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const urgency = duration <= 20 ? 1.1 : 1;
    this.playTone(midiToFrequency(64), now, 0.12, 'square', 0.028 * urgency, this.sfxGain, 0.002, 0.1);
    this.playTone(midiToFrequency(71), now + 0.14, 0.12, 'square', 0.026 * urgency, this.sfxGain, 0.002, 0.1);
    this.playTone(midiToFrequency(59), now + 0.28, 0.24, 'triangle', 0.024 * urgency, this.sfxGain, 0.01, 0.2);
    this.playNoise(now, 0.16, 2100, 0.01, this.sfxGain);
  }

  private playExtractionCountdown(mark: number) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;
    const frequency = mark <= 3 ? 92 : mark <= 5 ? 86 : 80;
    const emphasis = mark <= 3 ? 0.034 : mark <= 5 ? 0.028 : 0.022;
    this.playTone(midiToFrequency(frequency), now, 0.08, 'square', emphasis, this.sfxGain, 0.002, 0.08);
    this.playTone(midiToFrequency(frequency - 12), now + 0.05, 0.12, 'triangle', emphasis * 0.72, this.sfxGain, 0.002, 0.1);
  }

  private playShotByWeapon(weapon: WeaponType) {
    if (!this.context || !this.sfxGain) return;
    const now = this.context.currentTime;

    if (weapon === 'scatter') {
      this.playTone(midiToFrequency(43), now, 0.12, 'sawtooth', 0.052, this.sfxGain, 0.002, 0.1);
      this.playTone(midiToFrequency(31), now + 0.01, 0.18, 'triangle', 0.026, this.sfxGain, 0.002, 0.16);
      this.playNoise(now, 0.11, 1180, 0.032, this.sfxGain);
      this.playNoise(now + 0.04, 0.12, 2200, 0.012, this.sfxGain, true);
      return;
    }

    if (weapon === 'rail') {
      this.playTone(midiToFrequency(55), now, 0.1, 'sine', 0.016, this.sfxGain, 0.03, 0.08);
      this.playTone(midiToFrequency(62), now + 0.05, 0.16, 'sine', 0.024, this.sfxGain, 0.03, 0.14);
      this.playTone(midiToFrequency(86), now + 0.09, 0.2, 'triangle', 0.064, this.sfxGain, 0.002, 0.12);
      this.playNoise(now + 0.08, 0.1, 3600, 0.018, this.sfxGain);
      return;
    }

    this.playTone(midiToFrequency(67), now, 0.08, 'square', 0.036, this.sfxGain, 0.002, 0.08);
    this.playTone(midiToFrequency(79), now + 0.01, 0.06, 'square', 0.022, this.sfxGain, 0.002, 0.06);
    this.playNoise(now, 0.05, 2600, 0.012, this.sfxGain);
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
    const base = type === 'captain' ? 31 : type === 'brute' ? 36 : type === 'shield' ? 41 : type === 'gunner' ? 44 : 51;
    const duration = type === 'captain' ? 0.34 : type === 'brute' ? 0.24 : type === 'shield' ? 0.22 : 0.16;
    const peak = type === 'captain' ? 0.06 : type === 'brute' ? 0.05 : type === 'shield' ? 0.044 : 0.032;
    this.playTone(midiToFrequency(base), now, duration, 'sawtooth', peak, this.sfxGain, 0.002, duration);
    if (type === 'shield') {
      this.playTone(midiToFrequency(72), now + 0.02, 0.12, 'triangle', 0.028, this.sfxGain, 0.002, 0.1);
    }
    this.playNoise(now, 0.08, type === 'captain' ? 760 : type === 'brute' ? 980 : type === 'shield' ? 2200 : 1700, type === 'captain' ? 0.024 : type === 'brute' ? 0.022 : type === 'shield' ? 0.018 : 0.012, this.sfxGain);
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
