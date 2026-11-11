import React from 'react';
import katex from 'katex';

function InlineMath({ value }: { value: string }) {
  const html = React.useMemo(() => {
    try {
      return katex.renderToString(value, { throwOnError: false, displayMode: false, strict: 'ignore' });
    } catch {
      return value;
    }
  }, [value]);
  return <span className="math-inline" dangerouslySetInnerHTML={{ __html: html }} />;
}

function inline(text: string, keyPrefix = 'i'): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\$[^$]+\$|\[S\d+\]|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2) return <InlineMath key={key} value={part.slice(1, -1)} />;
    if (/^\[S\d+\]$/.test(part)) return <span key={key} className="citation-chip">{part}</span>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={key}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

export function RichText({ text, className = '' }: { text: string; className?: string }) {
  const blocks = React.useMemo(() => buildBlocks(String(text || '')), [text]);
  return <div className={`rich-text ${className}`}>{blocks}</div>;
}

function buildBlocks(text: string): React.ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: React.ReactNode[] = [];
  let index = 0;
  let key = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.trim().startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index]);
        index += 1;
      }
      index += 1;
      out.push(<pre key={`code-${key++}`}><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const content = inline(heading[2], `h-${key}`);
      const Tag = (`h${Math.min(level + 2, 6)}`) as React.ElementType;
      out.push(<Tag key={`heading-${key++}`} className={`md-h md-h${level}`}>{content}</Tag>);
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      out.push(<blockquote key={`quote-${key++}`}>{inline(quote.join(' '), `q-${key}`)}</blockquote>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^[-*]\s+/, ''));
        index += 1;
      }
      out.push(<ul key={`ul-${key++}`}>{items.map((item, i) => <li key={i}>{inline(item, `li-${key}-${i}`)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+[.)]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+[.)]\s+/, ''));
        index += 1;
      }
      out.push(<ol key={`ol-${key++}`}>{items.map((item, i) => <li key={i}>{inline(item, `oli-${key}-${i}`)}</li>)}</ol>);
      continue;
    }
    if (/^\|.*\|$/.test(line) && index + 1 < lines.length && /^\|?[\s:|-]+\|?$/.test(lines[index + 1])) {
      const rows: string[][] = [];
      const header = line.split('|').filter((c) => c.trim() !== '').map((c) => c.trim());
      index += 2;
      while (index < lines.length && /^\|.*\|$/.test(lines[index])) {
        rows.push(lines[index].split('|').filter((c) => c.trim() !== '').map((c) => c.trim()));
        index += 1;
      }
      out.push(
        <div className="table-wrap" key={`table-${key++}`}>
          <table>
            <thead><tr>{header.map((cell, i) => <th key={i}>{inline(cell, `th-${key}-${i}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, r) => <tr key={r}>{row.map((cell, c) => <td key={c}>{inline(cell, `td-${key}-${r}-${c}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !/^(#{1,4}\s|[-*]\s|\d+[.)]\s|>\s?|```)/.test(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    out.push(<p key={`p-${key++}`}>{inline(paragraph.join(' '), `p-${key}`)}</p>);
  }
  return out;
}
