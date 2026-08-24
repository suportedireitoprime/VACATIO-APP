// Narração nativa gratuita (Web Speech Synthesis) com preprocessamento jurídico.

const ABBR: Array<[RegExp, string]> = [
  [/\bArt\.?\s*/gi, "Artigo "],
  [/\bArts\.?\s*/gi, "Artigos "],
  [/§\s*/g, "parágrafo "],
  [/\bCF\/?88\b/g, "Constituição Federal"],
  [/\bCF\b/g, "Constituição Federal"],
  [/\bCPP\b/g, "Código de Processo Penal"],
  [/\bCPC\b/g, "Código de Processo Civil"],
  [/\bCP\b/g, "Código Penal"],
  [/\bCC\b/g, "Código Civil"],
  [/\bCDC\b/g, "Código de Defesa do Consumidor"],
  [/\bCLT\b/g, "Consolidação das Leis do Trabalho"],
  [/\bCTN\b/g, "Código Tributário Nacional"],
  [/\bCTB\b/g, "Código de Trânsito Brasileiro"],
  [/\bECA\b/g, "Estatuto da Criança e do Adolescente"],
  [/\bOAB\b/g, "Ordem dos Advogados do Brasil"],
  [/\bSTF\b/g, "Supremo Tribunal Federal"],
  [/\bSTJ\b/g, "Superior Tribunal de Justiça"],
];

const ORDINAIS_M = ["primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo", "oitavo", "nono", "décimo"];

export function preprocessLegalForTTS(input: string): string {
  let t = input;
  // Remove markdown
  t = t.replace(/```[\s\S]*?```/g, " ");
  t = t.replace(/`([^`]+)`/g, "$1");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1");
  t = t.replace(/\*([^*]+)\*/g, "$1");
  t = t.replace(/^#+\s*/gm, "");
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  t = t.replace(/[_>#]/g, " ");
  // Abreviações
  for (const [re, rep] of ABBR) t = t.replace(re, rep);
  // Ordinais 1º-10º
  t = t.replace(/(\d+)\s*[ºo°]/g, (_, n) => {
    const i = parseInt(n, 10);
    return ORDINAIS_M[i - 1] || `${n}º`;
  });
  // §§ → parágrafos
  t = t.replace(/parágrafo\s+parágrafo/gi, "parágrafos");
  // Colapsa espaços
  t = t.replace(/\s+/g, " ").trim();
  return t.slice(0, 2500);
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const pt = voices.filter((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (!pt.length) return null;
  const google = pt.find((v) => /google/i.test(v.name));
  const br = pt.find((v) => v.lang?.toLowerCase().includes("br"));
  return google || br || pt[0];
}

export function speakMentor(text: string, opts: { onEnd?: () => void } = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  stopMentor();
  const processed = preprocessLegalForTTS(text);
  if (!processed) return;
  const u = new SpeechSynthesisUtterance(processed);
  u.lang = "pt-BR";
  u.rate = 1.0;
  u.pitch = 1.0;
  const v = pickVoice();
  if (v) u.voice = v;
  u.onend = () => {
    currentUtterance = null;
    opts.onEnd?.();
  };
  u.onerror = () => {
    currentUtterance = null;
    opts.onEnd?.();
  };
  currentUtterance = u;
  window.speechSynthesis.speak(u);
}

export function stopMentor() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

export function isMentorSpeaking(): boolean {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking === true;
}

// Pré-carrega vozes (algumas plataformas carregam assincronamente)
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}
