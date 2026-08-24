/**
 * Controle da câmera do "Me Explique".
 *
 * Abre o preview usando a maior resolução real que o aparelho suporta e expõe
 * foco por toque, zoom e lanterna quando o hardware permite. O stream é só de
 * vídeo — o microfone é pedido apenas quando a sessão ao vivo começa.
 */

type CapacidadesAvancadas = MediaTrackCapabilities & {
  focusMode?: string[];
  exposureMode?: string[];
  whiteBalanceMode?: string[];
  zoom?: { min: number; max: number; step?: number };
  torch?: boolean;
  pointsOfInterest?: boolean;
};

type ConstraintsAvancadas = MediaTrackConstraintSet & {
  focusMode?: string;
  exposureMode?: string;
  whiteBalanceMode?: string;
  zoom?: number;
  torch?: boolean;
  pointsOfInterest?: Array<{ x: number; y: number }>;
};

export interface RecursosCamera {
  focoManual: boolean;
  zoom: { min: number; max: number } | null;
  lanterna: boolean;
}

const CASCATA: MediaTrackConstraints[] = [
  { facingMode: { ideal: "environment" }, width: { ideal: 3840 }, height: { ideal: 2160 }, frameRate: { ideal: 30 } },
  { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 }, frameRate: { ideal: 30 } },
  { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
  { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
  { facingMode: "environment" },
  {},
];

function mensagemDeErro(erro: unknown): string {
  const nome = (erro as DOMException)?.name;
  if (nome === "NotAllowedError" || nome === "SecurityError") {
    return "Acesso à câmera bloqueado. Abra os Ajustes do aparelho e libere a Câmera para o app.";
  }
  if (nome === "NotFoundError" || nome === "OverconstrainedError") {
    return "Não encontrei uma câmera disponível neste aparelho.";
  }
  if (nome === "NotReadableError") {
    return "A câmera está sendo usada por outro app. Feche o outro app e tente de novo.";
  }
  return "Não consegui abrir a câmera. Tente novamente.";
}

export class CameraMeExplique {
  private stream: MediaStream | null = null;
  private trilha: MediaStreamTrack | null = null;
  private zoomAtual = 1;
  private lanternaLigada = false;
  private timerFoco: number | null = null;

  get ativa() {
    return Boolean(this.stream);
  }

  obterStream() {
    return this.stream;
  }

  /** Pede permissão nativa e abre o preview na melhor resolução disponível. */
  async abrir(video: HTMLVideoElement): Promise<RecursosCamera> {
    if (this.stream) {
      video.srcObject = this.stream;
      await video.play().catch(() => undefined);
      return this.recursos();
    }

    const { garantirPermissoesMidia } = await import("@/lib/nativo/permissoesMidia");
    const permissoes = await garantirPermissoesMidia(true, false);
    if (!permissoes.camera) {
      throw new Error(permissoes.motivo ?? "Precisamos da câmera para ver o material.");
    }

    let ultimoErro: unknown = null;
    for (const video0 of CASCATA) {
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({ video: video0, audio: false });
        break;
      } catch (e) {
        ultimoErro = e;
        const nome = (e as DOMException)?.name;
        if (nome === "NotAllowedError" || nome === "SecurityError") break;
      }
    }

    if (!this.stream) throw new Error(mensagemDeErro(ultimoErro));

    this.trilha = this.stream.getVideoTracks()[0] ?? null;
    await this.aplicarMelhorias();

    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);

    return this.recursos();
  }

  /** Sobe para o máximo real do sensor e liga foco/exposição contínuos. */
  private async aplicarMelhorias() {
    const trilha = this.trilha;
    if (!trilha?.getCapabilities) return;

    let caps: CapacidadesAvancadas = {};
    try {
      caps = trilha.getCapabilities() as CapacidadesAvancadas;
    } catch {
      return;
    }

    const alvo: ConstraintsAvancadas = {};
    if (caps.width?.max) alvo.width = { ideal: caps.width.max };
    if (caps.height?.max) alvo.height = { ideal: caps.height.max };
    if (caps.frameRate?.max) alvo.frameRate = { ideal: Math.min(30, caps.frameRate.max) };
    if (caps.focusMode?.includes("continuous")) alvo.focusMode = "continuous";
    if (caps.exposureMode?.includes("continuous")) alvo.exposureMode = "continuous";
    if (caps.whiteBalanceMode?.includes("continuous")) alvo.whiteBalanceMode = "continuous";

    if (Object.keys(alvo).length === 0) return;
    try {
      await trilha.applyConstraints(alvo as MediaTrackConstraints);
    } catch {
      // Aparelho não aceita: seguimos com o que já está aberto.
    }
  }

  recursos(): RecursosCamera {
    let caps: CapacidadesAvancadas = {};
    try {
      caps = (this.trilha?.getCapabilities?.() ?? {}) as CapacidadesAvancadas;
    } catch {
      caps = {};
    }
    return {
      focoManual: Boolean(caps.focusMode?.length),
      zoom: caps.zoom ? { min: caps.zoom.min, max: caps.zoom.max } : null,
      lanterna: Boolean(caps.torch),
    };
  }

  /** Foco pontual (coordenadas normalizadas 0..1 dentro do preview). */
  async focarEm(x: number, y: number) {
    const trilha = this.trilha;
    if (!trilha?.applyConstraints) return;

    let caps: CapacidadesAvancadas = {};
    try {
      caps = trilha.getCapabilities() as CapacidadesAvancadas;
    } catch {
      return;
    }

    const alvo: ConstraintsAvancadas = {};
    if (caps.pointsOfInterest) {
      alvo.pointsOfInterest = [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }];
    }
    if (caps.focusMode?.includes("single-shot")) alvo.focusMode = "single-shot";
    else if (caps.focusMode?.includes("manual")) alvo.focusMode = "manual";
    if (Object.keys(alvo).length === 0) return;

    try {
      await trilha.applyConstraints(alvo as MediaTrackConstraints);
    } catch {
      return;
    }

    // Volta ao foco contínuo depois de um instante.
    if (this.timerFoco) window.clearTimeout(this.timerFoco);
    this.timerFoco = window.setTimeout(() => {
      if (!caps.focusMode?.includes("continuous")) return;
      void trilha
        .applyConstraints({ focusMode: "continuous" } as MediaTrackConstraints)
        .catch(() => undefined);
    }, 2600);
  }

  get zoom() {
    return this.zoomAtual;
  }

  async definirZoom(valor: number) {
    const trilha = this.trilha;
    const faixa = this.recursos().zoom;
    if (!trilha?.applyConstraints || !faixa) return this.zoomAtual;
    const alvo = Math.min(faixa.max, Math.max(faixa.min, valor));
    try {
      await trilha.applyConstraints({ zoom: alvo } as MediaTrackConstraints);
      this.zoomAtual = alvo;
    } catch {
      // ignora
    }
    return this.zoomAtual;
  }

  get lanterna() {
    return this.lanternaLigada;
  }

  async alternarLanterna(ligar?: boolean) {
    const trilha = this.trilha;
    if (!trilha?.applyConstraints || !this.recursos().lanterna) return false;
    const alvo = ligar ?? !this.lanternaLigada;
    try {
      await trilha.applyConstraints({ torch: alvo } as MediaTrackConstraints);
      this.lanternaLigada = alvo;
    } catch {
      // ignora
    }
    return this.lanternaLigada;
  }

  fechar() {
    if (this.timerFoco) window.clearTimeout(this.timerFoco);
    this.timerFoco = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.trilha = null;
    this.zoomAtual = 1;
    this.lanternaLigada = false;
  }
}
