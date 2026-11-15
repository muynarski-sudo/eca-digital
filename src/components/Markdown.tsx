import { Fragment } from 'react';

/** Renderizador mínimo de Markdown (títulos, listas, negrito, itálico, parágrafos). Sem HTML cru, então é seguro para texto editável. */
function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') ? (
      <strong key={i}>{p.slice(2, -2)}</strong>
    ) : p.startsWith('*') && p.length > 2 ? (
      <em key={i}>{p.slice(1, -1)}</em>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}

export function Markdown({ source }: { source: string }) {
  const out: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(<p key={out.length}>{inline(para.join(' '))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const items = list.items.map((t, j) => <li key={j}>{inline(t)}</li>);
    out.push(
      list.ordered ? (
        <ol key={out.length} className="list-decimal space-y-1 pl-6">
          {items}
        </ol>
      ) : (
        <ul key={out.length} className="list-disc space-y-1 pl-6">
          {items}
        </ul>
      ),
    );
    list = null;
  };
  for (const raw of source.trim().split('\n')) {
    const line = raw.trimEnd();
    if (line === '') {
      flushPara();
      flushList();
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara();
      flushList();
      out.push(
        <h1 key={out.length} className="text-3xl">
          {inline(line.slice(2))}
        </h1>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara();
      flushList();
      out.push(
        <h2 key={out.length} className="pt-2 text-xl">
          {inline(line.slice(3))}
        </h2>,
      );
      continue;
    }
    const ul = /^[-*] (.*)/.exec(line);
    const ol = /^\d+\. (.*)/.exec(line);
    if (ul || ol) {
      flushPara();
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flushList();
      list = list ?? { ordered, items: [] };
      list.items.push((ul ?? ol)![1]!);
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();
  return <div className="space-y-4">{out}</div>;
}
