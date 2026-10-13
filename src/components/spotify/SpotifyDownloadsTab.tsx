import React, { useState, useEffect } from 'react';
import { ArrowDownToLine, Play, Trash2, HardDrive, WifiOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSpotifyAudioStore, type SpotifyTrack } from '@/stores/useSpotifyAudioStore';
import { db, type OfflineNarracao } from '@/services/offlineDb';
import { estimateAudiosSize, removeAudio, removeAllAudios } from '@/services/audioDownloadService';
import { getLeiCover } from '@/lib/leiTheme';
import { formatArtigoLabel } from '@/services/narracaoArtigosSyncService';

export const SpotifyDownloadsTab: React.FC = () => {
  const { playTrack, currentTrack, refreshDownloadedList } = useSpotifyAudioStore();
  const [offlineRows, setOfflineRows] = useState<OfflineNarracao[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ count: number; bytes: number }>({ count: 0, bytes: 0 });
  const [loading, setLoading] = useState(true);

  const loadOfflineItems = async () => {
    setLoading(true);
    try {
      const rows = await db.narracoes.toArray().catch(() => []);
      setOfflineRows(rows);
      const est = await estimateAudiosSize();
      setStorageInfo(est);
    } catch (err) {
      console.warn('[SpotifyDownloadsTab] Erro ao carregar offline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOfflineItems();
  }, []);

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const handlePlayOffline = (row: OfflineNarracao) => {
    const leiSlug = row.tabelaNome || 'cp';
    const artigoNum = row.artigoNumero;
    const coverUrl = getLeiCover(leiSlug);

    const track: SpotifyTrack = {
      id: `${leiSlug}::${artigoNum}`,
      tipo: 'lei',
      leiId: leiSlug,
      leiSlug,
      leiNome: leiSlug.toUpperCase(),
      artigoNumero: artigoNum,
      numeroFormatado: formatArtigoLabel(artigoNum),
      titulo: `${formatArtigoLabel(artigoNum)} • ${leiSlug.toUpperCase()}`,
      subtitulo: 'Áudio Salvo Offline',
      texto: 'Reprodução direta da memória interna do aparelho.',
      audioUrl: '', // O store já puxa o Blob de db.narracoes automaticamente!
      coverUrl,
      ordem: 0,
    };

    playTrack(track);
    toast.success(`Tocando ${formatArtigoLabel(artigoNum)} no modo offline!`);
  };

  const handleRemoveOne = async (row: OfflineNarracao) => {
    await removeAudio(row.tabelaNome, row.artigoNumero);
    await loadOfflineItems();
    await refreshDownloadedList();
    toast.info('Áudio removido do aparelho.');
  };

  const handleClearAll = async () => {
    if (confirm('Deseja excluir todos os áudios baixados do seu dispositivo?')) {
      await removeAllAudios();
      await loadOfflineItems();
      await refreshDownloadedList();
      toast.success('Todos os áudios offline foram removidos.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header de Downloads */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-sky-950/40 via-zinc-900 to-black border border-sky-500/20 shadow-2xl space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-sky-400 flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" /> REPRODUÇÃO OFFLINE (SEM INTERNET)
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Áudios no Aparelho
            </h2>
            <p className="text-xs text-zinc-300">
              Escute no avião, no trânsito ou sem gastar seus dados móveis.
            </p>
          </div>

          {storageInfo.count > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 text-zinc-500 hover:text-rose-400 transition-colors"
              title="Limpar todos os downloads"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1 text-xs font-semibold text-zinc-400">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            {storageInfo.count} faixas baixadas
          </span>
          <span>&bull;</span>
          <span>{formatSize(storageInfo.bytes)} ocupados</span>
        </div>
      </div>

      {/* Lista de Arquivos Offline */}
      <div className="space-y-1.5">
        {loading ? (
          <div className="py-16 text-center text-xs text-zinc-400">
            Carregando áudios offline...
          </div>
        ) : offlineRows.length === 0 ? (
          <div className="py-20 text-center space-y-2 bg-zinc-900/40 rounded-3xl border border-white/5 p-6">
            <ArrowDownToLine className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-bold text-zinc-300">Nenhum áudio baixado</p>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto">
              Ao visualizar qualquer lei ou artigo, toque no botão de baixar para salvar diretamente na memória do seu aparelho.
            </p>
          </div>
        ) : (
          offlineRows.map((row, idx) => {
            const numFmt = formatArtigoLabel(row.artigoNumero);
            const isCurrent = currentTrack?.artigoNumero === row.artigoNumero;

            return (
              <div
                key={row.id}
                onClick={() => handlePlayOffline(row)}
                className={`p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors border ${
                  isCurrent
                    ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                    : 'bg-zinc-900/40 hover:bg-zinc-800/60 border-white/5 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-zinc-500 w-5 text-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {numFmt} &bull; {row.tabelaNome.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-emerald-400 truncate mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Pronto para reproduzir offline
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveOne(row);
                    }}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 transition-colors"
                    title="Remover do aparelho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
