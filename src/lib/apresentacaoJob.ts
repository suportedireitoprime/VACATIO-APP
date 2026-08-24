import { supabase } from '@/integrations/supabase/client';

export type SlidePreparado = { b64: string; texto: string; thumb: string };

export type ApresJobEstado = {
  ativo: boolean;
  livroTabela: string;
  livroId: string;
  titulo: string;
  voz: string;
  total: number;
  feitos: number;
  falhas: number[];
  iniciadoEm: number;
  apresentacaoId: string | null;
  concluido: boolean;
  erro: string | null;
  ultimaMensagem: string;
};

type Listener = (e: ApresJobEstado | null) => void;

let estado: ApresJobEstado | null = null;
let parar = false;
const listeners = new Set<Listener>();

const emitir = () => { for (const l of listeners) l(estado ? { ...estado } : null); };

export const subscribeApresJob = (l: Listener) => {
  listeners.add(l);
  l(estado ? { ...estado } : null);
  return () => { listeners.delete(l); };
};

export const getApresJob = () => (estado ? { ...estado } : null);
export const pararApresJob = () => { parar = true; };
export const limparApresJob = () => { if (estado && !estado.ativo) { estado = null; emitir(); } };

/** Tempo estimado restante em segundos (média dos slides já feitos). */
export const etaSegundos = (e: ApresJobEstado): number | null => {
  if (!e.feitos) return null;
  const media = (Date.now() - e.iniciadoEm) / e.feitos;
  return Math.round((media * (e.total - e.feitos)) / 1000);
};

export const formatarEta = (seg: number | null): string => {
  if (seg == null) return 'calculando…';
  if (seg < 60) return `${seg}s`;
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}min ${String(s).padStart(2, '0')}s`;
};

const call = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('blog-narrar-preview', { body: payload });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Roda a geração fora do ciclo de vida do componente: continua mesmo que a
 * pessoa saia da tela. Erros pontuais em um slide não interrompem a fila —
 * o slide é reprocessado ao final (até 3 tentativas cada).
 */
export async function iniciarApresJob(params: {
  livroTabela: string; livroId: string; titulo: string; voz: string; slides: SlidePreparado[];
  /** Continuar uma apresentação já existente (não recria o registro). */
  apresentacaoExistente?: string | null;
  /** Gerar somente estes índices de slide (retomada dos que faltaram). */
  apenasIndices?: number[] | null;
}): Promise<void> {
  if (estado?.ativo) return;
  parar = false;

  // A apresentação anterior pode ter sido excluída — nesse caso o id em cache
  // gera 404 em todos os slides. Valida antes e, se não existir, recomeça.
  let existente = params.apresentacaoExistente ?? null;
  if (existente) {
    try {
      const info = await call({ acao: 'apres-faltantes', apresentacao_id: existente });
      if (info?.existe === false) existente = null;
    } catch {
      existente = null;
    }
  }

  const alvos = existente && params.apenasIndices?.length
    ? [...params.apenasIndices].sort((a, b) => a - b)
    : params.slides.map((_, i) => i);
  estado = {
    ativo: true,
    livroTabela: params.livroTabela,
    livroId: params.livroId,
    titulo: params.titulo,
    voz: params.voz,
    total: alvos.length,
    feitos: 0,
    falhas: [],
    iniciadoEm: Date.now(),
    apresentacaoId: existente,
    concluido: false,
    erro: null,
    ultimaMensagem: existente ? 'Retomando slides que faltaram…' : 'Criando apresentação…',
  };
  emitir();

  const avisarSaida = (ev: BeforeUnloadEvent) => { ev.preventDefault(); ev.returnValue = ''; };
  window.addEventListener('beforeunload', avisarSaida);

  try {
    let apresentacao_id: string | null = existente;
    if (!apresentacao_id) {
      const criado = await call({
        acao: 'apres-criar',
        livro_tabela: params.livroTabela,
        livro_id: params.livroId,
        titulo: params.titulo,
        voz: params.voz,
        total_slides: params.slides.length,
      });
      apresentacao_id = criado.apresentacao_id as string;
    }
    estado.apresentacaoId = apresentacao_id;
    estado.ultimaMensagem = 'Gerando narração dos slides…';
    emitir();

    const processar = async (i: number): Promise<boolean> => {
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        if (parar) return false;
        try {
          await call({
            acao: 'apres-slide',
            apresentacao_id,
            slide_index: i,
            imagem_b64: params.slides[i].b64,
            texto: params.slides[i].texto,
          });
          return true;
        } catch (e) {
          if (estado) {
            estado.ultimaMensagem = `Slide ${i + 1}: tentativa ${tentativa} falhou, repetindo…`;
            emitir();
          }
          await dormir(1500 * tentativa);
        }
      }
      return false;
    };

    for (let n = 0; n < alvos.length; n++) {
      const i = alvos[n];
      if (parar) break;
      const ok = await processar(i);
      if (!estado) return;
      if (!ok && !parar) estado.falhas.push(i);
      estado.feitos = n + 1;
      estado.ultimaMensagem = 'Gerando narração dos slides…';
      emitir();
    }

    // Passada final nos slides que falharam
    if (!parar && estado.falhas.length) {
      const pendentes = [...estado.falhas];
      estado.falhas = [];
      estado.ultimaMensagem = `Refazendo ${pendentes.length} slide(s) com erro…`;
      emitir();
      for (const i of pendentes) {
        if (parar) break;
        const ok = await processar(i);
        if (!estado) return;
        if (!ok) estado.falhas.push(i);
        emitir();
      }
    }

    if (estado) {
      // Fecha a apresentação: ajusta o total pelo que ficou pronto e publica
      // (sem isso ela ficava invisível na biblioteca).
      if (!parar) {
        try {
          await call({
            acao: 'apres-finalizar',
            apresentacao_id,
            total_slides: params.slides.length,
          });
        } catch { /* ignora: admin pode publicar manualmente */ }
      }
      estado.ativo = false;
      estado.concluido = !parar;
      estado.ultimaMensagem = parar
        ? 'Geração interrompida'
        : estado.falhas.length
          ? `Concluído com ${estado.falhas.length} slide(s) sem narração`
          : 'Apresentação narrada pronta!';
      emitir();
    }
  } catch (e) {
    if (estado) {
      estado.ativo = false;
      estado.erro = e instanceof Error ? e.message : 'Erro ao gerar a narração';
      estado.ultimaMensagem = estado.erro;
      emitir();
    }
  } finally {
    window.removeEventListener('beforeunload', avisarSaida);
  }
}
