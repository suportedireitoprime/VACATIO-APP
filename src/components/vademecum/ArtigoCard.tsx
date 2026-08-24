import { ChevronRight, Heart, Highlighter, StickyNote } from 'lucide-react';
import type { ArtigoLei } from '@/data/mockData';

// Cascata suave só nos primeiros itens visíveis (delay incremental de 28ms).
// Do 13º em diante o item entra sem delay — o browser + content-visibility
// garantem que só os visíveis pagam o custo de render.
const CASCADE_MAX_DELAY_INDEX = 8;
const CASCADE_STEP_MS = 22;

interface ArtigoCardProps {
  artigo: ArtigoLei;
  index: number;
  onClick: () => void;
  highlightText?: (text: string) => React.ReactNode;
  isHighlighted?: boolean;
  /** Accent color for badge + structural headers (defaults to amber). */
  accentColor?: string;
  /** Card ganha efeito shine — usado nos primeiros itens da lista. */
  withShine?: boolean;
  /** Tag indicators (favorito / grifado / anotado) rendered under the number badge. */
  tags?: { favorito?: boolean; grifado?: boolean; anotado?: boolean };
}

const normalizeArtigoLabel = (value: string) => value
  .replace(/°/g, 'º')
  .replace(/^Art\.\s*(\d+)o\b/i, 'Art. $1º')
  .replace(/^Art\.\s*(\d+)-([A-Z])\b/i, (_, numero, sufixo) => {
    const artigoNumero = Number(numero);
    return artigoNumero >= 1 && artigoNumero <= 9
      ? `Art. ${artigoNumero}º-${String(sufixo).toUpperCase()}`
      : `Art. ${artigoNumero}-${String(sufixo).toUpperCase()}`;
  })
  .replace(/^Art\.\s*([1-9])$/i, 'Art. $1º');

const structuralRe = /^(PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\b/i;
const structuralSuffixRe = /(^|[.;:)])\s+(?=(?:PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s+(?:[IVXLCDM]+|[0-9]+|[ÚU]NICO|PRELIMINAR)\b)[\s\S]*$/i;
const planaltoAnnotationRe = /\s*[\(\[]?\s*(?:Redação\s+dada|Incluíd[oa]|Acrescid[oa]|Revogad[oa]|Alterad[oa]|Vide|Vigência|Regulamento|Nova\s+redação|Renumerad[oa]|Transformad[oa]|Restabelecid[oa]|Produção\s+de\s+efeito)[\s\S]*$/i;

const cleanStructuralText = (value: string) => value.replace(planaltoAnnotationRe, '').replace(/\s+/g, ' ').trim();

const ArtigoCard = ({ artigo, index, onClick, highlightText, isHighlighted, withShine, tags }: ArtigoCardProps) => {
  const displayNumero = normalizeArtigoLabel(artigo.numero);

  // Cabeçalhos estruturais (PARTE, TÍTULO, CAPÍTULO…) — cartõezinhos verticais
  // com borda âmbar à esquerda (padrão DIREITO PRIME).
  if (structuralRe.test(displayNumero) || structuralRe.test(artigo.caput.split('\n')[0] || '')) {
    const raw = (artigo.caput || displayNumero).trim();
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    let head = cleanStructuralText(lines[0] || displayNumero) || displayNumero;
    let sub = cleanStructuralText(lines.slice(1).join(' — '));
    // Sempre tenta separar "TÍTULO I ..." do resto — mesmo sem hífen/traço.
    const splitRe = /^((?:PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s+[IVXLCDM0-9º°]+(?:-[A-Z])?)\s*[–—\-:]?\s*(.+)$/i;
    // Regex mais estrita: só re-quebra quando existe separador explícito.
    // Evita que "CAPÍTULO II" seja partido em "CAPÍTULO I" + "I" por backtracking do quantificador.
    const strictSplitRe = /^((?:PARTE|LIVRO|T[ÍI]TULO|CAP[ÍI]TULO|SE[ÇC][ÃA]O|SUBSE[ÇC][ÃA]O)\s+[IVXLCDM0-9º°]+(?:-[A-Z])?)\s*[–—\-:]\s*(.+)$/i;
    if (!sub) {
      // 1) tenta com separador explícito; 2) fallback permissivo só se o tail
      // tiver ≥3 chars (evita quebrar "CAPÍTULO II" em "CAPÍTULO I" + "I").
      let m = head.match(strictSplitRe);
      if (!m) {
        const m2 = head.match(splitRe);
        if (m2 && m2[2] && m2[2].trim().length >= 3) m = m2;
      }
      if (m) { head = cleanStructuralText(m[1].trim()) || head; sub = cleanStructuralText(m[2].trim()); }
    } else {
      // Já temos sub na próxima linha — só re-parte o head se houver separador visível.
      const m = head.match(strictSplitRe);
      if (m && m[2]) { head = cleanStructuralText(m[1].trim()) || head; sub = cleanStructuralText([m[2].trim(), sub].filter(Boolean).join(' — ')); }
    }
    const structuralDelay = `${Math.min(index, CASCADE_MAX_DELAY_INDEX) * CASCADE_STEP_MS}ms`;
    return (
      <div
        className="article-cascade-item animate-cascade-in px-4 sm:px-6 pt-5 pb-3 sm:pt-6 sm:pb-4 flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ animationDelay: structuralDelay }}
      >
        <p className="text-[15px] sm:text-[16px] uppercase tracking-[0.24em] font-extrabold text-amber-300 leading-tight break-words">
          {head}
        </p>
        {sub && (
          <p className="text-[16px] sm:text-[18px] mt-2 font-serif italic font-medium leading-snug text-amber-100/95 break-words normal-case max-w-[36ch] mx-auto">
            {(() => {
              const lower = sub.toLowerCase();
              let wordIdx = 0;
              return lower.replace(/\S+/g, (word) => {
                const isFirst = wordIdx === 0;
                wordIdx++;
                // Capitaliza apenas palavras com mais de 3 letras ou a primeira palavra.
                if (isFirst || word.length > 3) {
                  return word.charAt(0).toUpperCase() + word.slice(1);
                }
                return word;
              });
            })()}
          </p>
        )}
      </div>
    );
  }

  // Extract short label for badge (e.g. "1º", "121", "3º-A")
  const badgeLabel = displayNumero.replace(/^Art\.?\s*/i, '').trim() || displayNumero;

  const cleanCaput = artigo.caput.replace(structuralSuffixRe, '$1').trim();
  const lines = cleanCaput.split('\n').map(l => l.trim()).filter(Boolean);
  let previewText = cleanCaput;
  if (lines.length > 0) {
    const first = lines[0];
    const isNomen = first.replace(/\s*\([^)]*\)\s*/g, '').trim().length < 100 && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÚÇ]/.test(first) && !/^(Art\.|§|Parágrafo|[IVXLC]+\s*[-–.]|[a-z]\))/i.test(first);
    // Junta linhas quebradas em um parágrafo contínuo (o extractor às vezes
    // preserva <br> no meio da frase). Pula o "nomen" e para no primeiro
    // §/Parágrafo/Inciso — só queremos o caput.
    const body = isNomen ? lines.slice(1) : lines;
    const stopIdx = body.findIndex(l => /^(§|Parágrafo|[IVXLC]+\s*[-–.]|[a-z]\))/i.test(l));
    const caputLines = stopIdx >= 0 ? body.slice(0, stopIdx) : body;
    previewText = caputLines.join(' ').replace(/\s+/g, ' ').trim() || first;
  }
  previewText = previewText.replace(/\s*\((?:Redação|Incluído|Revogado|Acrescido|Alterado|Vide|Regulamento)[^)]*\)/gi, '');
  previewText = previewText.replace(/^Art\.?\s*\d+[º°]?(-[A-Z])?\s*[\.\-]?\s*/i, '').trim();

  const isRevogado = previewText.trim().length === 0 && cleanCaput.trim().length > 0;
  if (isRevogado) previewText = artigo.caput.trim();

  const renderCaput = highlightText ? highlightText(previewText) : previewText;
  const artLabel = /^Art\.?/i.test(displayNumero) ? displayNumero.replace(/\s+/g, ' ').trim() : `Art. ${badgeLabel}`;

  const cascadeDelay = `${Math.min(index, CASCADE_MAX_DELAY_INDEX) * CASCADE_STEP_MS}ms`;

  const isADCT = typeof artigo.ordem === 'number' && artigo.ordem > 10000;

  return (
    <div
      className="article-cascade-item animate-cascade-in"
      style={{ animationDelay: cascadeDelay }}
    >
      
      <button
        id={`artigo-${artigo.id}`}
        onClick={() => {
          try {
            const key = 'artigos_vistos';
            const seenKey = 'artigos_vistos_ids';
            const seen: string[] = JSON.parse(localStorage.getItem(seenKey) || '[]');
            const id = String(artigo.id);
            if (!seen.includes(id)) {
              seen.push(id);
              localStorage.setItem(seenKey, JSON.stringify(seen.slice(-5000)));
              localStorage.setItem(key, String(seen.length));
            }
          } catch {}
          onClick();
        }}
        className={`group w-full min-h-[84px] text-left px-3 py-2.5 rounded-2xl bg-card/70 border transition-colors active:scale-[0.997] relative overflow-hidden flex items-stretch gap-3 ${
          isHighlighted
            ? 'border-primary ring-2 ring-primary shadow-[0_0_20px_4px_hsl(var(--primary)/0.3)]'
            : isADCT
              ? 'border-sky-400/40 hover:border-sky-300/60 hover:bg-card'
              : 'border-border/60 hover:border-amber-400/40 hover:bg-card'
        }`}
      >
        {withShine && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent animate-card-shine"
          />
        )}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <span className="relative h-12 w-12 rounded-xl bg-gradient-to-br from-amber-300/25 to-amber-600/10 border border-amber-400/30 flex flex-col items-center justify-center leading-none overflow-hidden">
            {withShine && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-amber-100/30 to-transparent animate-card-shine"
              />
            )}
            <span className="relative text-[16px] font-bold text-amber-200 leading-none">{badgeLabel}</span>
            <span className="relative mt-0.5 text-[8px] uppercase tracking-[0.18em] font-bold text-amber-300/80 leading-none">Art</span>
          </span>
          {(tags?.favorito || tags?.grifado || tags?.anotado) && (
            <div className="flex items-center gap-1">
              {tags?.favorito && (
                <Heart className="w-3 h-3 text-rose-400 fill-rose-400" aria-label="Favoritado" />
              )}
              {tags?.grifado && (
                <Highlighter className="w-3 h-3 text-amber-300" aria-label="Grifado" />
              )}
              {tags?.anotado && (
                <StickyNote className="w-3 h-3 text-sky-400" aria-label="Com anotação" />
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          {isADCT && (
            <span className="inline-flex items-center self-start mb-1 px-1.5 py-[1px] rounded-md bg-sky-500/15 border border-sky-400/40 text-[9px] font-bold uppercase tracking-[0.14em] text-sky-300 leading-none">
              ADCT · Disposições Transitórias
            </span>
          )}
          <p className={`text-[12.5px] leading-snug line-clamp-2 ${isRevogado ? 'text-purple-300 italic' : 'text-muted-foreground'}`}>
            {!isRevogado && (
              <>
                <span className="font-bold text-foreground">{artLabel}</span>
                <span className="mx-1.5 text-muted-foreground/60">—</span>
              </>
            )}
            {renderCaput}
          </p>
        </div>
        <div className="shrink-0 flex items-start pt-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </button>
    </div>
  );
};

export default ArtigoCard;
