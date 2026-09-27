import { Check, Minus, Plus, Trash2, X } from 'lucide-react';
import { useId } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { NONCE_OPTIONS, WP_CALLBACK, type NonceState, type WpStudentInput } from '../../data/scenarios/wp-student-details';
import { isLoggedIn } from '../../data/scenarios/wordpress/common';
import { dispatch, hookNameFor, LOGGED_IN_PREFIX, LOGGED_OUT_PREFIX } from '../../engine/wordpress';
import { Badge } from '../../components/ui/Badge';
import { LoginToggle } from './StudentPlayground';

function useWpInput() {
  const { input, setInput } = useSimulation();
  const wp = input as WpStudentInput;
  return { wp, update: (patch: Partial<WpStudentInput>) => setInput({ ...wp, ...patch }) };
}

let nextId = 100;
const newId = () => `r${nextId++}`;

/** What the browser will send: the action field, login state (cookie), nonce, and student ID. */
export function RequestControls() {
  const { wp, update } = useWpInput();
  const actionId = useId();
  const nonceId = useId();
  const studentId = useId();

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={actionId} className="text-sm font-medium">
          <code className="font-mono">action</code> parameter
        </label>
        <input
          id={actionId}
          value={wp.action}
          spellCheck={false}
          onChange={(event) => update({ action: event.target.value })}
          className="h-9 w-full rounded-lg border border-line bg-surface px-2 font-mono text-sm"
        />
        <p className="text-xs text-muted">Sent as a form field. WordPress uses it to build the hook name.</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">Visitor</span>
        <LoginToggle />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={nonceId} className="text-sm font-medium">
            Nonce
          </label>
          <select
            id={nonceId}
            value={wp.nonce}
            onChange={(event) => update({ nonce: event.target.value as NonceState })}
            className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
          >
            {NONCE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={studentId} className="text-sm font-medium">
            <code className="font-mono">student_id</code>
          </label>
          <input
            id={studentId}
            value={wp.studentId}
            onChange={(event) => update({ studentId: event.target.value })}
            className="h-9 w-full rounded-lg border border-line bg-surface px-2 font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
}

/** Simulated add_action() registrations. The plugin code in the Code Studio is generated from this list. */
export function HookRegistry() {
  const { wp, update } = useWpInput();
  const loggedIn = isLoggedIn(wp.user);
  const result = dispatch(wp.registrations, wp.action, loggedIn);
  const setHook = (id: string, hook: string) =>
    update({ registrations: wp.registrations.map((registration) => (registration.id === id ? { ...registration, hook } : registration)) });
  const add = (hook: string) => update({ registrations: [...wp.registrations, { id: newId(), hook, callback: WP_CALLBACK }] });
  const remove = (id: string) => update({ registrations: wp.registrations.filter((registration) => registration.id !== id) });
  const firstMatch = result.matches[0]?.id;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Each row is one <code className="font-mono">add_action( $hook, $callback )</code> call in the plugin. Edit a hook name to see how dispatch
        changes.
      </p>
      {wp.registrations.length === 0 && <p className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">No hooks registered.</p>}
      <ul className="space-y-2">
        {wp.registrations.map((registration, index) => {
          const matches = registration.id === firstMatch;
          const shadowed = !matches && result.matches.some((match) => match.id === registration.id);
          const otherState = registration.hook === result.otherHookName;
          return (
            <li
              key={registration.id}
              className={`space-y-1.5 rounded-lg border p-2.5 ${matches ? 'border-success bg-success-soft' : 'border-line'}`}
            >
              <div className="flex items-center gap-2">
                <label htmlFor={`hook-${registration.id}`} className="sr-only">
                  Hook name {index + 1}
                </label>
                <input
                  id={`hook-${registration.id}`}
                  value={registration.hook}
                  spellCheck={false}
                  onChange={(event) => setHook(registration.id, event.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => remove(registration.id)}
                  aria-label={`Remove ${registration.hook || 'empty hook'}`}
                  className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 size={15} aria-hidden />
                </button>
              </div>
              <p className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-muted">→ {registration.callback}()</span>
                {matches ? (
                  <Badge tone="success" icon={<Check size={12} aria-hidden />}>
                    Matches this request
                  </Badge>
                ) : shadowed ? (
                  <Badge tone="warning">Same hook — never reached, the first callback ends the request</Badge>
                ) : otherState ? (
                  <Badge icon={<Minus size={12} aria-hidden />}>Only for {loggedIn ? 'logged-out' : 'logged-in'} visitors</Badge>
                ) : (
                  <Badge icon={<X size={12} aria-hidden />}>Not used by this action</Badge>
                )}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2">
        {[LOGGED_IN_PREFIX, LOGGED_OUT_PREFIX].map((prefix) => {
          const hook = prefix + wp.action;
          const exists = wp.registrations.some((registration) => registration.hook === hook);
          return (
            <button
              key={prefix}
              type="button"
              disabled={exists || !wp.action}
              onClick={() => add(hook)}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 font-mono text-xs hover:bg-surface-2 disabled:opacity-40"
            >
              <Plus size={13} aria-hidden /> {hook || prefix}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => add('')}
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2 py-1 text-xs hover:bg-surface-2"
        >
          <Plus size={13} aria-hidden /> Custom hook
        </button>
      </div>
    </div>
  );
}

/** Step-by-step preview of admin-ajax.php's decision for the current settings. Uses the same dispatch() as the simulation. */
export function DispatchPreview() {
  const { wp } = useWpInput();
  const loggedIn = isLoggedIn(wp.user);
  const result = dispatch(wp.registrations, wp.action, loggedIn);
  const runs = result.matches[0];

  const steps: { code: string; outcome: string; tone: 'ok' | 'bad' | 'neutral' }[] = [
    {
      code: `$_REQUEST['action']`,
      outcome: wp.action ? `'${wp.action}'` : "empty → wp_die( '0', 400 )",
      tone: wp.action ? 'neutral' : 'bad',
    },
  ];
  if (wp.action) {
    steps.push(
      { code: 'is_user_logged_in()', outcome: loggedIn ? 'true (login cookie)' : 'false (no login cookie)', tone: 'neutral' },
      { code: `'${result.prefix}' . '${wp.action}'`, outcome: hookNameFor(wp.action, loggedIn), tone: 'neutral' },
      {
        code: `has_action( '${result.hookName}' )`,
        outcome: runs ? `true → ${runs.callback}()` : "false → wp_die( '0', 400 )",
        tone: runs ? 'ok' : 'bad',
      },
    );
  }

  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {steps.map((step, index) => (
          <li key={index} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-xs">
            <span className="block break-all text-muted">{step.code}</span>
            <span
              className={`block break-all font-semibold ${step.tone === 'ok' ? 'text-success' : step.tone === 'bad' ? 'text-danger' : 'text-text'}`}
            >
              → {step.outcome}
            </span>
          </li>
        ))}
      </ol>
      {wp.action && !runs && result.otherHookRegistered && (
        <p className="text-xs text-muted">
          <code className="font-mono">{result.otherHookName}</code> is registered, but it is only used for{' '}
          {loggedIn ? 'logged-out' : 'logged-in'} visitors. Registering <code className="font-mono">wp_ajax_</code> does not enable the same
          handler for logged-out visitors — that needs its own <code className="font-mono">wp_ajax_nopriv_</code> registration.
        </p>
      )}
      <p className="text-xs text-muted">Preview only — send the request to watch it happen. The nonce is checked later, inside the callback.</p>
    </div>
  );
}
