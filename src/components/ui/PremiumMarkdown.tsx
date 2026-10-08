import React from 'react';
import ReactMarkdown, { Options } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PremiumBadge, BadgeType } from './PremiumBadge';

interface PremiumMarkdownProps extends Options {
  children: string;
}

const regexBadges = /(\[(?:DICA|ATENÇÃO|ATENCAO|O QUE É|EXEMPLO|EXEMPLO RÁPIDO|JURISPRUDÊNCIA|JURISPRUDENCIA|SÚMULA|SUMULA|IMPORTANTE)\])/gi;

const processChildren = (children: React.ReactNode): React.ReactNode => {
  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      const parts = child.split(regexBadges);
      if (parts.length === 1) return child;
      
      return parts.map((part, i) => {
        const match = part.match(/^\[(DICA|ATENÇÃO|ATENCAO|O QUE É|EXEMPLO|EXEMPLO RÁPIDO|JURISPRUDÊNCIA|JURISPRUDENCIA|SÚMULA|SUMULA|IMPORTANTE)\]$/i);
        if (match) {
          return <PremiumBadge key={i} type={match[1]} />;
        }
        return part;
      });
    }
    if (React.isValidElement(child)) {
      // @ts-ignore
      return React.cloneElement(child, { ...(child.props || {}), children: processChildren(child.props?.children) });
    }
    return child;
  });
};

export const PremiumMarkdown: React.FC<PremiumMarkdownProps> = ({ children, components, ...props }) => {
  return (
    <ReactMarkdown
      {...props}
      remarkPlugins={[remarkGfm, ...(props.remarkPlugins || [])]}
      components={{
        ...components,
        // @ts-ignore
        p: ({ node, children: pChildren, ...pProps }) => <p {...pProps}>{processChildren(pChildren)}</p>,
        // @ts-ignore
        li: ({ node, children: liChildren, ...liProps }) => <li {...liProps}>{processChildren(liChildren)}</li>,
        // @ts-ignore
        span: ({ node, children: spanChildren, ...spanProps }) => <span {...spanProps}>{processChildren(spanChildren)}</span>,
        // @ts-ignore
        div: ({ node, children: divChildren, ...divProps }) => <div {...divProps}>{processChildren(divChildren)}</div>,
        // @ts-ignore
        h1: ({ node, children: hChildren, ...hProps }) => <h1 className="font-display tracking-[0.25em] uppercase text-white/95" {...hProps}>{processChildren(hChildren)}</h1>,
        // @ts-ignore
        h2: ({ node, children: hChildren, ...hProps }) => <h2 className="font-display tracking-[0.2em] uppercase text-white/90" {...hProps}>{processChildren(hChildren)}</h2>,
        // @ts-ignore
        h3: ({ node, children: hChildren, ...hProps }) => <h3 className="font-display tracking-[0.15em] uppercase text-white/85" {...hProps}>{processChildren(hChildren)}</h3>,
        // @ts-ignore
        h4: ({ node, children: hChildren, ...hProps }) => <h4 className="font-display tracking-widest uppercase text-white/80" {...hProps}>{processChildren(hChildren)}</h4>,
        // @ts-ignore
        strong: ({ node, children: sChildren, ...sProps }) => <strong {...sProps}>{processChildren(sChildren)}</strong>,
        // @ts-ignore
        em: ({ node, children: eChildren, ...eProps }) => <em {...eProps}>{processChildren(eChildren)}</em>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
