/**
 * Utilitário para detecção de referências cruzadas em textos de leis.
 * Focado na detecção de "art. 5", "arts. 3º e 4º", etc.
 */
import React from 'react';

export interface CrossReference {
  text: string;     // O texto capturado ("art. 5º")
  artigoNum: string; // O número do artigo normalizado ("5")
  index: number;    // A posição na string original
  length: number;   // O tamanho do texto capturado
}

// Regex para capturar padrões comuns de citação de artigos
// Exemplos capturados: "art. 5", "artigo 10", "arts. 1 e 2", "artigos 3º, 4º e 5º", "art. 1º-A"
// Atualizado para evitar capturar a si mesmo no início da frase se for "Art. X".
const ARTIGO_REGEX = /(?:art\.|artigo|arts\.|artigos)\s+([0-9]+(?:º|°)?(?:-[A-Z])?(?:\s*(?:,|e)\s*[0-9]+(?:º|°)?(?:-[A-Z])?)*)/gi;

/**
 * Analisa um texto e retorna todas as referências cruzadas encontradas.
 */
export function parseCrossReferences(text: string): CrossReference[] {
  const references: CrossReference[] = [];
  let match;

  // Reset regex state
  ARTIGO_REGEX.lastIndex = 0;

  while ((match = ARTIGO_REGEX.exec(text)) !== null) {
    const matchedText = match[0];
    
    const numMatch = matchedText.match(/([0-9]+)(?:º|°)?(-[A-Z])?/i);
    if (numMatch) {
      let artigoNum = numMatch[1];
      if (numMatch[2]) {
        artigoNum += numMatch[2].toUpperCase();
      }
      
      references.push({
        text: matchedText,
        artigoNum: artigoNum,
        index: match.index,
        length: matchedText.length
      });
    }
  }

  return references;
}

/**
 * Transforma uma string em um array de ReactNodes, substituindo as referências
 * cruzadas por botões clicáveis.
 */
export function linkifyCrossReferences(
  text: string, 
  onClick?: (artigoNum: string) => void
): React.ReactNode[] {
  if (!onClick) return [text];

  const references = parseCrossReferences(text);
  if (references.length === 0) return [text];

  const nodes: React.ReactNode[] = [];
  let currentIndex = 0;

  references.forEach((ref, i) => {
    if (ref.index > currentIndex) {
      nodes.push(<React.Fragment key={`text-${i}`}>{text.substring(currentIndex, ref.index)}</React.Fragment>);
    }

    nodes.push(
      <button
        key={`ref-${i}`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(ref.artigoNum);
        }}
        className="text-primary font-semibold hover:underline cursor-pointer active:scale-95 transition-transform inline-flex rounded mx-0.5 align-baseline"
        title={`Ver artigo ${ref.artigoNum}`}
      >
        {ref.text}
      </button>
    );

    currentIndex = ref.index + ref.length;
  });

  if (currentIndex < text.length) {
    nodes.push(<React.Fragment key={`text-end`}>{text.substring(currentIndex)}</React.Fragment>);
  }

  return nodes;
}
