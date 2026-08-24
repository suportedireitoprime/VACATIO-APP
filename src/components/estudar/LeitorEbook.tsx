import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, List } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface ChapterPage {
  source_page: number;
  markdown: string;
}

interface Chapter {
  title: string;
  start_source_page: number;
  end_source_page: number;
  pages: ChapterPage[];
}

interface EstruturaLeitura {
  version: number;
  title: string;
  content_start_page?: number;
  skip_pages?: number[];
  chapters: Chapter[];
}

interface LivroData {
  id: string;
  titulo: string;
  total_paginas: number;
  ultima_pagina: number;
  conteudo: { pagina: number; markdown: string }[];
  estrutura_leitura?: EstruturaLeitura | null;
}

interface LeitorEbookProps {
  livro: LivroData;
  onBack: () => void;
  onUpdateBookmark: (pagina: number) => void;
}

interface TocItem {
  title: string;
  level: number;
  pageIndex: number;
}

interface DisplayPage {
  type: 'chapter-cover' | 'content';
  chapterTitle?: string;
  chapterSubtitle?: string;
  markdown?: string;
  sourcePage?: number;
}

const FONT_SIZES = [14, 16, 18, 20, 22];

/** Ensure markdown tables have separator rows so ReactMarkdown renders them as <table> */
function fixMarkdownTables(md: string): string {
  if (!md || !md.includes('|')) return md;
  const lines = md.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    result.push(line);

    // Check if this is a table header row (starts and ends with |)
    if (/^\|.+\|$/.test(trimmed)) {
      const nextLine = (lines[i + 1] ?? '').trim();
      // If next line is also a table row but NOT a separator, inject one
      if (/^\|.+\|$/.test(nextLine) && !/^\|[\s\-:]+\|$/.test(nextLine)) {
        // Check previous line isn't already a table row (only add after first/header row)
        const prevTrimmed = (result[result.length - 2] ?? '').trim();
        if (!/^\|.+\|$/.test(prevTrimmed)) {
          const cols = trimmed.split('|').filter(Boolean).length;
          result.push('|' + Array(cols).fill(' --- ').join('|') + '|');
        }
      }
    }
  }

  return result.join('\n');
}

export default function LeitorEbook({ livro, onBack, onUpdateBookmark }: LeitorEbookProps) {
  const [currentPage, setCurrentPage] = useState(0); // will be set after displayPages are built
  const [fontSize, setFontSize] = useState(2);
  const [direction, setDirection] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [initialPageSet, setInitialPageSet] = useState(false);
  const bookmarkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const pages = livro.conteudo || [];
  const estrutura = livro.estrutura_leitura;

  // ── Build display pages from estrutura_leitura or fallback ──
  const { displayPages, toc } = useMemo(() => {
    const dp: DisplayPage[] = [];
    const tocItems: TocItem[] = [];

    if (estrutura && estrutura.chapters && estrutura.chapters.length > 0) {
      // ── V2: Server-structured chapters ──
      for (const chapter of estrutura.chapters) {
        // Chapter cover page
        dp.push({
          type: 'chapter-cover',
          chapterTitle: chapter.title,
          sourcePage: chapter.start_source_page,
        });
        tocItems.push({ title: chapter.title, level: 1, pageIndex: dp.length - 1 });

        // Content pages for this chapter (skip empty/cleared pages)
        if (chapter.pages && chapter.pages.length > 0) {
          for (const p of chapter.pages) {
            if (p.markdown && p.markdown.trim().length > 0) {
              dp.push({ type: 'content', markdown: p.markdown, sourcePage: p.source_page });
            }
          }
        }
      }
    } else {
      // ── Fallback: raw content without chapter detection ──
      pages.forEach((page, i) => {
        dp.push({ type: 'content', markdown: page.markdown, sourcePage: i });
      });
    }

    if (dp.length === 0 && pages.length > 0) {
      pages.forEach((p, i) => dp.push({ type: 'content', markdown: p.markdown, sourcePage: i }));
    }

    return { displayPages: dp, toc: tocItems };
  }, [pages, estrutura]);

  // Set initial page: bookmark > content_start_page > 0
  useEffect(() => {
    if (initialPageSet || displayPages.length === 0) return;
    setInitialPageSet(true);

    // If user has a saved bookmark, use it
    if (livro.ultima_pagina && livro.ultima_pagina > 0) {
      setCurrentPage(Math.min(livro.ultima_pagina, displayPages.length - 1));
      return;
    }

    // First time reading: jump to content_start_page
    const contentStart = estrutura?.content_start_page;
    if (contentStart && contentStart > 1) {
      const targetIdx = displayPages.findIndex(
        dp => dp.sourcePage !== undefined && dp.sourcePage >= contentStart
      );
      if (targetIdx > 0) {
        setCurrentPage(targetIdx);
        return;
      }
    }
  }, [displayPages, initialPageSet, livro.ultima_pagina, estrutura]);

  const totalPages = displayPages.length;

  const saveBookmark = useCallback(
    (page: number) => {
      if (bookmarkTimer.current) clearTimeout(bookmarkTimer.current);
      bookmarkTimer.current = setTimeout(() => onUpdateBookmark(page), 1500);
    },
    [onUpdateBookmark]
  );

  const goToPage = useCallback(
    (page: number) => {
      if (page < 0 || page >= totalPages) return;
      setDirection(page > currentPage ? 1 : -1);
      setCurrentPage(page);
      saveBookmark(page);
      if (contentRef.current) contentRef.current.scrollTop = 0;
    },
    [currentPage, totalPages, saveBookmark]
  );

  const nextPage = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);
  const prevPage = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextPage(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage(); }
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextPage, prevPage, onBack]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < -60) nextPage();
    else if (info.offset.x > 60) prevPage();
  };

  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  const currentDisplayPage = displayPages[currentPage];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  };

  const markdownComponents = {
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-bold text-foreground mt-8 mb-4 pb-3 border-b-2 border-primary/30 leading-tight">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-bold text-primary mt-7 mb-3 leading-tight">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-lg font-semibold text-foreground mt-5 mb-2 leading-tight">{children}</h3>
    ),
    p: ({ children }: any) => {
      const text = typeof children === 'string' ? children : 
        Array.isArray(children) ? children.filter(c => typeof c === 'string').join('') : '';
      const isAllCaps = text.length >= 3 && text === text.toUpperCase() && /[A-ZÀ-Ú]{3,}/.test(text);
      // Only justify longer paragraphs (real body text), not short lines/titles
      const isShort = text.length < 80;
      const useJustify = !isAllCaps && !isShort;
      return (
        <p className={`text-foreground/90 mb-4 leading-relaxed ${isAllCaps ? 'font-bold text-foreground' : ''} ${useJustify ? 'text-justify' : 'text-left'}`}
           style={useJustify ? { hyphens: 'auto', WebkitHyphens: 'auto', wordBreak: 'break-word' } : undefined}
           lang="pt-BR">
          {children}
        </p>
      );
    },
    strong: ({ children }: any) => (
      <strong className="text-primary font-bold">{children}</strong>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary/40 bg-primary/5 pl-4 py-2 my-4 rounded-r-lg text-foreground/80 italic">{children}</blockquote>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-outside ml-5 mb-4 space-y-1.5 text-foreground/90">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside ml-5 mb-4 space-y-1.5 text-foreground/90">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed pl-1">{children}</li>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-border">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-muted/50 font-semibold">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="px-3 py-2 text-left border-b border-border text-foreground">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="px-3 py-2 border-b border-border/50 text-foreground/90">{children}</td>
    ),
    img: ({ src, alt }: any) => (
      <img src={src} alt={alt || ''} className="rounded-lg max-w-full h-auto my-4 mx-auto block shadow-md" loading="lazy" />
    ),
    code: ({ children, className }: any) => {
      const isBlock = className?.includes('language-');
      return isBlock ? (
        <pre className="bg-muted/60 rounded-lg p-4 my-4 overflow-x-auto text-sm"><code className="text-foreground/90">{children}</code></pre>
      ) : (
        <code className="bg-muted/50 text-primary px-1.5 py-0.5 rounded text-sm">{children}</code>
      );
    },
    hr: () => <hr className="my-6 border-border/50" />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header - minimal */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/90 backdrop-blur-sm shrink-0">
        <button onClick={onBack} className="flex items-center justify-center w-10 h-10 rounded-xl bg-foreground/90 hover:bg-foreground text-background transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{livro.titulo}</p>
          {(() => {
            // Find current chapter by looking backwards from currentPage for the nearest chapter-cover
            let chapterName = '';
            for (let i = currentPage; i >= 0; i--) {
              if (displayPages[i]?.type === 'chapter-cover') {
                chapterName = displayPages[i].chapterTitle || '';
                break;
              }
            }
            return chapterName ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{chapterName}</p>
            ) : null;
          })()}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={direction} mode="wait">
          <motion.div
            key={currentPage}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'tween', duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            ref={contentRef}
            className="absolute inset-0 overflow-y-auto"
          >
            {currentDisplayPage?.type === 'chapter-cover' ? (
              <div className="flex flex-col items-center justify-center min-h-full px-8 py-12 text-center relative overflow-hidden">
                {/* Radial glow background */}
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
                  }}
                />

                {/* Decorative corner accents */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-primary rounded-tl-lg"
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-primary rounded-br-lg"
                />

                {/* Top ornament line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
                  className="w-20 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full mb-10"
                />

                {/* Chapter number badge */}
                {(() => {
                  const match = currentDisplayPage.chapterTitle?.match(/^(\d+)\.\s*/);
                  const chapterNum = match ? match[1] : null;
                  const titleText = match ? currentDisplayPage.chapterTitle!.replace(match[0], '') : currentDisplayPage.chapterTitle;
                  return (
                    <>
                      {chapterNum && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.15, duration: 0.4, type: 'spring', stiffness: 200 }}
                          className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
                        >
                          <span className="text-xl font-bold text-primary">{chapterNum}</span>
                        </motion.div>
                      )}
                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4 max-w-lg"
                      >
                        {titleText}
                      </motion.h1>
                    </>
                  );
                })()}

                {currentDisplayPage.chapterSubtitle && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45, duration: 0.4 }}
                    className="text-lg text-muted-foreground font-medium max-w-md"
                  >
                    {currentDisplayPage.chapterSubtitle}
                  </motion.p>
                )}

                {/* Bottom ornament */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: 'easeOut' }}
                  className="w-20 h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent rounded-full mt-10"
                />

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.5 }}
                  className="text-xs text-muted-foreground mt-6 flex items-center gap-1.5"
                >
                  Deslize para continuar
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    →
                  </motion.span>
                </motion.p>
              </div>
            ) : (
              <div className="px-5 py-6 sm:px-8 sm:py-8" style={{ fontSize: `${FONT_SIZES[fontSize]}px`, lineHeight: 1.85 }}>
                <div className="max-w-3xl mx-auto">
                  <ReactMarkdown components={markdownComponents}>
                    {fixMarkdownTables(currentDisplayPage?.markdown || '')}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card/95 backdrop-blur-sm shrink-0">
        {/* Progress bar */}
        <div className="h-1 bg-muted/30 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between px-3 py-3.5">
          {/* Left: prev arrow */}
          <button onClick={prevPage} disabled={currentPage === 0} className="p-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary disabled:opacity-20 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Center controls */}
          <div className="flex items-center gap-3">
            {/* TOC button */}
            <Sheet open={tocOpen} onOpenChange={setTocOpen}>
              <SheetTrigger asChild>
                <button className="p-2 rounded-lg bg-muted/60 hover:bg-muted text-foreground transition-colors">
                  <List className="w-4 h-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[350px] p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <SheetTitle className="text-base">Índice</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto h-[calc(100vh-60px)] py-2">
                  {toc.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-4 py-8 text-center">Nenhum capítulo encontrado</p>
                  ) : (
                    toc.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { goToPage(item.pageIndex); setTocOpen(false); }}
                        className={`w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                          currentPage === item.pageIndex ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                        style={{ paddingLeft: `${(item.level - 1) * 16 + 16}px` }}
                      >
                        <span className={`text-sm leading-snug flex-1 ${item.level === 1 ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>
                          {item.title}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Page info */}
            <span className="text-xs font-semibold text-primary tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>

            {/* Font size controls */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => setFontSize(Math.max(0, fontSize - 1))} disabled={fontSize === 0} className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted disabled:opacity-30 transition-colors">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-semibold text-primary w-6 text-center">{FONT_SIZES[fontSize]}</span>
              <button onClick={() => setFontSize(Math.min(FONT_SIZES.length - 1, fontSize + 1))} disabled={fontSize === FONT_SIZES.length - 1} className="p-1.5 rounded-lg bg-muted/60 hover:bg-muted disabled:opacity-30 transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right: next arrow */}
          <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className="p-3 rounded-xl bg-primary/20 hover:bg-primary/30 text-primary disabled:opacity-20 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
