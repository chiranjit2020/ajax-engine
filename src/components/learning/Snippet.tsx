import { Highlight } from 'prism-react-renderer';
import type { Snippet as SnippetData } from '../../data/learning/types';
import '../code/prism';
import { CopyButton, THEME } from '../code/CodeView';

/** A short highlighted code sample with line numbers and an optional line-by-line walkthrough. */
export function Snippet({ snippet, title }: { snippet: SnippetData; title?: string }) {
  const noted = new Set(snippet.notes?.map((note) => note.line));
  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-line bg-surface-2">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1">
          <figcaption className="text-xs text-muted">{title ?? snippet.language}</figcaption>
          <CopyButton text={snippet.code} />
        </div>
        <Highlight code={snippet.code} language={snippet.language} theme={THEME}>
          {({ tokens, getTokenProps }) => (
            <pre tabIndex={0} aria-label={title ?? `${snippet.language} code`} className="overflow-x-auto py-2 font-mono text-[13px] leading-6">
              <code>
                {tokens.map((line, index) => (
                  <div key={index} className={`flex pr-4 ${noted.has(index + 1) ? 'bg-accent-soft' : ''}`}>
                    <span aria-hidden className="w-9 shrink-0 select-none pr-3 text-right text-muted">
                      {index + 1}
                    </span>
                    <span>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </span>
                  </div>
                ))}
              </code>
            </pre>
          )}
        </Highlight>
      </div>
      {snippet.notes && (
        <ol className="space-y-1 text-sm">
          {snippet.notes.map((note) => (
            <li key={note.line} className="flex gap-2">
              <span className="w-12 shrink-0 font-mono text-xs leading-5 text-accent">Line {note.line}</span>
              <span>{note.text}</span>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}
