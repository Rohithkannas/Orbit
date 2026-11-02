import { Fragment, useState, type ReactNode } from "react";

type Token = { type: "keyword" | "string" | "number" | "comment" | "plain"; value: string };

const KEYWORDS = /^(?:const|let|var|function|return|if|else|for|while|class|new|public|private|static|void|int|char|boolean|null|undefined|true|false|import|from|export|default|async|await|try|catch|throw|extends|implements|interface|type|String|Map|Set|return|def|print|self|pass|None|in|not|and|or|SELECT|FROM|WHERE|JOIN|INSERT|UPDATE|DELETE|CREATE|TABLE|class|package|System|out|println)$/;

function tokenizeCode(code: string): Token[] {
  const pattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
  const tokens: Token[] = [];
  let cursor = 0;
  for (const match of code.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) tokens.push({ type: "plain", value: code.slice(cursor, index) });
    const value = match[0];
    let type: Token["type"] = "plain";
    if (/^(\/\/|#|\/\*)/.test(value)) type = "comment";
    else if (/^["'`]/.test(value)) type = "string";
    else if (/^\d/.test(value)) type = "number";
    else if (KEYWORDS.test(value)) type = "keyword";
    tokens.push({ type, value });
    cursor = index + value.length;
  }
  if (cursor < code.length) tokens.push({ type: "plain", value: code.slice(cursor) });
  return tokens;
}

function InlineMarkdown({ text }: { text: string }) {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*\n]+\*|_[^_\n]+_|!?\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    const value = match[0];
    if (value.startsWith("**") || value.startsWith("__")) parts.push(<strong key={key++}>{value.slice(2, -2)}</strong>);
    else if (value.startsWith("`")) parts.push(<code className="md-inline-code" key={key++}>{value.slice(1, -1)}</code>);
    else if (value.startsWith("*") || value.startsWith("_")) parts.push(<em key={key++}>{value.slice(1, -1)}</em>);
    else {
      const link = value.match(/^(!?)\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (link) parts.push(link[1] ? <a key={key++} href={link[3]} target="_blank" rel="noreferrer">{link[2]}</a> : <a key={key++} href={link[3]} target="_blank" rel="noreferrer">{link[2]}</a>);
      else parts.push(value);
    }
    cursor = index + value.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts.map((part, index) => <Fragment key={index}>{part}</Fragment>)}</>;
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^\s*```([^`]*)$/);
    if (fence) {
      const language = fence[1].trim() || "text";
      i++;
      const codeLines: string[] = [];
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) codeLines.push(lines[i++]);
      if (i < lines.length) i++;
      const code = codeLines.join("\n");
      const id = blockKey++;
      blocks.push(<div className="md-code-block" key={id}><div className="md-code-header"><span>{language}</span><button type="button" onClick={() => { void navigator.clipboard.writeText(code).then(() => { setCopiedBlock(id); window.setTimeout(() => setCopiedBlock((current) => current === id ? null : current), 1600); }).catch(() => setCopiedBlock(null)); }}>{copiedBlock === id ? "Copied" : "Copy code"}</button></div><pre><code>{tokenizeCode(code).map((token, index) => <span key={index} className={token.type === "plain" ? undefined : `tok-${token.type}`}>{token.value}</span>)}</code></pre></div>);
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const children = <InlineMarkdown text={heading[2]} />;
      blocks.push(level === 1 ? <h2 key={blockKey++}>{children}</h2> : level === 2 ? <h3 key={blockKey++}>{children}</h3> : <h4 key={blockKey++}>{children}</h4>);
      i++; continue;
    }

    if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) { blocks.push(<hr key={blockKey++} />); i++; continue; }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={blockKey++}>{quote.map((item, index) => <p key={index}><InlineMarkdown text={item} /></p>)}</blockquote>);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*+]\s+/, ""));
      blocks.push(<ul key={blockKey++}>{items.map((item, index) => <li key={index}><InlineMarkdown text={item} /></li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ""));
      blocks.push(<ol key={blockKey++}>{items.map((item, index) => <li key={index}><InlineMarkdown text={item} /></li>)}</ol>);
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const parseCells = (value: string) => value.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
      const headers = parseCells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) rows.push(parseCells(lines[i++]));
      blocks.push(<div className="md-table-wrap" key={blockKey++}><table><thead><tr>{headers.map((cell, index) => <th key={index}><InlineMarkdown text={cell} /></th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}><InlineMarkdown text={row[cellIndex] ?? ""} /></td>)}</tr>)}</tbody></table></div>);
      continue;
    }

    const paragraph: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,6}\s|```|>|[-*+]\s+|\d+[.)]\s+|---+\s*$)/.test(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(<p key={blockKey++}><InlineMarkdown text={paragraph.join(" ")} /></p>);
  }

  return <div className="markdown-content">{blocks}</div>;
}
