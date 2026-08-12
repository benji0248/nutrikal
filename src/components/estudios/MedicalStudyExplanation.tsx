import { clsx } from 'clsx';

interface MedicalStudyExplanationProps {
  text: string;
}

type Block =
  | { kind: 'heading'; text: string; level: 1 | 2 }
  | { kind: 'paragraph'; parts: Array<{ bold: boolean; text: string }> }
  | { kind: 'list'; items: Array<Array<{ bold: boolean; text: string }>> };

function parseInline(text: string): Array<{ bold: boolean; text: string }> {
  const parts: Array<{ bold: boolean; text: string }> = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ bold: false, text: text.slice(last, match.index) });
    }
    parts.push({ bold: true, text: match[1] });
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push({ bold: false, text: text.slice(last) });
  }

  return parts.length ? parts : [{ bold: false, text }];
}

function parseExplanation(text: string): Block[] {
  const blocks: Block[] = [];
  const chunks = text.split(/\n\s*\n/).map((c) => c.trim()).filter(Boolean);

  for (const chunk of chunks) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);

    const bulletLines = lines.filter((l) => /^[-*•]\s+/.test(l));
    if (bulletLines.length === lines.length && lines.length > 0) {
      blocks.push({
        kind: 'list',
        items: lines.map((l) => parseInline(l.replace(/^[-*•]\s+/, ''))),
      });
      continue;
    }

    for (const line of lines) {
      if (/^\*\*.+\*\*:?\s*$/.test(line)) {
        blocks.push({
          kind: 'heading',
          level: 2,
          text: line.replace(/^\*\*/, '').replace(/\*\*:?\s*$/, ''),
        });
      } else if (line.startsWith('## ')) {
        blocks.push({ kind: 'heading', level: 2, text: line.slice(3) });
      } else if (line.startsWith('# ')) {
        blocks.push({ kind: 'heading', level: 1, text: line.slice(2) });
      } else if (/^[-*•]\s+/.test(line)) {
        blocks.push({
          kind: 'list',
          items: [parseInline(line.replace(/^[-*•]\s+/, ''))],
        });
      } else {
        blocks.push({ kind: 'paragraph', parts: parseInline(line) });
      }
    }
  }

  return blocks;
}

function InlineParts({ parts }: { parts: Array<{ bold: boolean; text: string }> }) {
  return (
    <>
      {parts.map((part, i) =>
        part.bold ? (
          <strong key={i} className="font-semibold text-[#191c17]">
            {part.text}
          </strong>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function MedicalStudyExplanation({ text }: MedicalStudyExplanationProps) {
  const blocks = parseExplanation(text);

  return (
    <article className="space-y-6">
      {blocks.map((block, idx) => {
        if (block.kind === 'heading') {
          return (
            <div
              key={`h-${idx}`}
              className={clsx(
                'border-l-4 pl-4',
                block.level === 1 ? 'border-[#226046]' : 'border-[#226046]/40',
              )}
            >
              <h3
                className={clsx(
                  'font-heading font-bold leading-snug text-[#191c17]',
                  block.level === 1 ? 'text-xl' : 'text-lg',
                )}
              >
                {block.text}
              </h3>
            </div>
          );
        }

        if (block.kind === 'list') {
          return (
            <ul key={`ul-${idx}`} className="space-y-2 pl-1">
              {block.items.map((item, i) => (
                <li
                  key={i}
                  className="flex gap-2 font-body text-[15px] leading-relaxed text-[#40493d]"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#226046]/60" aria-hidden />
                  <span>
                    <InlineParts parts={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`p-${idx}`} className="font-body text-[15px] leading-relaxed text-[#40493d]">
            <InlineParts parts={block.parts} />
          </p>
        );
      })}
    </article>
  );
}
