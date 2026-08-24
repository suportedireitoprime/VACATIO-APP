/**
 * Narração humanizada usando a Web Speech API nativa do navegador
 * (voz gratuita do Google no Chrome/Android, voz do sistema em iOS/Safari).
 *
 * Não usa nenhum serviço pago; roda 100% no cliente.
 */

export type NarradorVoz = {
  id: string;                // voice.voiceURI
  nome: string;              // rótulo bonito pra UI
  lang: string;
  genero: 'masculino' | 'feminino' | 'desconhecido';
  fornecedor: 'google' | 'sistema';
};

const romanoRegex = /^(?=[MDCLXVI])M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;
function romanoParaExtenso(r: string): string {
  const mapa: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let total = 0;
  const s = r.toUpperCase();
  for (let i = 0; i < s.length; i++) {
    const cur = mapa[s[i]];
    const next = mapa[s[i + 1]];
    total += next && next > cur ? -cur : cur;
  }
  return String(total);
}

/** Expande abreviações jurídicas e normaliza pontuação para uma leitura mais natural. */
export function humanizarTexto(input: string): string {
  if (!input) return '';
  let t = input;

  // Normaliza espaços e quebras
  t = t.replace(/\r/g, '').replace(/\u00a0/g, ' ');

  // Expansões jurídicas comuns
  const subs: Array<[RegExp, string]> = [
    [/\bart\.?\s*(\d+)/gi, 'artigo $1'],
    [/\barts\.?\s*(\d+)/gi, 'artigos $1'],
    [/\bincs?\.?\s*/gi, 'inciso '],
    [/\bpar[aá]gr?\.?\s*/gi, 'parágrafo '],
    [/§\s*(\d+)/g, 'parágrafo $1'],
    [/§§\s*/g, 'parágrafos '],
    [/\bn[ºo°]\s*/gi, 'número '],
    [/\bCF\/?88\b/g, 'Constituição Federal de 1988'],
    [/\bCF\b/g, 'Constituição Federal'],
    [/\bCPC\b/g, 'Código de Processo Civil'],
    [/\bCPP\b/g, 'Código de Processo Penal'],
    [/\bCP\b/g, 'Código Penal'],
    [/\bCC\b/g, 'Código Civil'],
    [/\bCLT\b/g, 'Consolidação das Leis do Trabalho'],
    [/\bSTF\b/g, 'Supremo Tribunal Federal'],
    [/\bSTJ\b/g, 'Superior Tribunal de Justiça'],
    [/\bTST\b/g, 'Tribunal Superior do Trabalho'],
    [/\bADM\b/gi, 'administração'],
    [/\bex\.?\s*:/gi, 'por exemplo:'],
    [/\betc\./gi, 'etcétera'],
    [/\bp\.?\s*ex\.?/gi, 'por exemplo'],
  ];
  for (const [re, rep] of subs) t = t.replace(re, rep);

  // Converte incisos em algarismo romano isolado em palavras (ex.: "inciso IV" → "inciso 4")
  t = t.replace(/\b(inciso|artigo|capítulo|título|livro)\s+([MDCLXVI]+)\b/gi, (_m, kind, roman) => {
    if (romanoRegex.test(roman)) return `${kind} ${romanoParaExtenso(roman)}`;
    return `${kind} ${roman}`;
  });

  // Números com separadores → mantém, mas troca "R$" por "reais"
  t = t.replace(/R\$\s*/g, 'reais ');

  // Markdown básico → texto plano
  t = t
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Conectivos longos ganham vírgula depois (respiração natural)
  t = t.replace(/\b(portanto|todavia|entretanto|contudo|ademais|outrossim|não obstante)\b(?!\s*,)/gi, '$1,');

  // Substitui ";" e ":" no meio de frases por "." pra render pausa mais longa
  t = t.replace(/\s*[;:]\s+/g, '. ');

  // Reduz múltiplos espaços
  t = t.replace(/[ \t]+/g, ' ');
  // Preserva parágrafos duplos
  t = t.replace(/\n{2,}/g, '\n\n').replace(/[ \t]*\n[ \t]*/g, (m) => (m.includes('\n\n') ? '\n\n' : ' '));

  return t.trim();
}

/** Quebra o texto humanizado em frases curtas para dar respirações reais entre elas. */
function fatiarEmFrases(texto: string, maxLen = 220): string[] {
  const paragrafos = texto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (let p = 0; p < paragrafos.length; p++) {
    const par = paragrafos[p];
    const frases = par.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [par];
    let atual = '';
    const flush = () => {
      const s = atual.trim();
      if (s) out.push(s);
      atual = '';
    };
    for (const raw of frases) {
      const f = raw.trim();
      if (!f) continue;
      if (f.length > maxLen) {
        flush();
        // corta por vírgulas
        const partes = f.split(/,\s*/);
        let buffer = '';
        for (const parte of partes) {
          if (buffer && (buffer + ', ' + parte).length > maxLen) {
            out.push(buffer.trim() + ',');
            buffer = parte;
          } else {
            buffer = buffer ? `${buffer}, ${parte}` : parte;
          }
        }
        if (buffer.trim()) out.push(buffer.trim());
        continue;
      }
      if (atual && (atual + ' ' + f).length > maxLen) flush();
      atual = atual ? `${atual} ${f}` : f;
    }
    flush();
    // marcador de parágrafo (pausa maior)
    if (p < paragrafos.length - 1) out.push('__BREATH__');
  }
  return out;
}

/** Lista vozes disponíveis, ordenadas: Google pt-BR masculino > Google pt-BR > pt-BR sistema. */
export function listarVozes(): NarradorVoz[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const raw = window.speechSynthesis.getVoices();
  const heur = raw
    .filter((v) => /^pt(-|_)?BR/i.test(v.lang) || /portugues|português/i.test(v.name))
    .map<NarradorVoz>((v) => {
      const isGoogle = /google/i.test(v.name);
      const isMale =
        /mascul|male|homem|ricardo|felipe|carlos|antonio|antônio|joão|joao|paulo/i.test(v.name);
      const isFemale = /femin|female|mulher|luciana|helena|maria|júlia|julia|camila/i.test(v.name);
      return {
        id: v.voiceURI,
        nome: v.name,
        lang: v.lang,
        genero: isMale ? 'masculino' : isFemale ? 'feminino' : 'desconhecido',
        fornecedor: isGoogle ? 'google' : 'sistema',
      };
    });
  // ordena: google masculino > google > sistema masculino > sistema
  const rank = (v: NarradorVoz) =>
    (v.fornecedor === 'google' ? 0 : 2) + (v.genero === 'masculino' ? 0 : 1);
  return heur.sort((a, b) => rank(a) - rank(b));
}

async function garantirVozes(timeoutMs = 1200): Promise<void> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  if (window.speechSynthesis.getVoices().length > 0) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', done);
      resolve();
    };
    window.speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, timeoutMs);
  });
}

export type NarradorEstado = 'parado' | 'falando' | 'pausado';

export class AulaNarrator {
  private frases: string[] = [];
  private i = 0;
  private cancelled = false;
  private vozId?: string;
  private rate = 0.95;
  private onState?: (s: NarradorEstado) => void;
  private onProgress?: (i: number, total: number) => void;

  configurar(opts: { vozId?: string; rate?: number }) {
    if (opts.vozId !== undefined) this.vozId = opts.vozId;
    if (opts.rate !== undefined) this.rate = opts.rate;
  }

  observar(cbs: { onState?: (s: NarradorEstado) => void; onProgress?: (i: number, total: number) => void }) {
    this.onState = cbs.onState;
    this.onProgress = cbs.onProgress;
  }

  suportado(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  async falar(texto: string): Promise<void> {
    if (!this.suportado()) return;
    this.parar();
    await garantirVozes();
    const humano = humanizarTexto(texto);
    this.frases = fatiarEmFrases(humano);
    this.i = 0;
    this.cancelled = false;
    this.onState?.('falando');
    this.executarProxima();
  }

  private pegarVoz(): SpeechSynthesisVoice | undefined {
    const vozes = window.speechSynthesis.getVoices();
    if (this.vozId) {
      const encontrada = vozes.find((v) => v.voiceURI === this.vozId);
      if (encontrada) return encontrada;
    }
    // fallback: primeira pt-BR ordenada
    const [preferida] = listarVozes();
    return preferida ? vozes.find((v) => v.voiceURI === preferida.id) : undefined;
  }

  private executarProxima() {
    if (this.cancelled || this.i >= this.frases.length) {
      this.onState?.('parado');
      return;
    }
    const frase = this.frases[this.i];
    this.onProgress?.(this.i, this.frases.length);

    if (frase === '__BREATH__') {
      // pausa maior entre parágrafos
      this.i += 1;
      setTimeout(() => this.executarProxima(), 650);
      return;
    }

    const u = new SpeechSynthesisUtterance(frase);
    const voz = this.pegarVoz();
    if (voz) {
      u.voice = voz;
      u.lang = voz.lang;
    } else {
      u.lang = 'pt-BR';
    }
    u.rate = this.rate;
    u.pitch = 1.0;
    u.volume = 1.0;

    u.onend = () => {
      if (this.cancelled) return;
      this.i += 1;
      // respiração curta entre frases
      setTimeout(() => this.executarProxima(), 220);
    };
    u.onerror = () => {
      if (this.cancelled) return;
      this.i += 1;
      setTimeout(() => this.executarProxima(), 120);
    };

    try {
      window.speechSynthesis.speak(u);
    } catch {
      /* ignore */
    }
  }

  pausar() {
    if (!this.suportado()) return;
    try {
      window.speechSynthesis.pause();
      this.onState?.('pausado');
    } catch { /* ignore */ }
  }

  retomar() {
    if (!this.suportado()) return;
    try {
      window.speechSynthesis.resume();
      this.onState?.('falando');
    } catch { /* ignore */ }
  }

  parar() {
    if (!this.suportado()) return;
    this.cancelled = true;
    try {
      window.speechSynthesis.cancel();
    } catch { /* ignore */ }
    this.onState?.('parado');
  }
}
