/**
 * Cliente da Gemini Live API (WebSocket bidirecional) para a função "Me Explique".
 *
 * Fluxo: token efêmero (edge function) -> WebSocket -> setup -> envia frames da
 * câmera (~1 fps JPEG) + áudio do microfone (PCM 16-bit 16kHz) -> recebe áudio
 * PCM 24kHz e transcrições.
 */

const WS_HOST = "wss://generativelanguage.googleapis.com/ws";
const WS_URLS = [
  `${WS_HOST}/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained`,
  `${WS_HOST}/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained`,
  `${WS_HOST}/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`,
];

/** Primeira instrução falada: faz o professor comentar o que está vendo. */
const ABERTURA =
  "Estou apontando a câmera agora. Olhe a imagem e comece falando em português do Brasil: diga em uma frase o que você está vendo (se for uma pessoa, um rosto ou algo que não seja material de estudo, diga isso com bom humor e peça para apontar para o livro, slide, caderno ou tela). Se for material de estudo, diga o tema e comece a explicar. Fale sempre em voz alta.";


export type StatusLive =
  | "inativo"
  | "conectando"
  | "ouvindo"
  | "falando"
  | "erro"
  | "encerrado";

export interface FalaTranscrita {
  quem: "aluno" | "professor";
  texto: string;
}

export interface OpcoesLive {
  token: string;
  modelo: string;
  /** Setup completo quando o token não trava a configuração no servidor. */
  setup?: Record<string, unknown> | null;
  video: HTMLVideoElement;
  /** Stream de vídeo já aberto pelo preview (evita reabrir a câmera). */
  streamVideo?: MediaStream | null;

  onStatus: (status: StatusLive) => void;
  onTranscricao: (fala: FalaTranscrita) => void;
  onErro: (mensagem: string) => void;
  /** Frames por segundo enviados ao modelo (limite recomendado: 1). */
  fps?: number;
}


const TAXA_ENTRADA = 16000;
const TAXA_SAIDA = 24000;

function base64FromBytes(bytes: Uint8Array): string {
  let binario = "";
  const bloco = 0x8000;
  for (let i = 0; i < bytes.length; i += bloco) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloco));
  }
  return btoa(binario);
}

function bytesFromBase64(b64: string): Uint8Array {
  const binario = atob(b64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/** Float32 (-1..1) -> PCM 16-bit little-endian, reamostrado para 16kHz. */
function paraPcm16(amostras: Float32Array, taxaOrigem: number): Uint8Array {
  const razao = taxaOrigem / TAXA_ENTRADA;
  const total = Math.floor(amostras.length / razao);
  const buffer = new ArrayBuffer(total * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < total; i += 1) {
    const amostra = amostras[Math.floor(i * razao)] ?? 0;
    const limitada = Math.max(-1, Math.min(1, amostra));
    view.setInt16(i * 2, limitada < 0 ? limitada * 0x8000 : limitada * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

export class SessaoMeExplique {
  private ws: WebSocket | null = null;
  private stream: MediaStream | null = null;
  private ctxEntrada: AudioContext | null = null;
  private processador: ScriptProcessorNode | null = null;
  private fonte: MediaStreamAudioSourceNode | null = null;
  private ctxSaida: AudioContext | null = null;
  private proximaFala = 0;
  private timerFrames: number | null = null;
  private canvas = document.createElement("canvas");
  /** true quando a própria sessão abriu a câmera (sem preview externo). */
  private streamProprio = true;

  private pronto = false;
  private micAtivo = true;
  private encerrada = false;
  private bufferAluno = "";
  private bufferProfessor = "";

  constructor(private opcoes: OpcoesLive) {}

  get microfoneAtivo() {
    return this.micAtivo;
  }

  async iniciar() {
    this.opcoes.onStatus("conectando");

    // Nativo (Android/iOS): garante RECORD_AUDIO (e CAMERA, se o preview ainda
    // não abriu) antes do getUserMedia, senão a WebView devolve NotAllowedError.
    const precisaCamera = !this.opcoes.streamVideo;
    const { garantirPermissoesMidia } = await import("@/lib/nativo/permissoesMidia");
    const permissoes = await garantirPermissoesMidia(precisaCamera, true);
    if ((precisaCamera && !permissoes.camera) || !permissoes.microfone) {
      throw new Error(permissoes.motivo ?? "Precisamos da câmera e do microfone para explicar o conteúdo.");
    }

    if (this.opcoes.streamVideo) {
      // Preview já está no ar: só abrimos o microfone.
      this.streamProprio = false;
      this.stream = await this.abrirMicrofone();
    } else {
      this.streamProprio = true;
      this.stream = await this.abrirCamera();
      this.opcoes.video.srcObject = this.stream;
      this.opcoes.video.muted = true;
      this.opcoes.video.playsInline = true;
      await this.opcoes.video.play().catch(() => undefined);
    }

    await this.conectar();
    // Libera o áudio de saída ainda dentro do gesto do usuário (autoplay iOS).
    this.garantirSaida();
    this.iniciarAudio();
    this.iniciarFrames();

    // Depois do primeiro frame, pede que o professor comente o que está vendo.
    window.setTimeout(() => this.enviarTexto(ABERTURA, true), 900);
  }

  private get restricoesAudio() {
    return { echoCancellation: true, noiseSuppression: true, channelCount: 1 } as const;
  }

  /** Abre só o microfone (quando o vídeo já vem do preview). */
  private async abrirMicrofone(): Promise<MediaStream> {
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: this.restricoesAudio });
    } catch (e) {
      const nome = (e as DOMException)?.name;
      if (nome === "NotAllowedError" || nome === "SecurityError") {
        throw new Error(
          "Acesso ao microfone bloqueado. Abra os Ajustes do aparelho e libere o Microfone para o app.",
        );
      }
      if (nome === "NotReadableError") {
        throw new Error("O microfone está sendo usado por outro app. Feche o outro app e tente de novo.");
      }
      throw new Error("Não consegui abrir o microfone. Tente novamente.");
    }
  }

  /** Abre câmera traseira + microfone, com fallbacks para aparelhos restritivos. */
  private async abrirCamera(): Promise<MediaStream> {
    const audio = this.restricoesAudio;
    const tentativas: MediaStreamConstraints[] = [
      { video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio },
      { video: { facingMode: "environment" }, audio },
      { video: true, audio },
    ];

    let ultimoErro: unknown = null;
    for (const constraints of tentativas) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        ultimoErro = e;
        const nome = (e as DOMException)?.name;
        // Permissão negada de fato: não faz sentido tentar outros constraints.
        if (nome === "NotAllowedError" || nome === "SecurityError") break;
      }
    }

    const nome = (ultimoErro as DOMException)?.name;
    if (nome === "NotAllowedError" || nome === "SecurityError") {
      throw new Error(
        "Acesso à câmera/microfone bloqueado. Abra os Ajustes do aparelho e libere Câmera e Microfone para o app.",
      );
    }
    if (nome === "NotFoundError" || nome === "OverconstrainedError") {
      throw new Error("Não encontrei uma câmera disponível neste aparelho.");
    }
    if (nome === "NotReadableError") {
      throw new Error("A câmera está sendo usada por outro app. Feche o outro app e tente de novo.");
    }
    throw new Error("Não consegui abrir a câmera. Tente novamente.");
  }



  /** Tenta os endpoints conhecidos até um aceitar o setup (setupComplete). */
  private async conectar() {
    let ultimo = "";
    for (const url of WS_URLS) {
      try {
        await this.abrirWs(url);
        return;
      } catch (e) {
        ultimo = e instanceof Error ? e.message : String(e);
        this.ws?.close();
        this.ws = null;
        if (this.encerrada) throw e;
      }
    }
    throw new Error(ultimo || "Não foi possível conectar ao professor ao vivo.");
  }

  private abrirWs(url: string) {
    return new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${url}?access_token=${encodeURIComponent(this.opcoes.token)}`);
      this.ws = ws;
      let resolvido = false;

      const falhar = (msg: string) => {
        if (resolvido) return;
        resolvido = true;
        reject(new Error(msg));
      };

      ws.onopen = () => {
        // Se o token já trava a configuração, basta o modelo; senão enviamos o
        // setup completo devolvido pela edge function.
        const setup = this.opcoes.setup ?? { model: `models/${this.opcoes.modelo}` };
        ws.send(JSON.stringify({ setup }));
      };

      ws.onmessage = (evento) => {
        void this.receber(evento.data, () => {
          if (resolvido) return;
          resolvido = true;
          this.pronto = true;
          this.opcoes.onStatus("ouvindo");
          resolve();
        });
      };

      ws.onerror = () => {
        if (!this.pronto) falhar("Não foi possível conectar ao professor ao vivo.");
        else this.opcoes.onErro("Conexão instável com o professor ao vivo.");
      };

      ws.onclose = (evento) => {
        this.pronto = false;
        if (!resolvido) {
          falhar(
            evento.reason?.trim()
              ? `Sessão ao vivo recusada: ${evento.reason.trim()}`
              : "Não foi possível conectar ao professor ao vivo.",
          );
          return;
        }
        if (!this.encerrada) {
          if (evento.reason?.trim()) this.opcoes.onErro(evento.reason.trim());
          this.opcoes.onStatus("encerrado");
        }
      };
    });
  }

  private async receber(dados: unknown, onSetup?: () => void) {
    let texto: string;
    if (typeof dados === "string") texto = dados;
    else if (dados instanceof Blob) texto = await dados.text();
    else return;

    let msg: any;
    try {
      msg = JSON.parse(texto);
    } catch {
      return;
    }

    if (msg.setupComplete) {
      onSetup?.();
      return;
    }


    const conteudo = msg.serverContent;
    if (!conteudo) return;

    for (const parte of conteudo.modelTurn?.parts ?? []) {
      const inline = parte.inlineData;
      if (inline?.data && String(inline.mimeType ?? "").includes("audio")) {
        this.tocar(inline.data);
      }
    }

    if (conteudo.inputTranscription?.text) {
      this.bufferAluno += conteudo.inputTranscription.text;
    }
    if (conteudo.outputTranscription?.text) {
      this.bufferProfessor += conteudo.outputTranscription.text;
    }

    if (conteudo.interrupted) {
      this.pararFala();
      this.opcoes.onStatus("ouvindo");
    }

    if (conteudo.turnComplete || conteudo.generationComplete) {
      if (this.bufferAluno.trim()) {
        this.opcoes.onTranscricao({ quem: "aluno", texto: this.bufferAluno.trim() });
        this.bufferAluno = "";
      }
      if (this.bufferProfessor.trim()) {
        this.opcoes.onTranscricao({ quem: "professor", texto: this.bufferProfessor.trim() });
        this.bufferProfessor = "";
      }
      if (conteudo.turnComplete) this.opcoes.onStatus("ouvindo");
    }
  }

  // ----- áudio de saída -----

  private garantirSaida() {
    if (!this.ctxSaida) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctxSaida = new Ctx({ sampleRate: TAXA_SAIDA });
    }
    if (this.ctxSaida.state === "suspended") void this.ctxSaida.resume();
    return this.ctxSaida;
  }

  private tocar(b64: string) {
    const ctx = this.garantirSaida();
    const bytes = bytesFromBase64(b64);
    const amostras = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    if (amostras.length === 0) return;

    const buffer = ctx.createBuffer(1, amostras.length, TAXA_SAIDA);
    const canal = buffer.getChannelData(0);
    for (let i = 0; i < amostras.length; i += 1) canal[i] = amostras[i] / 0x8000;

    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(ctx.destination);

    const inicio = Math.max(ctx.currentTime + 0.04, this.proximaFala);
    fonte.start(inicio);
    this.proximaFala = inicio + buffer.duration;
    this.opcoes.onStatus("falando");
  }

  private pararFala() {
    this.proximaFala = 0;
    if (this.ctxSaida) {
      void this.ctxSaida.close().catch(() => undefined);
      this.ctxSaida = null;
    }
  }

  // ----- áudio de entrada -----

  private iniciarAudio() {
    if (!this.stream) return;
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    this.ctxEntrada = ctx;
    this.fonte = ctx.createMediaStreamSource(this.stream);
    const processador = ctx.createScriptProcessor(4096, 1, 1);
    this.processador = processador;

    processador.onaudioprocess = (evento) => {
      if (!this.pronto || !this.micAtivo || this.ws?.readyState !== WebSocket.OPEN) return;
      const pcm = paraPcm16(evento.inputBuffer.getChannelData(0), ctx.sampleRate);
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: { data: base64FromBytes(pcm), mimeType: `audio/pcm;rate=${TAXA_ENTRADA}` },
          },
        }),
      );
    };

    this.fonte.connect(processador);
    processador.connect(ctx.destination);
  }

  // ----- vídeo -----

  private iniciarFrames() {
    // 0.5 fps (1 quadro a cada 2s) já basta para livro/quadro e corta pela
    // metade o custo de vídeo da Live API.
    const fps = this.opcoes.fps ?? 0.5;
    const intervalo = Math.max(500, Math.round(1000 / fps));
    this.timerFrames = window.setInterval(() => this.enviarFrame(), intervalo);
    // primeiro frame quase imediato para o modelo já reconhecer o material
    window.setTimeout(() => this.enviarFrame(), 400);
  }

  /** Captura o quadro atual em alta definição e envia ao modelo. */
  enviarFrame() {
    const video = this.opcoes.video;
    if (!this.pronto || this.ws?.readyState !== WebSocket.OPEN) return;
    if (!video.videoWidth || !video.videoHeight) return;

    // Até 1280px no lado maior: legível para texto de livro sem estourar a Live API.
    const MAIOR = 1280;
    const escala = Math.min(1, MAIOR / Math.max(video.videoWidth, video.videoHeight));
    const largura = Math.round(video.videoWidth * escala);
    const altura = Math.round(video.videoHeight * escala);
    this.canvas.width = largura;
    this.canvas.height = altura;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(video, 0, 0, largura, altura);
    const dataUrl = this.canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];
    if (!base64) return;

    this.ws.send(
      JSON.stringify({ realtimeInput: { video: { data: base64, mimeType: "image/jpeg" } } }),
    );

  }

  // ----- controles -----

  alternarMicrofone(ativo?: boolean) {
    this.micAtivo = ativo ?? !this.micAtivo;
    this.stream?.getAudioTracks().forEach((t) => {
      t.enabled = this.micAtivo;
    });
    return this.micAtivo;
  }

  /** Envia um turno de texto e pede resposta imediata (voz). */
  enviarTexto(texto: string, silencioso = false) {
    if (!this.pronto || this.ws?.readyState !== WebSocket.OPEN) return;
    this.garantirSaida();
    this.ws.send(
      JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: texto }] }],
          turnComplete: true,
        },
      }),
    );
    if (!silencioso) this.opcoes.onStatus("falando");
  }


  encerrar() {
    this.encerrada = true;
    this.pronto = false;
    if (this.timerFrames) window.clearInterval(this.timerFrames);
    this.timerFrames = null;
    if (this.processador) this.processador.onaudioprocess = null;
    this.processador?.disconnect();
    this.fonte?.disconnect();
    if (this.ctxEntrada) void this.ctxEntrada.close().catch(() => undefined);
    this.ctxEntrada = null;
    this.pararFala();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    // Só desligamos o preview quando a câmera foi aberta por esta sessão.
    if (this.streamProprio && this.opcoes.video.srcObject) this.opcoes.video.srcObject = null;

    this.ws?.close();
    this.ws = null;
    this.opcoes.onStatus("inativo");
  }
}
