const fs = require('fs');
const path = require('path');

const file = path.join('src', 'components', 'vademecum', 'HomeNoticiasCarousel.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Imports
content = content.replace(
  /import BlogPostSheet from '@\/components\/vademecum\/BlogPostSheet';\s*import ObraDetailSheet, \{ type Obra \} from '@\/components\/tematica\/ObraDetailSheet';\s*import \{ BLOG_POSTS, TEMA_COLORS, type BlogPost \} from '@\/data\/blogPosts';/,
  `import LivroDetailSheet from '@/components/biblioteca/LivroDetailSheet';\nimport { COLECOES, normalizeLivro, type LivroNormalizado } from '@/lib/bibliotecaColecoes';`
);

// 2. FeedItem & CYCLE & cleanup OBRA_PALETTE
content = content.replace(
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

// 3. States & QueueRefs
content = content.replace(
  /const \[obras, setObras\] = useState<Obra\[\]>\(\[\]\);\s*const \[activeIndex, setActiveIndex\] = useState\(0\);\s*const \[selectedNoticia, setSelectedNoticia\] = useState<Noticia \| null>\(null\);\s*const \[selectedPost, setSelectedPost\] = useState<BlogPost \| null>\(null\);\s*const \[selectedObra, setSelectedObra\] = useState<Obra \| null>\(null\);\s*const postsAll = useMemo\(\(\) => \[\.\.\.BLOG_POSTS\], \[\]\);\s*\/\/ Filas persistentes por sessão do carrossel \(mantidas em ref, não causam re-render\)\.\s*const blogQueueRef = useRef<BlogPost\[\]>\(shuffle\(postsAll\)\);\s*const noticiaQueueRef = useRef<Noticia\[\]>\(\[\]\);\s*const usedNoticiaIdsRef = useRef<Set<string>>\(new Set\(\)\);\s*const cycleStepRef = useRef\(0\);\s*const \[feed, setFeed\] = useState<FeedItem\[\]>\(\[\]\);/m,
  `const [livros, setLivros] = useState<LivroNormalizado[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedNoticia, setSelectedNoticia] = useState<Noticia | null>(null);
  const [selectedLivro, setSelectedLivro] = useState<LivroNormalizado | null>(null);

  // Filas persistentes por sessão do carrossel
  const livroQueueRef = useRef<LivroNormalizado[]>([]);
  const noticiaQueueRef = useRef<Noticia[]>([]);
  const usedNoticiaIdsRef = useRef<Set<string>>(new Set());
  const cycleStepRef = useRef(0);

  const [feed, setFeed] = useState<FeedItem[]>([]);

  useEffect(() => {
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
  }, []);`
);

// 4. takeNext function signature & logic
content = content.replace(
  /const takeNext = useCallback\(\(kind: 'blog' \| 'noticia' \| 'obra'\): FeedItem \| null => \{\s*if \(kind === 'blog'\) \{[\s\S]*?return \{ kind: 'blog'.*?\};\s*\}/m,
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

// 5. takeNext dependencies
content = content.replace(/takeNext = useCallback\([\s\S]*?\}, \[noticias, postsAll\]\);/m, function(match) {
  return match.replace(/\[noticias, postsAll\]/, '[noticias, livros]');
});


// 6. onOpenChange
content = content.replace(
  /useEffect\(\(\) => \{\s*onOpenChange\?\.\(\!\!selectedNoticia \|\| \!\!selectedPost \|\| \!\!selectedObra\);\s*\}, \[selectedNoticia, selectedPost, selectedObra, onOpenChange\]\);/m,
  `useEffect(() => {
    onOpenChange?.(!!selectedNoticia || !!selectedLivro);
  }, [selectedNoticia, selectedLivro, onOpenChange]);`
);


// 7. handleOpen
content = content.replace(
  /const handleOpen = \(item: FeedItem\) => \{\s*if \(item\.kind === 'noticia'\) setSelectedNoticia\(item\.data\);\s*else if \(item\.kind === 'blog'\) setSelectedPost\(item\.data\);\s*else setSelectedObra\(item\.data\);\s*\};/m,
  `const handleOpen = (item: FeedItem) => {
    if (item.kind === 'noticia') setSelectedNoticia(item.data);
    else setSelectedLivro(item.data as LivroNormalizado);
  };`
);


// 8. headerTitle / subtitle
content = content.replace(
  /const headerTitle =\s*kind === 'blog' \? 'Blogger Jurídico' : kind === 'obra' \? 'Temática Jurídica' : 'Notícias Jurídicas';\s*const headerSubtitle =\s*kind === 'blog'\s*\? 'artigos, filosofia e curiosidades do Direito'\s*: kind === 'obra'\s*\? 'filmes, séries e documentários para juristas'\s*: 'notícias do mundo jurídico em tempo real';/m,
  `const headerTitle = kind === 'livro' ? 'Recomendação de Livros' : 'Notícias Jurídicas';
  const headerSubtitle = kind === 'livro' ? 'obras fundamentais e leituras sugeridas' : 'notícias do mundo jurídico em tempo real';`
);


// 9. MAP RENDER
const mapStart = content.indexOf('// OBRA — poster vertical à esquerda');
const mapEnd = content.indexOf('return (', mapStart) !== -1 ? content.indexOf('return (', content.indexOf('return (', mapStart) + 8) : -1; // skip obra return, find the second return

content = content.substring(0, mapStart) + `          const isL = item.kind === 'livro';
          const rawImg = isL
            ? (item.data as LivroNormalizado).capa
            : (item.data as Noticia).imagem_url ?? '';
          const img = isL ? cdnImg(rawImg, 320) : newsImg(rawImg, 640);
          const title = isL ? (item.data as LivroNormalizado).titulo : (item.data as Noticia).titulo;
          const meta = isL
            ? \`Livro · \${(item.data as LivroNormalizado).autor || 'Diversos'}\`
            : \`\${formatTime((item.data as Noticia).data_publicacao)} · Migalhas\`;

` + content.substring(content.indexOf('return (', content.indexOf('return (', mapStart) + 8));

// 10. Inner styling
content = content.replace(
  /style=\{isB && c \? \{ background: c\.bg \} : undefined\}/,
  `style={isL ? { backgroundColor: '#111827' } : undefined}`
);

content = content.replace(
  /className=\{`absolute inset-0 w-full h-full object-cover \$\{\s*isB \? 'object-top opacity-90' : 'brightness-110 contrast-105 saturate-110'\s*\}`\}/,
  `className={\`absolute inset-0 w-full h-full object-cover \${
                      isL ? 'opacity-50 scale-105 blur-[6px]' : 'brightness-110 contrast-105 saturate-110'
                    }\`}`
);

content = content.replace(
  /\{isB && c && \([\s\S]*?\}\)/,
  `{isL && img && (
                  <div className="absolute inset-y-2 left-2 w-[72px] md:w-[84px] rounded-md shadow-lg overflow-hidden ring-1 ring-white/10 z-10 bg-neutral-900">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                )}`
);

content = content.replace(
  /<div className="absolute inset-0 flex flex-col justify-end px-4 pb-3 pt-4">/,
  `<div className={\`absolute inset-0 flex flex-col justify-end pb-3 pt-4 z-20 \${isL ? 'pl-[92px] md:pl-[104px] pr-4' : 'px-4'}\`}>`
);


// 11. Sheets
content = content.replace(
  /<NoticiaViewerSheet noticia=\{selectedNoticia\} onClose=\{\(\) => setSelectedNoticia\(null\)\} \/>\s*<BlogPostSheet post=\{selectedPost\} onClose=\{\(\) => setSelectedPost\(null\)\} \/>\s*<ObraDetailSheet obra=\{selectedObra\} open=\{\!\!selectedObra\} onClose=\{\(\) => setSelectedObra\(null\)\} \/>/,
  `<NoticiaViewerSheet noticia={selectedNoticia} onClose={() => setSelectedNoticia(null)} />
      <LivroDetailSheet livro={selectedLivro} open={!!selectedLivro} onClose={() => setSelectedLivro(null)} />`
);


fs.writeFileSync(file, content, 'utf8');
