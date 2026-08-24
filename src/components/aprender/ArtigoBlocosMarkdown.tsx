import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Timeline: [{ano,titulo,desc}] */
function Timeline({ items }: { items: Array<{ ano?: string; titulo?: string; desc?: string }> }) {
  return (
    <div className="my-5 relative pl-5 border-l-2 border-primary/30 space-y-4">
      {items.map((it, i) => (
        <div key={i} className="relative">
          <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-primary/15" />
          {it.ano && <p className="text-[11px] font-bold text-primary tracking-wide">{it.ano}</p>}
          {it.titulo && <p className="text-[14px] font-semibold text-foreground">{it.titulo}</p>}
          {it.desc && <p className="text-[13px] text-muted-foreground leading-relaxed">{it.desc}</p>}
        </div>
      ))}
    </div>
  );
}

function Pyramid({ items }: { items: string[] }) {
  return (
    <div className="my-5 space-y-1.5">
      {items.map((label, i) => {
        const width = 100 - i * (60 / Math.max(items.length, 1));
        return (
          <div key={i} className="flex justify-center">
            <div
              className="px-3 py-2 rounded-lg bg-primary/10 border border-primary/25 text-center"
              style={{ width: `${Math.max(width, 40)}%` }}
            >
              <span className="text-[12px] font-semibold text-foreground">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Flowchart({ items }: { items: string[] }) {
  return (
    <div className="my-5 space-y-1.5">
      {items.map((label, i) => (
        <div key={i}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/60">
            <span className="w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <span className="text-[13px] text-foreground">{label}</span>
          </div>
          {i < items.length - 1 && <div className="mx-auto w-px h-3 bg-border" />}
        </div>
      ))}
    </div>
  );
}

function Comparison({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-5 overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full text-[12.5px]">
        <thead className="bg-muted/60">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="text-left font-semibold text-foreground px-3 py-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border/50">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-muted-foreground align-top">{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CALLOUT_STYLE: Record<string, { label: string; cls: string }> = {
  dica: { label: '💡 Dica', cls: 'border-emerald-500/40 bg-emerald-500/10' },
  atencao: { label: '⚠️ Atenção', cls: 'border-amber-500/40 bg-amber-500/10' },
  exemplo: { label: '📋 Exemplo', cls: 'border-sky-500/40 bg-sky-500/10' },
  jurisprudencia: { label: '⚖️ Jurisprudência', cls: 'border-violet-500/40 bg-violet-500/10' },
  nota: { label: '📝 Nota', cls: 'border-border bg-muted/40' },
  important: { label: '❗ Importante', cls: 'border-rose-500/40 bg-rose-500/10' },
};

function safeParse<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    return null;
  }
}

export default function ArtigoBlocosMarkdown({ content }: { content: string }) {
  return (
    <div className="max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="font-display text-[19px] font-bold text-foreground mt-7 mb-2.5">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display text-[16px] font-semibold text-foreground mt-5 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-[15px] leading-[1.75] text-muted-foreground mb-3.5">{children}</p>
          ),
          strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1.5 mb-3.5 text-[15px] text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1.5 mb-3.5 text-[15px] text-muted-foreground">{children}</ol>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{children}</a>
          ),
          table: ({ children }) => (
            <div className="my-5 overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full text-[12.5px]">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="text-left font-semibold text-foreground px-3 py-2 bg-muted/60">{children}</th>,
          td: ({ children }) => <td className="px-3 py-2 text-muted-foreground border-t border-border/50 align-top">{children}</td>,
          blockquote: ({ children }) => {
            const text = String(
              (Array.isArray(children) ? children : [children])
                .map((c: any) => (typeof c === 'string' ? c : c?.props?.children ?? ''))
                .join(' ')
            );
            const match = text.match(/\[!(\w+)\]/i);
            const kind = match?.[1]?.toLowerCase() ?? 'nota';
            const style = CALLOUT_STYLE[kind] ?? CALLOUT_STYLE.nota;
            return (
              <div className={`my-4 rounded-xl border px-4 py-3 ${style.cls}`}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/80 mb-1">{style.label}</p>
                <div className="text-[14px] leading-relaxed text-muted-foreground [&_p]:mb-1 [&_p:last-child]:mb-0">
                  {children}
                </div>
              </div>
            );
          },
          code: ({ className, children, ...props }: any) => {
            const lang = /language-(\w+)/.exec(className || '')?.[1];
            const raw = String(children ?? '').replace(/\n$/, '');

            if (lang === 'timeline') {
              const data = safeParse<Array<Record<string, string>>>(raw);
              if (Array.isArray(data)) return <Timeline items={data} />;
            }
            if (lang === 'pyramid') {
              const data = safeParse<string[]>(raw);
              if (Array.isArray(data)) return <Pyramid items={data} />;
            }
            if (lang === 'flowchart') {
              const data = safeParse<string[]>(raw);
              if (Array.isArray(data)) return <Flowchart items={data} />;
            }
            if (lang === 'comparison') {
              const data = safeParse<{ headers: string[]; rows: string[][] }>(raw);
              if (data?.headers && data?.rows) return <Comparison headers={data.headers} rows={data.rows} />;
            }
            if (!lang) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted text-[13px] text-foreground" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="my-4 p-3 rounded-xl bg-muted overflow-x-auto text-[12.5px] text-foreground">
                <code>{raw}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
