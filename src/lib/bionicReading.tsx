import React from 'react';

/**
 * Converte um texto cru em nós React, aplicando a técnica de Leitura Dinâmica (Bionic Reading).
 * Engrossa aproximadamente a primeira metade de cada palavra.
 */
export function applyBionicReading(text: string): React.ReactNode[] {
  if (!text) return [text];
  
  // Divide preservando palavras e não-palavras
  const tokens = text.split(/([\p{L}\p{N}]+)/u);
  
  return tokens.map((token, i) => {
    // Se for palavra alfanumérica
    if (token.match(/^[\p{L}\p{N}]+$/u)) {
      // Regra comum: engrossar até 50% da palavra (mínimo de 1 letra, arredonda pra cima)
      let splitIndex = Math.ceil(token.length / 2);
      if (token.length === 3) splitIndex = 1; // Para "que", "por", fica só a 1ª letra
      
      const boldPart = token.slice(0, splitIndex);
      const normalPart = token.slice(splitIndex);
      
      return (
        <React.Fragment key={`bionic-${i}`}>
          <b className="font-bold opacity-100">{boldPart}</b>
          <span className="opacity-90">{normalPart}</span>
        </React.Fragment>
      );
    }
    
    // Espaços ou pontuações
    return <React.Fragment key={`text-${i}`}>{token}</React.Fragment>;
  });
}
