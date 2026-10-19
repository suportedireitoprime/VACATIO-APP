/**
 * Sintetizador procedural de efeitos sonoros da Lousa Mágica (Web Audio API)
 * Gera atrito de giz na ardósia, varredura de feltro do apagador e toque de post-it
 * 100% autônomo: zero arquivos de áudio externos, zero requisições de rede.
 */

class LousaAudioEffects {
  private ctx: AudioContext | null = null;
  private habilitado: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const salvo = localStorage.getItem('aa_lousa_sound_enabled');
      this.habilitado = salvo !== null ? salvo === 'true' : true;
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.habilitado;
  }

  public setEnabled(val: boolean) {
    this.habilitado = val;
    if (typeof window !== 'undefined') {
      localStorage.setItem('aa_lousa_sound_enabled', String(val));
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.habilitado);
    return this.habilitado;
  }

  /**
   * Efeito suave de atrito de giz escrevendo na ardósia
   */
  public playGizScratch(volume: number = 0.06) {
    if (!this.habilitado) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const duration = 0.05 + Math.random() * 0.04;
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Ruído áspero e poroso
        data[i] = (last + 0.04 * white) / 1.04;
        last = data[i];
        if (Math.random() < 0.25) {
          data[i] *= Math.random();
        }
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filtro bandpass ressonante na faixa do giz (2200Hz - 3400Hz)
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400 + Math.random() * 1000, now);
      filter.Q.setValueAtTime(2.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Falha silenciosa se áudio não for permitido
    }
  }

  /**
   * Efeito aveludado e suave de varredura do feltro do apagador
   */
  public playApagadorWhoosh(volume: number = 0.12) {
    if (!this.habilitado) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const duration = 1.6;
      const now = ctx.currentTime;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Ruído aveludado (Brownian noise)
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * white) / 1.02;
        last = data[i];
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filtro que desce suavemente imitando as passadas do feltro
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.frequency.exponentialRampToValueAtTime(320, now + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(180, now + duration);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      // Fade in suave
      gain.gain.linearRampToValueAtTime(volume, now + 0.25);
      // Pequenas modulações imitando o movimento em zigue-zague
      gain.gain.linearRampToValueAtTime(volume * 0.7, now + 0.7);
      gain.gain.linearRampToValueAtTime(volume, now + 1.1);
      // Fade out
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Ignora erro
    }
  }

  /**
   * Efeito de clique tátil de post-it colando
   */
  public playPostitStick(volume: number = 0.08) {
    if (!this.habilitado) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.06);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignora erro
    }
  }
}

export const lousaAudio = new LousaAudioEffects();
