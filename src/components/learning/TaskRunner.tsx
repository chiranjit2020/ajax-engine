import { ArrowDown, ArrowUp, Check, Lightbulb, RotateCcw, X } from 'lucide-react';
import { useId, useMemo, useState, type ReactNode } from 'react';
import { getScenarioEntry } from '../../data/scenarios';
import { isTextAnswerCorrect, stableShuffle, type Task } from '../../data/learning/types';
import { resolveExecution } from '../../engine/execution';
import { byteLength, formatRawRequest, formatRawResponse, responseContentType } from '../../engine/http';
import { Snippet } from './Snippet';

type Outcome = { correct: boolean; feedback: string[] } | null;

function Result({ outcome, explanation }: { outcome: NonNullable<Outcome>; explanation: string }) {
  return (
    <div
      role="status"
      className={`space-y-1.5 rounded-lg border p-3 text-sm ${outcome.correct ? 'border-success/40 bg-success-soft' : 'border-danger/40 bg-danger-soft'}`}
    >
      <p className={`flex items-center gap-1.5 font-semibold ${outcome.correct ? 'text-success' : 'text-danger'}`}>
        {outcome.correct ? <Check size={16} aria-hidden /> : <X size={16} aria-hidden />}
        {outcome.correct ? 'Correct.' : 'Not quite.'}
      </p>
      {outcome.feedback.map((line, index) => (
        <p key={index}>{line}</p>
      ))}
      <p className="leading-relaxed text-text">{explanation}</p>
    </div>
  );
}

/**
 * Evidence for a debugging task, taken from a real simulated execution so it
 * always matches the engine. It shows only what browser DevTools could show:
 * no server-side notes, which would give the answer away.
 */
function Evidence({ scenarioId, preset }: { scenarioId: string; preset?: string }) {
  const evidence = useMemo(() => {
    const entry = getScenarioEntry(scenarioId);
    if (!entry) return null;
    const input = preset ? entry.scenario.presets?.[preset]?.input : entry.scenario.defaultInput;
    const execution = resolveExecution(entry.scenario, input);
    const { request, response, failure } = execution;
    const console: string[] = [`→ ${request.method} ${request.url}`];
    if (response) {
      console.push(`← ${response.status} ${response.statusText} · ${responseContentType(response)} · ${byteLength(response.rawBody)} bytes`);
    }
    if (failure) console.push(`✖ ${failure.message}`);
    return { execution, console };
  }, [scenarioId, preset]);
  if (!evidence) return null;
  const { execution, console } = evidence;

  const block = (label: string, text: string) => (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <pre className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-2.5 font-mono text-xs [overflow-wrap:anywhere]">{text}</pre>
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        {block('Request', formatRawRequest(execution.request))}
        {block('Response', execution.response ? formatRawResponse(execution.response) : 'No response received.')}
      </div>
      {block('Browser console', console.join('\n'))}
    </div>
  );
}

function OptionList({
  name,
  multiple,
  options,
  selected,
  disabled,
  onToggle,
}: {
  name: string;
  multiple: boolean;
  options: { text: string }[];
  selected: number[];
  disabled: boolean;
  onToggle(index: number): void;
}) {
  return (
    <div className="space-y-1.5">
      {options.map((option, index) => (
        <label
          key={index}
          className={`flex cursor-pointer gap-2.5 rounded-lg border p-2.5 text-sm ${selected.includes(index) ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2'}`}
        >
          <input
            type={multiple ? 'checkbox' : 'radio'}
            name={name}
            checked={selected.includes(index)}
            disabled={disabled}
            onChange={() => onToggle(index)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="min-w-0 break-words">{option.text}</span>
        </label>
      ))}
    </div>
  );
}

/** Renders any task, checks the answer, gives immediate feedback, and reports each attempt. */
export function TaskRunner({ task, seed, onAttempt }: { task: Task; seed: string; onAttempt?(correct: boolean): void }) {
  const name = useId();
  const [selected, setSelected] = useState<number[]>([]);
  const [text, setText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const initialOrder = useMemo(() => (task.kind === 'order' ? stableShuffle(task.items, seed) : []), [task, seed]);
  const [order, setOrder] = useState<string[]>(initialOrder);
  const [parts, setParts] = useState<(number | null)[]>(() => (task.kind === 'fill' ? task.parts.map(() => null) : []));
  const [outcome, setOutcome] = useState<Outcome>(null);
  const locked = outcome !== null;

  function check() {
    let result: NonNullable<Outcome>;
    switch (task.kind) {
      case 'choice':
      case 'debug': {
        const choice = selected[0]!;
        const correct = choice === task.answer;
        result = { correct, feedback: correct ? [] : [task.options[choice]?.feedback ?? ''].filter(Boolean) };
        break;
      }
      case 'multi': {
        const expected = new Set(task.answers);
        const chosen = new Set(selected);
        const correct = expected.size === chosen.size && [...expected].every((index) => chosen.has(index));
        const feedback = task.options.flatMap((option, index) =>
          expected.has(index) !== chosen.has(index)
            ? [`${expected.has(index) ? 'Needed' : 'Not needed'}: ${option.text} — ${option.feedback}`]
            : [],
        );
        result = { correct, feedback };
        break;
      }
      case 'text': {
        const correct = isTextAnswerCorrect(task, text);
        result = { correct, feedback: correct ? [] : [`Hint: ${task.hint}`] };
        break;
      }
      case 'order': {
        const correct = order.every((item, index) => item === task.items[index]);
        const misplaced = order.filter((item, index) => item !== task.items[index]).length;
        result = { correct, feedback: correct ? [] : [`${misplaced} of ${order.length} items are in the wrong place.`] };
        break;
      }
      case 'fill': {
        const correct = task.parts.every((part, index) => parts[index] === part.answer);
        const feedback = task.parts.flatMap((part, index) => (parts[index] === part.answer ? [] : [`${part.label}: ${part.feedback}`]));
        result = { correct, feedback };
        break;
      }
    }
    setOutcome(result);
    onAttempt?.(result.correct);
  }

  function retry() {
    setOutcome(null);
    setShowHint(false);
  }

  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  };

  const ready =
    task.kind === 'choice' || task.kind === 'debug'
      ? selected.length === 1
      : task.kind === 'multi'
        ? selected.length > 0
        : task.kind === 'text'
          ? text.trim().length > 0
          : task.kind === 'fill'
            ? parts.every((part) => part !== null)
            : true;

  let body: ReactNode;
  switch (task.kind) {
    case 'choice':
    case 'debug':
      body = (
        <>
          {task.kind === 'debug' && <Evidence scenarioId={task.evidence.scenarioId} preset={task.evidence.preset} />}
          <OptionList name={name} multiple={false} options={task.options} selected={selected} disabled={locked} onToggle={(index) => setSelected([index])} />
        </>
      );
      break;
    case 'multi':
      body = (
        <OptionList
          name={name}
          multiple
          options={task.options}
          selected={selected}
          disabled={locked}
          onToggle={(index) => setSelected(selected.includes(index) ? selected.filter((value) => value !== index) : [...selected, index])}
        />
      );
      break;
    case 'text':
      body = (
        <div className="space-y-2">
          <label htmlFor={`${name}-text`} className="sr-only">
            Your answer
          </label>
          <input
            id={`${name}-text`}
            value={text}
            disabled={locked}
            placeholder={task.placeholder}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && ready && !locked && check()}
            className="h-9 w-full max-w-sm rounded-lg border border-line bg-surface px-2 font-mono text-sm"
          />
          {!locked && (
            <button type="button" onClick={() => setShowHint(!showHint)} className="inline-flex items-center gap-1 text-xs text-muted hover:text-text">
              <Lightbulb size={13} aria-hidden /> {showHint ? task.hint : 'Show a hint'}
            </button>
          )}
        </div>
      );
      break;
    case 'order':
      body = (
        <ol className="space-y-1.5" aria-label="Items to order">
          {order.map((item, index) => (
            <li key={item} className="flex items-center gap-2 rounded-lg border border-line p-2 text-sm">
              <span className="w-6 shrink-0 text-center font-mono text-xs text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 break-words">{item}</span>
              <span className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={locked || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move “${item}” up`}
                  className="grid size-7 place-items-center rounded-md border border-line hover:bg-surface-2 disabled:opacity-30"
                >
                  <ArrowUp size={14} aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={locked || index === order.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move “${item}” down`}
                  className="grid size-7 place-items-center rounded-md border border-line hover:bg-surface-2 disabled:opacity-30"
                >
                  <ArrowDown size={14} aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ol>
      );
      break;
    case 'fill':
      body = (
        <div className="grid gap-2 sm:grid-cols-2">
          {task.parts.map((part, index) => (
            <label key={part.label} className="space-y-1 text-sm">
              <span className="block font-medium">{part.label}</span>
              <select
                value={parts[index] ?? ''}
                disabled={locked}
                onChange={(event) => setParts(parts.map((value, i) => (i === index ? Number(event.target.value) : value)))}
                className="h-9 w-full rounded-lg border border-line bg-surface px-2 font-mono text-sm"
              >
                <option value="" disabled>
                  Choose…
                </option>
                {part.options.map((option, optionIndex) => (
                  <option key={option} value={optionIndex}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      );
      break;
  }

  return (
    <div className="space-y-3">
      <p className="font-medium">{task.question}</p>
      {task.code && <Snippet snippet={task.code} />}
      {body}
      {outcome ? (
        <>
          <Result outcome={outcome} explanation={task.explanation} />
          {!outcome.correct && (
            <button type="button" onClick={retry} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
              <RotateCcw size={14} aria-hidden /> Try again
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={check}
          disabled={!ready}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-40"
        >
          Check answer
        </button>
      )}
    </div>
  );
}
