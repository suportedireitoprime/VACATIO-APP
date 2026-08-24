import React from 'react';
import { parseCrossReferences, type CrossReference } from '@/lib/crossReferences';

interface CrossReferenceRendererProps {
  text: string;
  onCrossReferenceClick: (artigoNum: string) => void;
}

export const CrossReferenceRenderer: React.FC<CrossReferenceRendererProps> = ({ text, onCrossReferenceClick }) => {
  const references = parseCrossReferences(text);

  if (references.length === 0) {
    return <>{text}</>;
  }

  const nodes: React.ReactNode[] = [];
  let currentIndex = 0;

  references.forEach((ref, i) => {
    // Add text before the reference
    if (ref.index > currentIndex) {
      nodes.push(<span key={`text-${i}`}>{text.substring(currentIndex, ref.index)}</span>);
    }

    // Add the reference as a clickable link
    nodes.push(
      <button
        key={`ref-${i}`}
        onClick={(e) => {
          e.stopPropagation();
          onCrossReferenceClick(ref.artigoNum);
        }}
        className="text-primary font-semibold hover:underline cursor-pointer active:scale-95 transition-transform inline-flex bg-primary/10 px-1 rounded mx-0.5"
        title={`Ver artigo ${ref.artigoNum}`}
      >
        {ref.text}
      </button>
    );

    currentIndex = ref.index + ref.length;
  });

  // Add remaining text after the last reference
  if (currentIndex < text.length) {
    nodes.push(<span key={`text-end`}>{text.substring(currentIndex)}</span>);
  }

  return <>{nodes}</>;
};

export default CrossReferenceRenderer;
