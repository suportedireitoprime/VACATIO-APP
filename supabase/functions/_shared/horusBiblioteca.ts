// Busca de material real (PDF) na biblioteca do Vade Mecum.
// Todos os livros têm um link no Google Drive (coluna `download`) e um link
// de leitura online (coluna `link`). Aqui casamos o tema pedido pelo usuário
// com o acervo — por título/área/sinopse e, se preciso, pelo conteúdo do PDF
// já digitalizado (biblioteca_leitura_nativa.conteudo_md).

interface TabelaCfg {
  tabela: string;
  titulo: string;
  autor?: string;
  capa: string;
}

const TABELAS: TabelaCfg[] = [
  { tabela: "biblioteca_estudos", titulo: "tema", capa: "capa_livro" },
  { tabela: "biblioteca_oab", titulo: "tema", capa: "capa_livro" },
  { tabela: "biblioteca_classicos", titulo: "livro", autor: "autor", capa: "imagem" },
  { tabela: "biblioteca_fora_da_toga", titulo: "livro", autor: "autor", capa: "capa_livro" },
  { tabela: "biblioteca_lideranca", titulo: "livro", autor: "autor", capa: "imagem" },
  { tabela: "biblioteca_oratoria", titulo: "livro", autor: "autor", capa: "capa_livro" },
  { tabela: "biblioteca_portugues", titulo: "livro", autor: "autor", capa: "imagem" },
  { tabela: "biblioteca_pesquisa_cientifica", titulo: "livro", autor: "autor", capa: "imagem" },
];

export interface LivroBiblioteca {
  titulo: string;
  autor?: string;
  capa?: string;
  sobre?: string;
  area?: string;
  driveUrl: string;
  leituraUrl?: string;
  tabela: string;
  id: string | number;
  score: number;
}

const STOP = new Set([
  "sobre","para","como","que","uma","dos","das","com","por","the","and","tema","assunto",
  "pdf","material","apostila","resumo","livro","videoaula","video","aula","direito","lei",
  "artigo","quero","manda","enviar","envie","favor","mais","meu","minha","você","voce","tem",
]);

function palavras(tema: string): string[] {
  return String(tema || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP.has(w))
    .slice(0, 6);
}

function normalizar(s: unknown): string {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escapeOr(v: string): string {
  return v.replace(/[,()%]/g, " ").trim();
}

/** Procura o livro da biblioteca que melhor combina com o tema. */
export async function buscarLivroPorTema(
  admin: any,
  tema: string,
): Promise<LivroBiblioteca | null> {
  const kws = palavras(tema);
  if (!kws.length) return null;

  const candidatos: LivroBiblioteca[] = [];

  await Promise.all(TABELAS.map(async (cfg) => {
    const cols = ["id", cfg.titulo, cfg.capa, "sobre", "area", "download", "link"];
    if (cfg.autor) cols.push(cfg.autor);
    const ors = kws.flatMap((k) => {
      const kw = escapeOr(k);
      return [`${cfg.titulo}.ilike.%${kw}%`, `sobre.ilike.%${kw}%`, `area.ilike.%${kw}%`];
    }).join(",");
    try {
      const { data, error } = await admin
        .from(cfg.tabela)
        .select(cols.join(","))
        .or(ors)
        .limit(30);
      if (error || !data) return;
      for (const row of data as any[]) {
        const drive = String(row.download || row.link || "");
        if (!drive) continue;
        const titulo = String(row[cfg.titulo] || "");
        const tNorm = normalizar(titulo);
        const aNorm = normalizar(row.area);
        const sNorm = normalizar(row.sobre).slice(0, 4000);
        let score = 0;
        for (const k of kws) {
          if (tNorm.includes(k)) score += 6;
          if (aNorm.includes(k)) score += 3;
          if (sNorm.includes(k)) score += 1;
        }
        if (!score) continue;
        candidatos.push({
          titulo,
          autor: cfg.autor ? String(row[cfg.autor] || "") : undefined,
          capa: row[cfg.capa] || undefined,
          sobre: row.sobre || undefined,
          area: row.area || undefined,
          driveUrl: drive,
          leituraUrl: row.link || undefined,
          tabela: cfg.tabela,
          id: row.id,
          score,
        });
      }
    } catch (e) {
      console.warn("buscarLivroPorTema", cfg.tabela, String((e as Error)?.message || e));
    }
  }));

  if (candidatos.length) {
    candidatos.sort((a, b) => b.score - a.score);
    return candidatos[0];
  }

  // Fallback: busca dentro do conteúdo já digitalizado dos PDFs.
  return await buscarPorConteudo(admin, kws);
}

async function buscarPorConteudo(admin: any, kws: string[]): Promise<LivroBiblioteca | null> {
  const kw = escapeOr(kws[0] || "");
  if (!kw) return null;
  try {
    const { data } = await admin
      .from("biblioteca_leitura_nativa")
      .select("livro_id, livro_tabela, conteudo_md_refinado, conteudo_md")
      .or(`conteudo_md_refinado.ilike.%${kw}%,conteudo_md.ilike.%${kw}%`)
      .limit(5);
    if (!data?.length) return null;

    let melhor: { row: any; score: number } | null = null;
    for (const row of data as any[]) {
      const texto = normalizar(row.conteudo_md_refinado || row.conteudo_md).slice(0, 200000);
      let score = 0;
      for (const k of kws) {
        const hits = texto.split(k).length - 1;
        score += Math.min(hits, 20);
      }
      if (!melhor || score > melhor.score) melhor = { row, score };
    }
    if (!melhor) return null;

    const cfg = TABELAS.find((t) => t.tabela === melhor!.row.livro_tabela);
    if (!cfg) return null;
    const cols = ["id", cfg.titulo, cfg.capa, "sobre", "area", "download", "link"];
    if (cfg.autor) cols.push(cfg.autor);
    const { data: livro } = await admin
      .from(cfg.tabela)
      .select(cols.join(","))
      .eq("id", melhor.row.livro_id)
      .maybeSingle();
    if (!livro) return null;
    const drive = String((livro as any).download || (livro as any).link || "");
    if (!drive) return null;
    return {
      titulo: String((livro as any)[cfg.titulo] || ""),
      autor: cfg.autor ? String((livro as any)[cfg.autor] || "") : undefined,
      capa: (livro as any)[cfg.capa] || undefined,
      sobre: (livro as any).sobre || undefined,
      area: (livro as any).area || undefined,
      driveUrl: drive,
      leituraUrl: (livro as any).link || undefined,
      tabela: cfg.tabela,
      id: (livro as any).id,
      score: melhor.score,
    };
  } catch (e) {
    console.warn("buscarPorConteudo fail", String((e as Error)?.message || e));
    return null;
  }
}
