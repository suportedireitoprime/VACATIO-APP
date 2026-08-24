import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, MessageCircle, Star, Users } from 'lucide-react';
import { useLocalSocial, AVALIACAO_TAGS, type TagAvaliacao } from '@/hooks/useLocalSocial';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface Props { localId: string; }

function tempoRelativo(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const dias = Math.floor(diff / (86400 * 1000));
  if (dias < 1) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  return `há ${Math.floor(meses / 12)} anos`;
}

export function LocalSocialSection({ localId }: Props) {
  const { stats, checkedIn, minhaAvaliacao, avaliacoesPublicas, fazerCheckin, salvarAvaliacao } = useLocalSocial(localId);
  const [nota, setNota] = useState<number>(0);
  const [tags, setTags] = useState<TagAvaliacao[]>([]);
  const [comentario, setComentario] = useState('');
  const [aberta, setAberta] = useState(false);

  useEffect(() => {
    if (minhaAvaliacao) {
      setNota(minhaAvaliacao.nota);
      setTags((minhaAvaliacao.tags ?? []) as TagAvaliacao[]);
      setComentario(minhaAvaliacao.comentario ?? '');
    }
  }, [minhaAvaliacao]);

  const toggleTag = (t: TagAvaliacao) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const submeter = async () => {
    if (!nota) return;
    await salvarAvaliacao(nota, tags, comentario);
    setAberta(false);
  };

  return (
    <div className="space-y-4">
      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-secondary/40 border border-border p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-primary">
            <Users className="w-3.5 h-3.5" />
            <span className="font-bold text-sm">{stats?.checkins ?? 0}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">visitas</div>
        </div>
        <div className="rounded-xl bg-secondary/40 border border-border p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-600">
            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
            <span className="font-bold text-sm">{stats?.avaliacao_media || '—'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            {stats?.avaliacao_total ?? 0} avaliações
          </div>
        </div>
        <div className="rounded-xl bg-secondary/40 border border-border p-2 text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="font-bold text-sm">{tempoRelativo(stats?.ultima_visita) ?? '—'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">última visita</div>
        </div>
      </div>

      {/* Check-in */}
      <Button
        onClick={fazerCheckin}
        variant={checkedIn ? 'outline' : 'default'}
        className="w-full h-11"
        disabled={checkedIn}
      >
        {checkedIn ? (
          <><CheckCircle2 className="w-4 h-4 mr-2 text-green-600" /> Você já esteve aqui</>
        ) : (
          <><MapPin className="w-4 h-4 mr-2" /> Estive aqui</>
        )}
      </Button>

      {/* Sua avaliação */}
      {!aberta ? (
        <Button variant="outline" className="w-full h-11" onClick={() => setAberta(true)}>
          <Star className="w-4 h-4 mr-2" /> {minhaAvaliacao ? 'Editar minha avaliação' : 'Deixar avaliação'}
        </Button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setNota(n)} aria-label={`${n} estrelas`}>
                <Star className={`w-7 h-7 ${n <= nota ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AVALIACAO_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition ${
                  tags.includes(t)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Conte sua experiência (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value.slice(0, 500))}
            className="min-h-[80px] text-sm"
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAberta(false)} className="flex-1">Cancelar</Button>
            <Button size="sm" onClick={submeter} disabled={!nota} className="flex-1">Publicar</Button>
          </div>
        </div>
      )}

      {/* Comentários da comunidade */}
      {avaliacoesPublicas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
            <MessageCircle className="w-3.5 h-3.5" /> Da comunidade
          </div>
          {avaliacoesPublicas.slice(0, 5).map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-3 h-3 ${n <= a.nota ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground/40'}`} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">{tempoRelativo(a.created_at)}</span>
              </div>
              {a.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  {a.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {a.comentario && <p className="text-sm text-foreground/90 leading-snug">{a.comentario}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
