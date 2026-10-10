const fs = require('fs');
const file = 'src/pages/CategoriaLegislacao.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove searchContent
content = content.replace(/const searchContent = \([\s\S]*?\}\)\(\)\}[\s\S]*?\{.*?Search bar agora fica dentro do hero panel.*?\}/g, '{/* Search removed */}');

// 2. Remove Sticky floating audio search
content = content.replace(/\{.*?Sticky floating audio search.*?\}(?:\s*<AnimatePresence>[\s\S]*?<\/AnimatePresence>\s*)?(?:\{.*?Lista entra depois de search\+abas, com fade curto.*?\})/g, '{/* Sticky search removed */}\n          {/* Lista entra depois de search+abas, com fade curto */}');

// 3. Insert Cabecalho Compacto with 3 buttons BEFORE HistoricoAtualizacaoCarousel
const cabecalhoCompacto = 
            {/* Cabecalho Compacto (Brasão, Nome, Numero) antes dos cards */}
            {!focusMode && (() => {
              const selectedLei = leis.find(l => l.id === selectedLeiId);
              const planaltoUrl = (selectedLei as any)?.url_planalto;
              return (
                <div className="relative z-10 px-0 sm:px-5 w-full pb-2 pt-2">
                  <div className="flex flex-col gap-3 px-4 sm:px-0">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 shrink-0 bg-white/5 rounded-full flex items-center justify-center p-1.5 shadow-inner border border-white/10">
                        <img src={brasaoImg} alt="Brasão da República" className="w-full h-full object-contain drop-shadow-md" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h1 className="text-white font-display font-bold text-[15px] sm:text-base leading-tight truncate drop-shadow-sm">
                            {selectedLeiNome}
                          </h1>
                          {selectedLei && (selectedLei as any).sigla && (
                            <p className="text-white/60 text-[11px] font-semibold tracking-wide uppercase mt-0.5">
                              Lei nº {(selectedLei as any).sigla}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setShowEmentaDialog(true)} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1C1C1E] border border-white/10 hover:bg-[#2C2C2E] rounded-xl py-2 px-3 text-[11px] font-bold tracking-wide uppercase text-white/90 transition-all shadow-sm active:scale-95">
                        <ScrollText className="w-3.5 h-3.5 opacity-80" />
                        Ementa
                      </button>
                      <button onClick={() => setActiveTab('cap')} className="flex-1 flex items-center justify-center gap-1.5 bg-[#1C1C1E] border border-white/10 hover:bg-[#2C2C2E] rounded-xl py-2 px-3 text-[11px] font-bold tracking-wide uppercase text-white/90 transition-all shadow-sm active:scale-95">
                        <BookOpen className="w-3.5 h-3.5 opacity-80" />
                        Capítulos
                      </button>
                      {planaltoUrl && (
                        <a href={planaltoUrl} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 rounded-xl py-2 px-3 text-[11px] font-bold tracking-wide uppercase text-primary transition-all shadow-sm active:scale-95">
                          <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                          Planalto
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* NOVO CARROSSEL DE HISTÓRICO DE ATUALIZAÇÃO */}
;
content = content.replace(/\{.*?NOVO CARROSSEL DE HISTÓRICO DE ATUALIZAÇÃO.*?\}/g, cabecalhoCompacto);

// 4. Replace footerBottomNav with App Menu
const appMenu = 
    // Novo Menu de Rodapé estilo Home
    const footerBottomNav = !focusMode && !isDesktop && !showSearchRecents ? (
      <nav
        aria-label="Navegação principal"
        role="navigation"
        data-bottom-nav
        className={\ixed bottom-0 left-0 right-0 z-[60] lg:hidden border-t border-white/10 bg-[#1C1C1E] backdrop-blur-md rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.6),0_-2px_10px_rgba(0,0,0,0.4)] pb-[var(--sai-bottom,env(safe-area-inset-bottom,0px))] transition-all duration-300 ease-out\}
      >
        <div
          aria-hidden="true"
          className="absolute bottom-full left-0 right-0 h-20 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"
        />
        <div className="relative z-10 grid grid-cols-5 items-end px-1 pt-3.5 pb-3.5 max-w-lg mx-auto">
          {/* Lições */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative text-white/80 hover:text-white"
          >
            <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm" strokeWidth={1.5} />
            <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm">Lições</span>
          </button>
          
          {/* Flashcards */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative text-white/80 hover:text-white"
          >
            <Layers className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm" strokeWidth={1.5} />
            <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm">Flashcards</span>
          </button>

          {/* Pesquisar */}
          <button
            onClick={() => {
              if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
              setStickySearch(!stickySearch);
            }}
            className="relative z-[80] flex flex-col items-center justify-end gap-1.5 -mt-11 min-h-[6.25rem] min-w-[5.75rem] touch-manipulation select-none"
          >
            <span className="relative w-[4.5rem] h-[4.5rem] sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden bg-primary shadow-[0_8px_30px_rgba(0,0,0,0.6)] ring-1 ring-black/5 transition-transform active:scale-95">
              <Search className="relative z-10 w-8 h-8 sm:w-9 sm:h-9 text-primary-foreground drop-shadow-sm" strokeWidth={1.5} />
            </span>
            <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center text-white drop-shadow-sm truncate px-0.5">Pesquisar</span>
          </button>

          {/* Questões */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative text-white/80 hover:text-white"
          >
            <Target className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm" strokeWidth={1.5} />
            <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm">Questões</span>
          </button>

          {/* Sobre */}
          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-end gap-1.5 py-1.5 transition-colors relative text-white/80 hover:text-white"
          >
            <Info className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-sm" strokeWidth={1.5} />
            <span className="font-body text-[11px] sm:text-[12px] leading-tight text-center drop-shadow-sm">Sobre</span>
          </button>
        </div>
      </nav>
    ) : null;
;
content = content.replace(/const footerBottomNav = !focusMode.*?null;/s, appMenu);

// Add missing icon imports
content = content.replace(/LayoutGrid, Maximize2, Minimize2, X as/, "LayoutGrid, Maximize2, Minimize2, GraduationCap, Layers, Target, X as");

fs.writeFileSync(file, content, 'utf8');