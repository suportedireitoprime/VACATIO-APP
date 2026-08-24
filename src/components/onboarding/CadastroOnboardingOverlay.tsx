import { useEffect, useState } from 'react';
import TriagemVersaoA from './versoes/TriagemVersaoA';
import TriagemVersaoB from './versoes/TriagemVersaoB';
import TriagemVersaoC from './versoes/TriagemVersaoC';
import type { TriagemResult } from './versoes/triagemShared';

export type CadastroResult = {
  persona: TriagemResult['persona'];
  personaLabel: string | null;
  faixa: string | null;
  nome: string;
  areas?: string[];
  interesses?: string[];
  whatsapp?: string | null;
};

type Props = {
  open: boolean;
  onFinished: (r: CadastroResult) => void;
  previewMode?: boolean;
  initialName?: string;
  /** Forces a specific version, ignoring localStorage. */
  forceVersion?: 'A' | 'B' | 'C';
  playerRefExternal?: any;
};

const VERSION_KEY = 'triagem:version';

export function getActiveTriagemVersion(): 'A' | 'B' | 'C' {
  if (typeof window === 'undefined') return 'C';
  const v = window.localStorage.getItem(VERSION_KEY);
  return v === 'A' || v === 'B' || v === 'C' ? v : 'C';
}

export function setActiveTriagemVersion(v: 'A' | 'B' | 'C') {
  try {
    window.localStorage.setItem(VERSION_KEY, v);
  } catch {}
}

export default function CadastroOnboardingOverlay({
  open,
  onFinished,
  previewMode,
  forceVersion,
}: Props) {
  const [version, setVersion] = useState<'A' | 'B' | 'C'>(() => forceVersion || getActiveTriagemVersion());

  useEffect(() => {
    if (forceVersion) setVersion(forceVersion);
    else if (open) setVersion(getActiveTriagemVersion());
  }, [open, forceVersion]);

  const handleFinished = (r: TriagemResult) => {
    onFinished({
      persona: r.persona,
      personaLabel: r.personaLabel,
      faixa: r.faixa,
      nome: r.nome,
      areas: r.areas,
      interesses: r.interesses,
      whatsapp: r.whatsapp,
    });
  };

  if (!open) return null;
  const Comp = version === 'B' ? TriagemVersaoB : version === 'C' ? TriagemVersaoC : TriagemVersaoA;
  return <Comp open={open} onFinished={handleFinished} previewMode={previewMode} />;
}
