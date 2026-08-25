const fs = require('fs');
const file = 'src/components/vademecum/HomeNoticiasCarousel.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(
  /import BlogPostSheet from '@\/components\/vademecum\/BlogPostSheet';\s*import ObraDetailSheet, \{ type Obra \} from '@\/components\/tematica\/ObraDetailSheet';\s*import \{ BLOG_POSTS, TEMA_COLORS, type BlogPost \} from '@\/data\/blogPosts';/,
  `import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';\nimport { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';`
);

txt = txt.replace(
  /type FeedItem =[\s\S]*?const CYCLE: Array<'blog' \| 'noticia'> = \[\s*'noticia',\s*'blog',\s*\];/m,
  `type FeedItem =
  | { kind: 'noticia'; id: string; data: Noticia }
  | { kind: 'livro'; id: string; data: LivroNormalizado };

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (sameDay) return \`Hoje · \${hh}:\${mm}\`;
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return \`\${day} \${months[d.getMonth()]} · \${hh}:\${mm}\`;
}

const CYCLE: Array<'livro' | 'noticia'> = [
  'noticia',
  'livro',
];`
);

txt = txt.replace(
  /const \[obras, setObras\] = useState<Obra\[\]>\(\[\]\);\s*const \[activeIndex, setActiveIndex\] = useState\(0\);\s*const \[selectedNoticia, setSelectedNoticia\] = useState<Noticia \| null>\(null\);\s*const \[selectedPost, setSelectedPost\] = useState<BlogPost \| null>\(null\);\s*const \[selectedObra, setSelectedObra\] = useState<Obra \| null>\(null\);\s*const postsAll = useMemo\(\(\) => \[\.\.\.BLOG_POSTS\], \[\]\);\s*\/\/ Filas persistentes por sessão do carrossel \(mantidas em ref, não causam re-render\)\.\s*const blogQueueRef = useRef<BlogPost\[\]>\(shuffle\(postsAll\)\);\s*const noticiaQueueRef = useRef<Noticia\[\]>\(\[\]\);\s*const usedNoticiaIdsRef = useRef<Set<string>>\(new Set\(\)\);\s*const cycleStepRef = useRef\(0\);/m,
  `const [livros, setLivros] = useState<LivroNormalizado[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);
  const [selectedLivro, setSelectedLivro] = useState<LivroNormalizado | null>(null);

  // Filas persistentes por sessão do carrossel
  const livroQueueRef = useRef<LivroNormalizado[]>([]);
  const noticiaQueueRef = useRef<Noticia[]>([]);
  const usedNoticiaIdsRef = useRef<Set<string>>(new Set());
  const cycleStepRef = useRef(0);`
);

txt = txt.replace(
  /useEffect\(\(\) => \{/,
  `useEffect(() => {
    async function loadLivros() {
      const col = COLECOES.find((c) => c.id === 'fora_da_toga') || COLECOES.find((c) => c.id === 'classicos');
      if (!col) return;
      const { data } = await supabase.from(col.table).select(col.select).limit(40);
      if (data) {
        const norm = shuffle(data.map((r) => normalizeLivro(col, r)));
        setLivros(norm);
        livroQueueRef.current = norm;
      }
    }
    loadLivros();
  }, []);

  useEffect(() => {`
);

txt = txt.replace(
  /const takeNext = useCallback\(\(kind: 'blog' \| 'noticia' \| 'obra'\): FeedItem \| null => \{\s*if \(kind === 'blog'\) \{\s*if \(blogQueueRef\.current\.length === 0\) \{\s*blogQueueRef\.current = shuffle\(postsAll\);\s*\}\s*const p = blogQueueRef\.current\.shift\(\);\s*if \(\!p\) return null;\s*return \{ kind: 'blog', id: `b-\$\{p\.id\}-\$\{Date\.now\(\)\}-\$\{Math\.random\(\)\.toString\(36\)\.slice\(2, 6\)\}`, data: p \};\s*\}/m,
  `const takeNext = useCallback((kind: 'livro' | 'noticia'): FeedItem | null => {
    if (kind === 'livro') {
      if (livroQueueRef.current.length === 0) {
        if (livros.length > 0) {
          livroQueueRef.current = shuffle([...livros]);
        } else {
          return null;
        }
      }
      const p = livroQueueRef.current.shift();
      if (!p) return null;
      return { kind: 'livro', id: \`l-\${p.id}-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, data: p };
    }`
);

txt = txt.replace(/\[noticias, postsAll\]/g, '[noticias, livros]');

txt = txt.replace(
  /onOpenChange\?\.\(\!\!selectedNoticia \|\| \!\!selectedPost \|\| \!\!selectedObra\);\s*\}, \[selectedNoticia, selectedPost, selectedObra, onOpenChange\]\);/,
  `onOpenChange?.(!!selectedNoticia || !!selectedLivro);\n  }, [selectedNoticia, selectedLivro, onOpenChange]);`
);

txt = txt.replace(
  /if \(item\.kind === 'noticia'\) setSelectedNoticia\(item\.data\);\s*else if \(item\.kind === 'blog'\) setSelectedPost\(item\.data\);\s*else setSelectedObra\(item\.data\);/,
  `if (item.kind === 'noticia') setSelectedNoticia(item.data);\n    else setSelectedLivro(item.data as LivroNormalizado);`
);

txt = txt.replace(
  /const headerTitle =\s*kind === 'blog' \? 'Blogger Jurídico' : kind === 'obra' \? 'Temática Jurídica' : 'Notícias Jurídicas';\s*const headerSubtitle =\s*kind === 'blog'\s*\? 'artigos, filosofia e curiosidades do Direito'\s*: kind === 'obra'\s*\? 'filmes, séries e documentários para juristas'\s*: 'notícias do mundo jurídico em tempo real';/,
  `const headerTitle = kind === 'livro' ? 'Recomendação de Livros' : 'Notícias Jurídicas';
  const headerSubtitle = kind === 'livro' ? 'obras fundamentais e leituras sugeridas' : 'notícias do mundo jurídico em tempo real';`
);

txt = txt.replace(/if \(item\.kind === 'obra'\) \{[\s\S]*?return \([\s\S]*?\}\s*const isB = item\.kind === 'blog';/m, `const isL = item.kind === 'livro';`);

txt = txt.replace(
  /const c = isB \? TEMA_COLORS\[\(item\.data as BlogPost\)\.tema\] : null;\s*const rawImg = isB\s*\? \(item\.data as BlogPost\)\.imagem_url \?\? ''\s*: \(item\.data as Noticia\)\.imagem_url \?\? '';\s*const img = isB \? cdnImg\(rawImg, 640\) : newsImg\(rawImg, 640\);\s*const title = isB \? \(item\.data as BlogPost\)\.titulo : \(item\.data as Noticia\)\.titulo;\s*const meta = isB\s*\? `\$\{\(item\.data as BlogPost\)\.tempo_leitura_min\} min · \$\{\(item\.data as BlogPost\)\.tema\}`\s*: `\$\{formatTime\(\(item\.data as Noticia\)\.data_publicacao\)\} · Migalhas`;/,
  `const rawImg = isL
            ? (item.data as LivroNormalizado).capa
            : (item.data as Noticia).imagem_url ?? '';
          const img = isL ? cdnImg(rawImg, 320) : newsImg(rawImg, 640);
          const title = isL ? (item.data as LivroNormalizado).titulo : (item.data as Noticia).titulo;
          const meta = isL
            ? \`Livro · \${(item.data as LivroNormalizado).autor || 'Diversos'}\`
            : \`\${formatTime((item.data as Noticia).data_publicacao)} · Migalhas\`;`
);

txt = txt.replace(
  /style=\{isB && c \? \{ background: c\.bg \} : undefined\}/,
  `style={isL ? { backgroundColor: '#111827' } : undefined}`
);

txt = txt.replace(
  /className=\{`absolute inset-0 w-full h-full object-cover \$\{\s*isB \? 'object-top opacity-90' : 'brightness-110 contrast-105 saturate-110'\s*\}`\}/,
  `className={\`absolute inset-0 w-full h-full object-cover \${
                      isL ? 'opacity-30 scale-125 blur-xl' : 'brightness-110 contrast-105 saturate-110'
                    }\`}`
);

txt = txt.replace(
  /\{isB && c && \(\s*<span\s*className="absolute top-2\.5 left-2\.5 text-\[9\.5px\] font-bold px-1\.5 py-0\.5 rounded uppercase tracking-wider"\s*style=\{\{ background: c\.chip, color: c\.chipText \}\}\s*>\s*Blog · \{\(item\.data as BlogPost\)\.tema\}\s*<\/span>\s*\)\}/,
  `{isL && img && (
                  <div className="absolute inset-y-2 left-2 w-[72px] rounded-lg shadow-xl overflow-hidden ring-1 ring-white/10 z-10 bg-neutral-900">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                )}`
);

txt = txt.replace(
  /<div className="absolute inset-0 flex flex-col justify-end px-4 pb-3 pt-4">/,
  `<div className={\`absolute inset-0 flex flex-col justify-end pb-3 pt-4 z-20 \${isL ? 'pl-[92px] pr-4' : 'px-4'}\`}>`
);

txt = txt.replace(
  /<NoticiaViewerSheet noticia=\{selectedNoticia\} onClose=\{\(\) => setSelectedNoticia\(null\)\} \/>\s*<BlogPostSheet post=\{selectedPost\} onClose=\{\(\) => setSelectedPost\(null\)\} \/>\s*<ObraDetailSheet obra=\{selectedObra\} open=\{\!\!selectedObra\} onClose=\{\(\) => setSelectedObra\(null\)\} \/>/,
  `<NoticiaViewerSheet noticia={selectedNoticia} onClose={() => setSelectedNoticia(null)} />
      <LivroDetailSheet livro={selectedLivro} open={!!selectedLivro} onClose={() => setSelectedLivro(null)} />`
);

fs.writeFileSync(file, txt, 'utf8');
