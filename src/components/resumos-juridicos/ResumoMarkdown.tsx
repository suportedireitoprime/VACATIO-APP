import React from 'react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ResumoMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown 
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({node, ...props}) => (
          <div className="w-full overflow-x-auto pb-2 my-6 custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[500px]" {...props} />
          </div>
        ),
        th: ({node, ...props}) => (
          <th className="border border-border/50 px-3 py-2 font-bold bg-muted/30" {...props} />
        ),
        td: ({node, ...props}) => (
          <td className="border border-border/50 px-3 py-2 align-top" {...props} />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
