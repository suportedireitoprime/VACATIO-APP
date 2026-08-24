// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Curadoria de obras.
 * - `categorias`  → áreas do Direito relacionadas
 * - `habilidades` → habilidades práticas que a obra desenvolve no estudante/operador
 *                   (ver src/lib/tematicaHabilidades.ts)
 */
type Entrada = {
  tmdb_id: number;
  tipo: "movie" | "tv";
  categorias: string[];
  habilidades?: string[];
  destaque?: boolean;
  ordem?: number;
};

const CURADORIA: Entrada[] = [
  // ============ CLÁSSICOS JURÍDICOS (curadoria original) ============
  { tmdb_id: 389, tipo: "movie", categorias: ["Júri", "Processo Penal"], habilidades: ["argumentacao","persuasao","etica"], destaque: true, ordem: 1 },
  { tmdb_id: 881, tipo: "movie", categorias: ["Direito Militar", "Processo Penal"], habilidades: ["oratoria","argumentacao","etica"], destaque: true, ordem: 2 },
  { tmdb_id: 497, tipo: "movie", categorias: ["Pena de Morte", "Direito Penal"], habilidades: ["etica","resiliencia"], destaque: true, ordem: 3 },
  { tmdb_id: 819, tipo: "movie", categorias: ["Direitos Humanos", "Erro Judiciário"], habilidades: ["resiliencia","argumentacao"], ordem: 4 },
  { tmdb_id: 462, tipo: "movie", categorias: ["Direito Ambiental", "Class Action"], habilidades: ["investigacao","persuasao","resiliencia"], ordem: 5 },
  { tmdb_id: 730, tipo: "movie", categorias: ["Direito do Trabalho", "Discriminação"], habilidades: ["argumentacao","etica"], ordem: 6 },
  { tmdb_id: 985, tipo: "movie", categorias: ["Advocacia", "Ética"], habilidades: ["estrategia","etica"], ordem: 7 },
  { tmdb_id: 8916, tipo: "movie", categorias: ["Júri", "Direito Penal"], habilidades: ["argumentacao","oratoria"], ordem: 8 },
  { tmdb_id: 3175, tipo: "movie", categorias: ["Advocacia", "Direito do Consumidor"], habilidades: ["argumentacao","persuasao"], ordem: 9 },
  { tmdb_id: 1710, tipo: "movie", categorias: ["Advocacia", "Ética"], habilidades: ["investigacao","etica"], ordem: 10 },
  { tmdb_id: 25520, tipo: "movie", categorias: ["Advocacia", "Direito Penal"], habilidades: ["estrategia","argumentacao"], ordem: 11 },
  { tmdb_id: 9295, tipo: "movie", categorias: ["Júri", "Litígio"], habilidades: ["estrategia","persuasao"], ordem: 12 },
  { tmdb_id: 4547, tipo: "movie", categorias: ["Processo Penal", "Direito Penal"], habilidades: ["estrategia","argumentacao"], ordem: 13 },
  { tmdb_id: 15074, tipo: "movie", categorias: ["Advocacia", "Responsabilidade Civil"], habilidades: ["argumentacao","resiliencia"], ordem: 14 },
  { tmdb_id: 12102, tipo: "movie", categorias: ["Direito de Família"], habilidades: ["negociacao"], ordem: 15 },
  { tmdb_id: 25736, tipo: "movie", categorias: ["Direitos Humanos", "Nuremberg"], habilidades: ["argumentacao","etica"], ordem: 16 },
  { tmdb_id: 8010, tipo: "movie", categorias: ["Direitos Humanos", "Escravidão"], habilidades: ["argumentacao","oratoria"], ordem: 17 },
  { tmdb_id: 3007, tipo: "movie", categorias: ["Whistleblower", "Direito do Consumidor"], habilidades: ["etica","investigacao"], ordem: 18 },
  { tmdb_id: 549850, tipo: "movie", categorias: ["Direito Ambiental", "Class Action"], habilidades: ["investigacao","etica","resiliencia"], ordem: 19 },
  { tmdb_id: 296098, tipo: "movie", categorias: ["Direito Internacional"], habilidades: ["negociacao","estrategia"], ordem: 20 },
  { tmdb_id: 534909, tipo: "movie", categorias: ["Processo Penal", "Direitos Civis"], habilidades: ["argumentacao","oratoria"], destaque: true, ordem: 21 },
  { tmdb_id: 522627, tipo: "movie", categorias: ["Pena de Morte", "Direitos Humanos"], habilidades: ["etica","resiliencia"], ordem: 22 },
  { tmdb_id: 227306, tipo: "movie", categorias: ["Advocacia", "Processo Penal"], habilidades: ["argumentacao","resiliencia"], ordem: 23 },
  { tmdb_id: 424694, tipo: "movie", categorias: ["Direitos Civis", "Igualdade de Gênero"], habilidades: ["argumentacao","resiliencia"], ordem: 24 },
  { tmdb_id: 335866, tipo: "movie", categorias: ["Direitos Civis", "Direito de Família"], habilidades: ["resiliencia"], ordem: 25 },
  { tmdb_id: 366696, tipo: "movie", categorias: ["Liberdade de Expressão", "Direito Civil"], habilidades: ["argumentacao","etica"], ordem: 26 },
  { tmdb_id: 424, tipo: "movie", categorias: ["Direitos Humanos", "Holocausto"], habilidades: ["etica","lideranca"], ordem: 27 },
  { tmdb_id: 15057, tipo: "movie", categorias: ["Júri", "Processo Penal"], habilidades: ["argumentacao","estrategia"], ordem: 28 },
  { tmdb_id: 6205, tipo: "movie", categorias: ["Processo Penal"], habilidades: ["investigacao"], ordem: 29 },
  { tmdb_id: 361475, tipo: "movie", categorias: ["Direitos Civis", "História"], habilidades: ["argumentacao","oratoria"], ordem: 30 },

  // Séries (existentes)
  { tmdb_id: 60059, tipo: "tv", categorias: ["Advocacia", "Direito Penal"], habilidades: ["persuasao","estrategia"], destaque: true, ordem: 40 },
  { tmdb_id: 37680, tipo: "tv", categorias: ["Advocacia", "Direito Corporativo"], habilidades: ["negociacao","persuasao","lideranca"], destaque: true, ordem: 41 },
  { tmdb_id: 62688, tipo: "tv", categorias: ["Processo Penal", "Advocacia"], habilidades: ["argumentacao","estrategia"], ordem: 42 },
  { tmdb_id: 1668, tipo: "tv", categorias: ["Advocacia", "Direito Político"], habilidades: ["lideranca","estrategia"], ordem: 43 },
  { tmdb_id: 68793, tipo: "tv", categorias: ["Advocacia", "Direitos Civis"], habilidades: ["argumentacao","lideranca"], ordem: 44 },
  { tmdb_id: 2687, tipo: "tv", categorias: ["Advocacia"], habilidades: ["oratoria","argumentacao"], ordem: 45 },
  { tmdb_id: 2734, tipo: "tv", categorias: ["Direito Penal", "Processo Penal"], habilidades: ["investigacao"], ordem: 46 },
  { tmdb_id: 3897, tipo: "tv", categorias: ["Advocacia", "Direito Corporativo"], habilidades: ["estrategia","negociacao"], ordem: 47 },
  { tmdb_id: 91363, tipo: "tv", categorias: ["Advocacia", "Investigação"], habilidades: ["investigacao","argumentacao"], ordem: 48 },
  { tmdb_id: 113988, tipo: "tv", categorias: ["Advocacia", "Direito Penal"], habilidades: ["estrategia","argumentacao"], ordem: 49 },
  { tmdb_id: 66020, tipo: "tv", categorias: ["Processo Penal", "Júri"], habilidades: ["investigacao","resiliencia"], ordem: 50 },
  { tmdb_id: 84958, tipo: "tv", categorias: ["Direitos Civis", "Erro Judiciário"], habilidades: ["etica","resiliencia"], ordem: 51 },
  { tmdb_id: 84773, tipo: "tv", categorias: ["Processo Penal", "Vítimas"], habilidades: ["investigacao","resiliencia"], ordem: 52 },
  { tmdb_id: 63639, tipo: "tv", categorias: ["Júri", "Processo Penal"], habilidades: ["argumentacao","estrategia"], ordem: 53 },
  { tmdb_id: 4694, tipo: "tv", categorias: ["Advocacia", "Processo Penal"], habilidades: ["argumentacao","etica"], ordem: 54 },

  // Documentários (existentes)
  { tmdb_id: 63838, tipo: "tv", categorias: ["Documentário", "Erro Judiciário"], habilidades: ["investigacao","etica"], destaque: true, ordem: 60 },
  { tmdb_id: 415842, tipo: "movie", categorias: ["Documentário", "Direitos Civis", "13ª Emenda"], habilidades: ["argumentacao","etica"], destaque: true, ordem: 61 },
  { tmdb_id: 154791, tipo: "tv", categorias: ["Documentário", "Processo Penal"], habilidades: ["investigacao"], ordem: 62 },
  { tmdb_id: 70841, tipo: "tv", categorias: ["Documentário", "Abuso Sexual", "Igreja"], habilidades: ["investigacao","etica"], ordem: 63 },
  { tmdb_id: 82134, tipo: "tv", categorias: ["Documentário", "Erro Judiciário"], habilidades: ["investigacao","etica"], ordem: 64 },
  { tmdb_id: 87399, tipo: "tv", categorias: ["Documentário", "Confissão", "Processo Penal"], habilidades: ["investigacao"], ordem: 65 },

  // ============ EXPANSÃO POR HABILIDADES (+70 obras) ============

  // Liderança
  { tmdb_id: 14181, tipo: "movie", categorias: ["Direitos Civis"], habilidades: ["lideranca","resiliencia"], ordem: 100 }, // Invictus
  { tmdb_id: 72976, tipo: "movie", categorias: ["Direito Político", "Direitos Civis"], habilidades: ["lideranca","persuasao","estrategia"], ordem: 101 }, // Lincoln (2012)
  { tmdb_id: 98,    tipo: "movie", categorias: [], habilidades: ["lideranca","resiliencia"], ordem: 102 }, // Gladiator
  { tmdb_id: 197,   tipo: "movie", categorias: [], habilidades: ["lideranca","oratoria","resiliencia"], ordem: 103 }, // Braveheart
  { tmdb_id: 8967,  tipo: "movie", categorias: [], habilidades: ["lideranca","resiliencia"], ordem: 104 }, // Coach Carter
  { tmdb_id: 60308, tipo: "movie", categorias: ["Direito Corporativo"], habilidades: ["lideranca","estrategia"], ordem: 105 }, // Moneyball
  { tmdb_id: 359940,tipo: "movie", categorias: ["Direito Corporativo"], habilidades: ["lideranca","persuasao","negociacao"], ordem: 106 }, // The Founder
  { tmdb_id: 111817,tipo: "movie", categorias: ["Direito Corporativo"], habilidades: ["lideranca","estrategia"], ordem: 107 }, // Steve Jobs
  { tmdb_id: 381284,tipo: "movie", categorias: ["Direitos Civis"], habilidades: ["lideranca","resiliencia"], ordem: 108 }, // Hidden Figures

  // Persuasão
  { tmdb_id: 106646,tipo: "movie", categorias: ["Direito Financeiro", "Fraude"], habilidades: ["persuasao","oratoria"], ordem: 110 }, // The Wolf of Wall Street
  { tmdb_id: 640,   tipo: "movie", categorias: ["Fraude"], habilidades: ["persuasao","estrategia"], ordem: 111 }, // Catch Me If You Can
  { tmdb_id: 8065,  tipo: "movie", categorias: ["Ética"], habilidades: ["persuasao","argumentacao","oratoria"], destaque: true, ordem: 112 }, // Thank You for Smoking
  { tmdb_id: 10589, tipo: "movie", categorias: ["Direito Corporativo"], habilidades: ["persuasao","oratoria"], ordem: 113 }, // Glengarry Glen Ross
  { tmdb_id: 318846,tipo: "movie", categorias: ["Direito Financeiro"], habilidades: ["persuasao","investigacao"], ordem: 114 }, // The Big Short
  { tmdb_id: 168672,tipo: "movie", categorias: ["Fraude"], habilidades: ["persuasao","estrategia"], ordem: 115 }, // American Hustle
  { tmdb_id: 429351,tipo: "movie", categorias: ["Direito Político"], habilidades: ["persuasao","estrategia"], ordem: 116 }, // Vice (2018)

  // Oratória & Dicção
  { tmdb_id: 45269, tipo: "movie", categorias: [], habilidades: ["oratoria","resiliencia"], destaque: true, ordem: 120 }, // The King's Speech
  { tmdb_id: 207,   tipo: "movie", categorias: [], habilidades: ["oratoria","lideranca"], destaque: true, ordem: 121 }, // Dead Poets Society
  { tmdb_id: 2603,  tipo: "movie", categorias: ["Educação"], habilidades: ["oratoria","lideranca"], ordem: 122 }, // Freedom Writers
  { tmdb_id: 8624,  tipo: "movie", categorias: [], habilidades: ["oratoria","argumentacao"], ordem: 123 }, // The Great Debaters
  { tmdb_id: 2118,  tipo: "movie", categorias: ["Direitos Civis"], habilidades: ["oratoria","lideranca"], ordem: 124 }, // Malcolm X
  { tmdb_id: 10310, tipo: "movie", categorias: ["Direitos Civis"], habilidades: ["oratoria","lideranca","persuasao"], ordem: 125 }, // Milk
  { tmdb_id: 242582,tipo: "movie", categorias: ["Direitos Civis"], habilidades: ["oratoria","lideranca","resiliencia"], ordem: 126 }, // Selma

  // Negociação
  { tmdb_id: 68734, tipo: "movie", categorias: ["Direito Internacional"], habilidades: ["negociacao","estrategia"], ordem: 130 }, // Argo
  { tmdb_id: 612,   tipo: "movie", categorias: ["Direito Internacional"], habilidades: ["negociacao","estrategia","etica"], ordem: 131 }, // Munich
  { tmdb_id: 9820,  tipo: "movie", categorias: ["Processo Penal"], habilidades: ["negociacao","persuasao"], ordem: 132 }, // The Negotiator
  { tmdb_id: 4970,  tipo: "movie", categorias: ["Direito Financeiro"], habilidades: ["negociacao","persuasao","etica"], ordem: 133 }, // Wall Street
  { tmdb_id: 62764, tipo: "movie", categorias: ["Direito Financeiro"], habilidades: ["negociacao","estrategia"], ordem: 134 }, // Wall Street: Money Never Sleeps
  { tmdb_id: 60304, tipo: "movie", categorias: ["Direito Financeiro"], habilidades: ["negociacao","etica","estrategia"], ordem: 135 }, // Margin Call

  // Argumentação
  { tmdb_id: 11525, tipo: "movie", categorias: ["Advocacia", "Processo Penal"], habilidades: ["argumentacao","oratoria"], destaque: true, ordem: 140 }, // My Cousin Vinny
  { tmdb_id: 9312,  tipo: "movie", categorias: ["Processo Penal"], habilidades: ["argumentacao","estrategia"], ordem: 141 }, // Primal Fear
  { tmdb_id: 1813,  tipo: "movie", categorias: ["Advocacia", "Ética"], habilidades: ["argumentacao","etica"], ordem: 142 }, // The Devil's Advocate
  { tmdb_id: 12920, tipo: "movie", categorias: ["Direito Político"], habilidades: ["argumentacao","persuasao","estrategia"], ordem: 143 }, // Frost/Nixon
  { tmdb_id: 4478,  tipo: "movie", categorias: ["Liberdade de Expressão"], habilidades: ["argumentacao","oratoria"], ordem: 144 }, // The People vs. Larry Flynt

  // Estratégia
  { tmdb_id: 238,   tipo: "movie", categorias: [], habilidades: ["estrategia","lideranca"], ordem: 150 }, // The Godfather
  { tmdb_id: 240,   tipo: "movie", categorias: [], habilidades: ["estrategia","lideranca"], ordem: 151 }, // The Godfather Part II
  { tmdb_id: 27205, tipo: "movie", categorias: [], habilidades: ["estrategia"], ordem: 152 }, // Inception
  { tmdb_id: 155,   tipo: "movie", categorias: [], habilidades: ["estrategia","lideranca","etica"], ordem: 153 }, // The Dark Knight
  { tmdb_id: 550,   tipo: "movie", categorias: [], habilidades: ["estrategia","persuasao"], ordem: 154 }, // Fight Club
  { tmdb_id: 37799, tipo: "movie", categorias: ["Direito Corporativo"], habilidades: ["estrategia","negociacao"], ordem: 155 }, // The Social Network
  { tmdb_id: 448879,tipo: "movie", categorias: ["Direito Penal"], habilidades: ["estrategia","resiliencia"], ordem: 156 }, // Molly's Game
  { tmdb_id: 359724,tipo: "movie", categorias: ["Direito Corporativo"], habilidades: ["estrategia","lideranca"], ordem: 157 }, // Ford v Ferrari
  { tmdb_id: 273481,tipo: "movie", categorias: ["Direito Internacional"], habilidades: ["estrategia","etica"], ordem: 158 }, // Sicario
  { tmdb_id: 438631,tipo: "movie", categorias: [], habilidades: ["estrategia","lideranca"], ordem: 159 }, // Dune

  // Ética
  { tmdb_id: 314365,tipo: "movie", categorias: ["Investigação"], habilidades: ["etica","investigacao"], destaque: true, ordem: 160 }, // Spotlight
  { tmdb_id: 244786,tipo: "movie", categorias: [], habilidades: ["etica","resiliencia"], ordem: 161 }, // Whiplash
  { tmdb_id: 302156,tipo: "movie", categorias: ["Whistleblower"], habilidades: ["etica","investigacao"], ordem: 162 }, // Snowden
  { tmdb_id: 12657, tipo: "movie", categorias: ["Direito Sanitário"], habilidades: ["etica","estrategia"], ordem: 163 }, // Contagion
  { tmdb_id: 152532,tipo: "movie", categorias: ["Direito Sanitário", "Direitos Humanos"], habilidades: ["etica","resiliencia"], ordem: 164 }, // Dallas Buyers Club
  { tmdb_id: 39451, tipo: "movie", categorias: ["Direito Político"], habilidades: ["etica","investigacao"], ordem: 165 }, // The Ghost Writer

  // Resiliência
  { tmdb_id: 278,   tipo: "movie", categorias: ["Direito Penal", "Erro Judiciário"], habilidades: ["resiliencia","escrita"], destaque: true, ordem: 170 }, // The Shawshank Redemption
  { tmdb_id: 1366,  tipo: "movie", categorias: [], habilidades: ["resiliencia","lideranca"], ordem: 171 }, // Rocky
  { tmdb_id: 1402,  tipo: "movie", categorias: [], habilidades: ["resiliencia","persuasao"], ordem: 172 }, // The Pursuit of Happyness
  { tmdb_id: 44115, tipo: "movie", categorias: [], habilidades: ["resiliencia"], ordem: 173 }, // 127 Hours
  { tmdb_id: 8358,  tipo: "movie", categorias: [], habilidades: ["resiliencia"], ordem: 174 }, // Cast Away
  { tmdb_id: 286217,tipo: "movie", categorias: [], habilidades: ["resiliencia","estrategia"], ordem: 175 }, // The Martian
  { tmdb_id: 122906,tipo: "movie", categorias: [], habilidades: ["resiliencia","lideranca"], ordem: 176 }, // Rush (2013)
  { tmdb_id: 3390,  tipo: "movie", categorias: ["Direitos Humanos", "Direito Internacional"], habilidades: ["resiliencia","lideranca","etica"], ordem: 177 }, // Hotel Rwanda
  { tmdb_id: 1372,  tipo: "movie", categorias: ["Direito Internacional"], habilidades: ["resiliencia","etica"], ordem: 178 }, // Blood Diamond

  // Investigação
  { tmdb_id: 807,   tipo: "movie", categorias: ["Direito Penal"], habilidades: ["investigacao","estrategia"], ordem: 180 }, // Se7en
  { tmdb_id: 1949,  tipo: "movie", categorias: ["Direito Penal"], habilidades: ["investigacao"], ordem: 181 }, // Zodiac
  { tmdb_id: 146233,tipo: "movie", categorias: ["Processo Penal"], habilidades: ["investigacao","etica"], ordem: 182 }, // Prisoners
  { tmdb_id: 274,   tipo: "movie", categorias: ["Direito Penal"], habilidades: ["investigacao","estrategia"], ordem: 183 }, // The Silence of the Lambs
  { tmdb_id: 891,   tipo: "movie", categorias: ["Direito Político", "Liberdade de Imprensa"], habilidades: ["investigacao","escrita","etica"], ordem: 184 }, // All the President's Men
  { tmdb_id: 346648,tipo: "movie", categorias: ["Liberdade de Imprensa"], habilidades: ["investigacao","etica","lideranca"], ordem: 185 }, // The Post
  { tmdb_id: 829,   tipo: "movie", categorias: [], habilidades: ["investigacao"], ordem: 186 }, // Chinatown

  // Escrita e outros pilares complementares
  { tmdb_id: 489,   tipo: "movie", categorias: [], habilidades: ["escrita","resiliencia","argumentacao"], ordem: 190 }, // Good Will Hunting
  { tmdb_id: 453,   tipo: "movie", categorias: [], habilidades: ["escrita","resiliencia"], ordem: 191 }, // A Beautiful Mind
  { tmdb_id: 820,   tipo: "movie", categorias: ["Direito Político"], habilidades: ["investigacao","argumentacao","oratoria"], ordem: 192 }, // JFK
];

interface TMDBObra {
  tmdb_id: number;
  tipo: "movie" | "tv";
  titulo: string;
  titulo_original: string | null;
  sinopse: string | null;
  ano: number | null;
  nota: number | null;
  duracao_min: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_youtube_id: string | null;
  generos: string[];
  categorias_juridicas: string[];
  habilidades: string[];
  elenco: any[];
  providers: any;
  homepage: string | null;
  destaque: boolean;
  ordem: number;
}

async function fetchObra(
  tmdbToken: string,
  tmdb_id: number,
  tipo: "movie" | "tv",
): Promise<any | null> {
  const url = `https://api.themoviedb.org/3/${tipo}/${tmdb_id}?language=pt-BR&append_to_response=videos,credits,watch/providers`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${tmdbToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    console.warn(`TMDB ${tipo}/${tmdb_id} => HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

function mapObra(entrada: Entrada, data: any): TMDBObra {
  const isMovie = entrada.tipo === "movie";
  const titulo = isMovie ? data.title : data.name;
  const titulo_original = isMovie ? data.original_title : data.original_name;
  const dateStr = isMovie ? data.release_date : data.first_air_date;
  const ano = dateStr ? parseInt(dateStr.slice(0, 4), 10) : null;

  const trailer = (data.videos?.results ?? []).find(
    (v: any) =>
      v.site === "YouTube" &&
      (v.type === "Trailer" || v.type === "Teaser"),
  );

  const elenco = (data.credits?.cast ?? []).slice(0, 8).map((c: any) => ({
    nome: c.name,
    personagem: c.character,
    foto: c.profile_path
      ? `https://image.tmdb.org/t/p/w185${c.profile_path}`
      : null,
  }));

  const providersBR = data["watch/providers"]?.results?.BR ?? {};
  const buildProviders = (arr: any[] | undefined) =>
    (arr ?? []).map((p) => ({
      id: p.provider_id,
      nome: p.provider_name,
      logo: p.logo_path
        ? `https://image.tmdb.org/t/p/w92${p.logo_path}`
        : null,
    }));

  const providers = {
    link: providersBR.link ?? null,
    flatrate: buildProviders(providersBR.flatrate),
    rent: buildProviders(providersBR.rent),
    buy: buildProviders(providersBR.buy),
    free: buildProviders(providersBR.free),
    ads: buildProviders(providersBR.ads),
  };

  return {
    tmdb_id: entrada.tmdb_id,
    tipo: entrada.tipo,
    titulo: titulo ?? titulo_original ?? "Sem título",
    titulo_original: titulo_original ?? null,
    sinopse: data.overview || null,
    ano,
    nota: data.vote_average ? Number(data.vote_average.toFixed(1)) : null,
    duracao_min: isMovie
      ? data.runtime ?? null
      : Array.isArray(data.episode_run_time) && data.episode_run_time.length
        ? data.episode_run_time[0]
        : null,
    poster_url: data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : null,
    backdrop_url: data.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
      : null,
    trailer_youtube_id: trailer?.key ?? null,
    generos: (data.genres ?? []).map((g: any) => g.name),
    categorias_juridicas: entrada.categorias,
    habilidades: entrada.habilidades ?? [],
    elenco,
    providers,
    homepage: data.homepage || null,
    destaque: !!entrada.destaque,
    ordem: entrada.ordem ?? 999,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const tmdbToken = Deno.env.get("TMDB_API_KEY");
    if (!tmdbToken) {
      return new Response(
        JSON.stringify({ error: "TMDB_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Aceita { only_new: true } para sincronizar apenas obras ainda ausentes
    let onlyNew = false;
    try {
      const body = await req.json();
      onlyNew = !!body?.only_new;
    } catch { /* corpo vazio ok */ }

    let alvos: Entrada[] = CURADORIA;
    if (onlyNew) {
      const { data: existentes } = await supabase
        .from("tematica_juridica_obras")
        .select("tmdb_id,tipo");
      const chave = new Set((existentes ?? []).map((r: any) => `${r.tipo}:${r.tmdb_id}`));
      alvos = CURADORIA.filter((e) => !chave.has(`${e.tipo}:${e.tmdb_id}`));
    }

    const resultados: { ok: number; falhas: Array<{ id: number; tipo: string }>; total: number } = {
      ok: 0,
      falhas: [],
      total: alvos.length,
    };

    for (const entrada of alvos) {
      const data = await fetchObra(tmdbToken, entrada.tmdb_id, entrada.tipo);
      if (!data) {
        resultados.falhas.push({ id: entrada.tmdb_id, tipo: entrada.tipo });
        continue;
      }
      const obra = mapObra(entrada, data);
      // Se não veio poster, desativa a obra (não faz sentido exibir card sem capa)
      const registro = { ...obra, ativo: !!obra.poster_url };
      const { error } = await supabase
        .from("tematica_juridica_obras")
        .upsert(registro, { onConflict: "tmdb_id,tipo" });
      if (error) {
        console.error("upsert error", entrada.tmdb_id, error.message);
        resultados.falhas.push({ id: entrada.tmdb_id, tipo: entrada.tipo });
      } else {
        resultados.ok++;
      }
      // gentle rate limit
      await new Promise((r) => setTimeout(r, 80));
    }

    return new Response(JSON.stringify(resultados), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("tmdb-sync error", e);
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
