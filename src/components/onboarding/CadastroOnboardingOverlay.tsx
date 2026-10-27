import TriagemMinimalista, { type TriagemMinimalistaResult } from './TriagemMinimalista';

export type CadastroResult = {
  persona: string | null;
  personaLabel: string | null;
  faixa: string | null;
  nome: string;
  dorId?: string | null;
  dorLabel?: string | null;
  dorSolucao?: string | null;
  areas?: string[];
  interesses?: string[];
  whatsapp?: string | null;
};

type Props = {
  open: boolean;
  onFinished: (r: CadastroResult) => void;
  previewMode?: boolean;
  initialName?: string;
  forceVersion?: string;
  playerRefExternal?: any;
};

const VERSION_KEY = 'triagem:version';

export function getActiveTriagemVersion(): 'A' | 'B' | 'C' {
  return 'C';
}

export function setActiveTriagemVersion(_v: 'A' | 'B' | 'C') {
  try {
    window.localStorage.setItem(VERSION_KEY, 'C');
  } catch {}
}

export default function CadastroOnboardingOverlay({
  open,
  onFinished,
  previewMode,
  initialName,
}: Props) {
  if (!open) return null;

  return (
    <TriagemMinimalista
      open={open}
      previewMode={previewMode}
      initialName={initialName}
      onFinished={(r: TriagemMinimalistaResult) => {
        onFinished({
          persona: r.persona,
          personaLabel: r.personaLabel,
          faixa: r.faixa,
          nome: r.nome,
          dorId: r.dorId,
          dorLabel: r.dorLabel,
          dorSolucao: r.dorSolucao,
          interesses: r.dorId ? [r.dorId] : [],
        });
      }}
    />
  );
}
