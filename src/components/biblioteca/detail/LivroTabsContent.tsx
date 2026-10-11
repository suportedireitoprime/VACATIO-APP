import { Info, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { InfoBlock } from './LivroFichaTecnica';

interface LivroTabsContentProps {
  sobreMarkdown: string;
  temAnaliseTecnica?: boolean;
  anoLancamento?: string | null;
  editora?: string | null;
  curiosidades?: string[] | null;
  analiseDetalhadaTexto?: string | null;
}

export const LivroTabsContent = ({
  sobreMarkdown,
  temAnaliseTecnica = true,
  anoLancamento,
  editora,
  curiosidades,
  analiseDetalhadaTexto,
}: LivroTabsContentProps) => {
  return (
    <Tabs defaultValue="sobre" className="w-full">
      <TabsList className="w-full grid grid-cols-2 bg-secondary/60 h-11 rounded-full p-1">
        <TabsTrigger
          value="sobre"
          className="text-sm gap-1.5 rounded-full data-[state=active]:shadow-sm"
        >
          <Info className="w-4 h-4" />
          Sobre
        </TabsTrigger>
        <TabsTrigger
          value="analise"
          className="text-sm gap-1.5 rounded-full data-[state=active]:shadow-sm"
        >
          <FileText className="w-4 h-4" />
          Análise técnica
        </TabsTrigger>
      </TabsList>

      <TabsContent value="sobre" className="pt-4">
        {sobreMarkdown ? (
          <div className="text-[15px] text-foreground/85 leading-relaxed space-y-3 [&_p]:leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {sobreMarkdown}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-[15px] text-muted-foreground text-center py-6">
            Sinopse ainda não disponível para este livro.
          </p>
        )}
      </TabsContent>

      <TabsContent value="analise" className="pt-4 space-y-4">
        {!temAnaliseTecnica && (
          <p className="text-[15px] text-muted-foreground text-center py-6">
            Análise técnica ainda não disponível para este livro.
          </p>
        )}
        {(anoLancamento || editora) && (
          <div className="grid grid-cols-2 gap-3">
            {anoLancamento && (
              <InfoBlock label="Ano" value={anoLancamento} />
            )}
            {editora && (
              <InfoBlock label="Editora" value={editora} />
            )}
          </div>
        )}

        {curiosidades && curiosidades.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-display font-semibold uppercase tracking-widest text-primary/80">
              Curiosidades
            </h4>
            <ul className="space-y-2">
              {curiosidades.map((c, i) => (
                <li
                  key={i}
                  className="text-[15px] text-foreground/85 leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary before:font-bold"
                >
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analiseDetalhadaTexto && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-2">
              <h4 className="text-xs font-display font-semibold uppercase tracking-widest text-primary/80">
                Análise detalhada
              </h4>
              <div className="text-[15px] text-foreground/85 leading-relaxed space-y-3 [&_p]:leading-relaxed [&_strong]:text-foreground [&_strong]:font-semibold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {analiseDetalhadaTexto}
                </ReactMarkdown>
              </div>
            </div>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
};
