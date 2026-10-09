import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using anon/publishable key if we can't get service_role, wait...

// The edge function `reextrair-lei-planalto` can be invoked using anon key.
if (!url || !key) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(url, key);

const tratados = [
  {
    slug: "cadh",
    nome: "Convenção Americana sobre Direitos Humanos (Pacto de San José da Costa Rica)",
    nome_curto: "CADH",
    planalto_url: "https://www.planalto.gov.br/ccivil_03/decreto/1990-1994/d0678.htm",
    categoria: "tratados-convencoes"
  },
  {
    slug: "estatuto-roma",
    nome: "Estatuto de Roma do Tribunal Penal Internacional",
    nome_curto: "Estatuto de Roma",
    planalto_url: "https://www.planalto.gov.br/ccivil_03/decreto/2002/d4388.htm",
    categoria: "tratados-convencoes"
  },
  {
    slug: "pidcp",
    nome: "Pacto Internacional sobre Direitos Civis e Políticos",
    nome_curto: "PIDCP",
    planalto_url: "https://www.planalto.gov.br/ccivil_03/decreto/1990-1994/d0592.htm",
    categoria: "tratados-convencoes"
  },
  {
    slug: "convencao-viena-tratados",
    nome: "Convenção de Viena sobre o Direito dos Tratados",
    nome_curto: "CVDT",
    planalto_url: "https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2009/decreto/d7030.htm",
    categoria: "tratados-convencoes"
  },
  {
    slug: "convencao-belem-para",
    nome: "Convenção Interamericana para Prevenir, Punir e Erradicar a Violência contra a Mulher (Convenção de Belém do Pará)",
    nome_curto: "Convenção de Belém do Pará",
    planalto_url: "https://www.planalto.gov.br/ccivil_03/decreto/1996/D1973.htm",
    categoria: "tratados-convencoes"
  }
];

async function run() {
  for (const t of tratados) {
    console.log(`Raspando: ${t.nome_curto}...`);
    const res = await supabase.functions.invoke('reextrair-lei-planalto', {
      body: {
        slug: t.slug,
        nome: t.nome,
        nome_curto: t.nome_curto,
        planalto_url: t.planalto_url,
        categoria: t.categoria,
        dry_run: false
      }
    });
    if (res.error) {
      console.error(`Erro em ${t.nome_curto}:`, res.error);
      if (res.error.context) {
        console.error("Contexto:", await res.error.context.text());
      }
    } else if (res.data && res.data.error) {
      console.error(`Erro (interno) em ${t.nome_curto}:`, res.data.error);
    } else {
      console.log(`Sucesso! ${res.data?.linhas_gravadas} artigos extraídos para ${t.nome_curto}`);
    }
  }
}

run();
