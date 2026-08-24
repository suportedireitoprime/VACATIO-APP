import { supabase } from '@/integrations/supabase/client';
import { getLeisCatalog, fetchArtigosPaginado } from '@/services/legislacaoService';

const MODES = ['explicacao', 'exemplo', 'termos', 'sugerir_perguntas'] as const;

export interface LogEntry {
  time: string;
  text: string;
  type: 'info' | 'success' | 'error' | 'skip';
}

export interface WorkerState {
  running: boolean;
  currentLei: string;
  currentArtigo: string;
  currentMode: string;
  leiProgress: number;
  leiTotal: number;
  overallDone: number;
  overallTotal: number;
  stats: { generated: number; skipped: number; errors: number };
  logs: LogEntry[];
}

type Listener = (state: WorkerState) => void;

class ExplicacaoWorker {
  private state: WorkerState = this.defaultState();
  private snapshot: WorkerState = this.state;
  private listeners = new Set<Listener>();
  private abortController: AbortController | null = null;

  private defaultState(): WorkerState {
    return {
      running: false,
      currentLei: '',
      currentArtigo: '',
      currentMode: '',
      leiProgress: 0,
      leiTotal: 0,
      overallDone: 0,
      overallTotal: 0,
      stats: { generated: 0, skipped: 0, errors: 0 },
      logs: [],
    };
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => { this.listeners.delete(fn); };
  }

  private emit() {
    this.snapshot = { ...this.state, stats: { ...this.state.stats }, logs: [...this.state.logs] };
    this.listeners.forEach(fn => fn(this.snapshot));
  }

  private update(partial: Partial<WorkerState>) {
    Object.assign(this.state, partial);
    this.emit();
  }

  private addLog(text: string, type: LogEntry['type'] = 'info') {
    const time = new Date().toLocaleTimeString('pt-BR');
    this.state.logs = [...this.state.logs, { time, text, type }];
    this.emit();
  }

  getState() {
    return this.snapshot;
  }

  isRunning() {
    return this.state.running;
  }

  stop() {
    this.abortController?.abort();
    this.update({ running: false });
    this.addLog('⏹️ Processamento interrompido pelo usuário.', 'info');
  }

  async start(selectedIds: Set<string>) {
    if (this.state.running) return;

    const catalog = getLeisCatalog();
    const allLaws = [
      ...catalog.filter(l => l.tipo === 'constituicao'),
      ...catalog.filter(l => l.tipo === 'codigo'),
      ...catalog.filter(l => l.tipo === 'estatuto'),
      ...catalog.filter(l => l.tipo === 'lei-especial'),
      ...catalog.filter(l => l.tipo === 'previdenciario'),
    ];
    const selectedLaws = allLaws.filter(l => selectedIds.has(l.id));
    if (selectedLaws.length === 0) return;

    const controller = new AbortController();
    this.abortController = controller;

    this.state = this.defaultState();
    this.update({
      running: true,
      overallTotal: selectedLaws.length,
    });

    this.addLog(`🚀 Iniciando processamento de ${selectedLaws.length} lei(s)...`, 'info');

    for (let li = 0; li < selectedLaws.length; li++) {
      if (controller.signal.aborted) break;
      const lei = selectedLaws[li];
      this.update({ currentLei: `${lei.nome} (${lei.sigla})`, overallDone: li });
      this.addLog(`📖 Processando: ${lei.nome} (${lei.sigla})`, 'info');

      let artigos: any[];
      try {
        artigos = await fetchArtigosPaginado(lei.tabela_nome, 0, 2000);
      } catch {
        this.addLog(`❌ Erro ao carregar artigos de ${lei.sigla}`, 'error');
        this.state.stats.errors++;
        this.emit();
        continue;
      }

      // Batch-fetch cached modes via RPC instead of per-article queries
      const cacheMap = new Map<string, Set<string>>();
      try {
        const { data: cacheData } = await (supabase as any).rpc('contar_cache_por_lei', { p_tabela: lei.tabela_nome });
        if (cacheData) {
          (cacheData as any[]).forEach((row: any) => {
            cacheMap.set(row.artigo_numero, new Set(row.modos_cached || []));
          });
        }
      } catch {
        this.addLog(`⚠️ Fallback: verificação individual para ${lei.sigla}`, 'info');
      }

      this.update({ leiTotal: artigos.length, leiProgress: 0 });

      for (let ai = 0; ai < artigos.length; ai++) {
        if (controller.signal.aborted) break;
        const art = artigos[ai];
        const artigoNum = art.numero || art.id;
        this.update({ currentArtigo: artigoNum, leiProgress: ai + 1 });

        const cachedModes = cacheMap.get(artigoNum) || new Set<string>();
        const missingModes = MODES.filter(m => !cachedModes.has(m));

        if (missingModes.length === 0) {
          this.state.stats.skipped++;
          this.emit();
          this.addLog(`⏭️ ${lei.sigla} — ${artigoNum} [já completo]`, 'skip');
          continue;
        }

        for (const mode of missingModes) {
          if (controller.signal.aborted) break;
          this.update({ currentMode: mode });

          try {
            // Build richer text for sugerir_perguntas
            let textoEnvio = art.caput;
            if (mode === 'sugerir_perguntas') {
              const parts = [art.caput];
              if (art.incisos?.length) parts.push(...art.incisos.map((inc: any) => typeof inc === 'string' ? inc : String(inc)));
              if (art.paragrafos?.length) parts.push(...art.paragrafos.map((p: any) => typeof p === 'string' ? p : String(p)));
              textoEnvio = parts.join('\n\n');
            }

            const { data, error } = await supabase.functions.invoke('assistente-juridica', {
              body: { mode, artigoTexto: textoEnvio, artigoNumero: artigoNum, leiNome: lei.nome },
            });
            if (error) throw error;
            const reply = data?.reply;
            if (!reply) throw new Error('Resposta vazia');

            await supabase.from('artigo_ai_cache').insert({
              tabela_codigo: lei.tabela_nome,
              numero_artigo: artigoNum,
              tipo: mode,
              conteudo: reply,
            });

            this.state.stats.generated++;
            this.emit();
            this.addLog(`✅ ${lei.sigla} — ${artigoNum} [${mode}]`, 'success');
          } catch (err: any) {
            this.state.stats.errors++;
            this.emit();
            this.addLog(`❌ ${lei.sigla} — ${artigoNum} [${mode}]: ${err.message || 'Erro'}`, 'error');
          }

          await new Promise(r => setTimeout(r, 1500));
        }
      }
      this.addLog(`✅ ${lei.sigla} finalizado!`, 'success');
    }

    this.update({ overallDone: selectedLaws.length, running: false });
    this.addLog('🎉 Processamento concluído!', 'info');
  }
}

export const explicacaoWorker = new ExplicacaoWorker();
