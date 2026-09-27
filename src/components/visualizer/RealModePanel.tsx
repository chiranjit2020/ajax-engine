import { Globe, Loader, TriangleAlert } from 'lucide-react';
import { useId } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { validateTarget } from '../../engine/request-adapters';

/**
 * Opt-in Real Request mode (spec §13.2). Nothing is sent until the learner
 * types an origin and confirms. WordPress scenarios always use the simulation.
 */
export function RealModePanel() {
  const { entry, input, realMode, realActive, pending, setRealMode } = useSimulation();
  const originId = useId();
  if (!entry || entry.scenario.track !== 'standalone') return null;

  const check = validateTarget(realMode.origin);
  const request = entry.scenario.buildRequest(input);

  return (
    <details className="group rounded-lg border border-line" open={realMode.enabled || undefined}>
      <summary className="flex items-center justify-between gap-2 p-2.5 text-sm font-medium">
        <span className="flex items-center gap-1.5">
          <Globe size={14} aria-hidden /> Execution: {realActive ? 'real request' : 'simulation'}
        </span>
        <span className="text-xs font-normal text-muted">Advanced</span>
      </summary>
      <div className="space-y-3 border-t border-line p-2.5 text-sm">
        <div role="group" aria-label="Execution mode" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
          {[
            { value: false, label: 'Simulation' },
            { value: true, label: 'Real request' },
          ].map(({ value, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={realMode.enabled === value}
              onClick={() => realMode.enabled !== value && setRealMode({ enabled: value })}
              className="rounded-md px-2.5 py-1 text-sm text-muted hover:text-text aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
            >
              {label}
            </button>
          ))}
        </div>

        {realMode.enabled ? (
          <>
            <p className="text-xs text-muted">
              Sends this scenario’s request from your browser to a server you run. The server must answer{' '}
              <code className="font-mono text-text">
                {request.method} {request.url.split('?')[0]}
              </code>{' '}
              and allow this page’s origin (CORS). Its internal processing will not be visible — only its response.
            </p>
            <div className="space-y-1">
              <label htmlFor={originId} className="text-xs font-medium">
                Server origin
              </label>
              <input
                id={originId}
                value={realMode.origin}
                placeholder="http://localhost:8080"
                spellCheck={false}
                aria-invalid={realMode.origin !== '' && !check.ok}
                onChange={(event) => setRealMode({ origin: event.target.value })}
                className="h-8 w-full rounded-md border border-line bg-surface px-2 font-mono text-sm aria-invalid:border-danger"
              />
              {realMode.origin !== '' && !check.ok && <p className="text-xs text-danger">{check.reason}</p>}
            </div>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={realMode.acknowledged}
                onChange={(event) => setRealMode({ acknowledged: event.target.checked })}
                className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
              />
              <span>I understand this sends a real HTTP request from my browser to this address. No cookies are included.</span>
            </label>
            {realActive ? (
              <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                {pending ? <Loader size={13} className="animate-spin" aria-hidden /> : <TriangleAlert size={13} aria-hidden />}
                {pending ? 'Waiting for the real server…' : 'Real Request mode is on. Press Play to send.'}
              </p>
            ) : (
              <p className="text-xs text-muted">Until both are set, the simulation is used.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted">Every request is simulated in your browser. Nothing is sent over the network.</p>
        )}
      </div>
    </details>
  );
}
