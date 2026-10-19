/**
 * Sintetizador procedural de efeitos sonoros da Lousa Mágica (Web Audio API)
 * Gera atrito de giz na ardósia com variação tonal, varredura de feltro do apagador
 * e toque de post-it colando no quadro.
 * 100% autônomo: zero arquivos de áudio externos, zero requisições de rede.
 */

class LousaAudioEffects {
  private ctx: AudioContext | null = null;
  private habilitado: boolean = true;
  // Cache de buffers de ruído para reduzir alocações
  private noiseCache: AudioBuffer | null = null;
  private noiseCacheLong: AudioBuffer | null = null;

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

  /** Gera ou retorna cache de buffer de ruído browniano curto */
  private getNoiseBuffer(ctx: AudioContext, seconds: number = 0.1): AudioBuffer {
    if (this.noiseCache && this.noiseCache.duration >= seconds) return this.noiseCache;
    const bufferSize = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.04 * white) / 1.04;
      last = data[i];
      // Intermitência áspera de giz (quebras aleatórias)
      if (Math.random() < 0.2) {
        data[i] *= Math.random() * 0.6;
      }
    }
    this.noiseCache = buffer;
    return buffer;
  }

  /** Gera ou retorna cache de buffer de ruído browniano longo (apagador) */
  private getLongNoiseBuffer(ctx: AudioContext, seconds: number = 1.8): AudioBuffer {
    if (this.noiseCacheLong && this.noiseCacheLong.duration >= seconds) return this.noiseCacheLong;
    const bufferSize = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
    }
    this.noiseCacheLong = buffer;
    return buffer;
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
   * @param volume - Volume do efeito (0-1)
   * @param pitchMod - Modificador de pitch (0.5-1.5) para variação tonal por caractere
   */
  public playGizScratch(volume: number = 0.06, pitchMod: number = 1.0) {
    if (!this.habilitado) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const duration = 0.04 + Math.random() * 0.04;
      const now = ctx.currentTime;

      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx, 0.1);
      // Variação de playback rate para pitch tonal
      noise.playbackRate.setValueAtTime(0.8 + pitchMod * 0.4, now);

      // Filtro bandpass ressonante na faixa do giz (2000Hz - 4000Hz)
      // A frequência central varia com o pitchMod para criar sons distintos
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const baseFreq = 2200 + pitchMod * 800 + Math.random() * 600;
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.setValueAtTime(2.4 + Math.random() * 1.2, now);

      // Segundo filtro highshelf para adicionar "brilho" e aspereza variável
      const hshelf = ctx.createBiquadFilter();
      hshelf.type = 'highshelf';
      hshelf.frequency.setValueAtTime(3800, now);
      hshelf.gain.setValueAtTime(-4 + Math.random() * 6, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      // Attack rápido simulando o contato do giz
      gain.gain.linearRampToValueAtTime(volume * (0.7 + pitchMod * 0.3), now + 0.006);
      // Release com leve sustain
      gain.gain.setValueAtTime(volume * 0.5, now + duration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(hshelf);
      hshelf.connect(gain);
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

      const duration = 1.7;
      const now = ctx.currentTime;

      const noise = ctx.createBufferSource();
      noise.buffer = this.getLongNoiseBuffer(ctx, 1.8);

      // Filtro que desce suavemente imitando as passadas do feltro
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680, now);
      filter.frequency.exponentialRampToValueAtTime(340, now + duration * 0.5);
      filter.frequency.exponentialRampToValueAtTime(160, now + duration);
      filter.Q.setValueAtTime(1.6, now);

      // Filtro lowpass para suavizar o topo
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(1800, now);
      lp.frequency.exponentialRampToValueAtTime(600, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      // Fade in suave
      gain.gain.linearRampToValueAtTime(volume, now + 0.25);
      // Pequenas modulações imitando o movimento em zigue-zague do apagador
      gain.gain.linearRampToValueAtTime(volume * 0.65, now + 0.6);
      gain.gain.linearRampToValueAtTime(volume * 0.9, now + 0.9);
      gain.gain.linearRampToValueAtTime(volume * 0.55, now + 1.2);
      gain.gain.linearRampToValueAtTime(volume * 0.8, now + 1.4);
      // Fade out
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(lp);
      lp.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Ignora erro
    }
  }

  /**
   * Efeito de clique tátil de post-it colando — com micro-impacto e reverb sutil
   */
  public playPostitStick(volume: number = 0.08) {
    if (!this.habilitado) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Oscilador de impacto — tom surdo que cai
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.07);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);

      // Componente de "papel" — ruído curto e seco
      const paperDuration = 0.04;
      const bufferSize = Math.floor(ctx.sampleRate * paperDuration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const paperNoise = ctx.createBufferSource();
      paperNoise.buffer = buffer;

      const paperFilter = ctx.createBiquadFilter();
      paperFilter.type = 'bandpass';
      paperFilter.frequency.setValueAtTime(1800, now);
      paperFilter.Q.setValueAtTime(1.5, now);

      const paperGain = ctx.createGain();
      paperGain.gain.setValueAtTime(volume * 0.4, now);
      paperGain.gain.exponentialRampToValueAtTime(0.001, now + paperDuration);

      paperNoise.connect(paperFilter);
      paperFilter.connect(paperGain);
      paperGain.connect(ctx.destination);

      paperNoise.start(now + 0.01);
      paperNoise.stop(now + 0.01 + paperDuration);
    } catch {
      // Ignora erro
    }
  }

  /**
   * Efeito procedural de sopro suave de ar para dispersar pó de giz da calha
   */
  public playSoproSound(volume: number = 0.14) {
    if (!this.habilitado) return;
    try {
      const ctx = this.initContext();
      if (!ctx) return;

      const duration = 0.65;
      const now = ctx.currentTime;

      // Gerador de ruído de ar suave para simular fôlego/sopro de ar
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.0555179;
        b1 = 0.96300 * b1 + white * 0.0750759;
        b2 = 0.57000 * b2 + white * 0.1538520;
        data[i] = (b0 + b1 + b2) * 0.2;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Filtro lowpass dinâmico que sobe e desce simulando a modulação do sopro da boca
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.frequency.exponentialRampToValueAtTime(1150, now + 0.22);
      filter.frequency.exponentialRampToValueAtTime(260, now + duration);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.12);
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
}

export const lousaAudio = new LousaAudioEffects();
