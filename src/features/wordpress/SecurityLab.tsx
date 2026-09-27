import { Loader, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { NONCE_OPTIONS, USER_OPTIONS, type NonceState, type SimUser } from '../../data/scenarios/wordpress/common';
import {
  STUDENT_ID_OPTIONS,
  containsHtml,
  securityResultText,
  type SecurityControls,
  type WpSecurityInput,
} from '../../data/scenarios/wp-security-lab';
import { hasReached } from '../../engine/execution';
import { BrowserFrame, Tag } from '../shared/BrowserFrame';

function useSecurityInput() {
  const { input, setInput } = useSimulation();
  const sec = input as WpSecurityInput;
  return {
    sec,
    update: (patch: Partial<WpSecurityInput>) => setInput({ ...sec, ...patch }),
    control: (patch: Partial<SecurityControls>) => setInput({ ...sec, controls: { ...sec.controls, ...patch } }),
  };
}

const CONTROLS: { key: Exclude<keyof SecurityControls, 'output'>; label: string; protects: string; invert?: boolean }[] = [
  { key: 'verifyNonce', label: 'Verify the nonce', protects: 'check_ajax_referer() — stops forged cross-site requests (CSRF).' },
  { key: 'checkCapability', label: 'Check the capability', protects: 'current_user_can() — only authorized users see records.' },
  { key: 'validateInput', label: 'Validate input, prepare the query', protects: 'absint() + $wpdb->prepare() — blocks SQL injection.' },
  {
    key: 'publicAccess',
    label: 'Register for logged-out visitors too',
    protects: 'Adds wp_ajax_nopriv_. Private data endpoints should not do this.',
    invert: true,
  },
];

/** Who is asking, what they send, and which safety controls are in place. */
export function SecurityControlsPanel() {
  const { sec, update, control } = useSecurityInput();
  const userId = useId();
  const nonceId = useId();
  const studentId = useId();
  const presetId = useId();

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor={userId} className="text-sm font-medium">
            Who is asking
          </label>
          <select
            id={userId}
            value={sec.user}
            onChange={(event) => update({ user: event.target.value as SimUser })}
            className="h-9 w-full rounded-lg border border-line bg-surface px-2 text-sm"
          >
            {USER_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor={nonceId} className="text-sm font-medium">
            Nonce
          </label>
          <select
            id={nonceId}
            value={sec.nonce}
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
      </div>

      <div className="space-y-1">
        <label htmlFor={studentId} className="text-sm font-medium">
          <code className="font-mono">student_id</code> sent by the browser
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={studentId}
            value={sec.studentId}
            spellCheck={false}
            onChange={(event) => update({ studentId: event.target.value })}
            className="h-9 min-w-[8rem] flex-1 rounded-lg border border-line bg-surface px-2 font-mono text-sm"
          />
          <label htmlFor={presetId} className="sr-only">
            Example values
          </label>
          <select
            id={presetId}
            value=""
            onChange={(event) => event.target.value && update({ studentId: event.target.value })}
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-sm"
          >
            <option value="">Try an example…</option>
            {STUDENT_ID_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Safety controls</legend>
        {CONTROLS.map(({ key, label, protects, invert }) => {
          const on = sec.controls[key];
          const safe = invert ? !on : on;
          return (
            <label key={key} className={`flex gap-2.5 rounded-lg border p-2.5 ${safe ? 'border-line' : 'border-warning/60 bg-warning-soft'}`}>
              <input type="checkbox" checked={on} onChange={(event) => control({ [key]: event.target.checked })} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
              <span className="min-w-0 space-y-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {safe ? <ShieldCheck size={14} className="text-success" aria-hidden /> : <ShieldOff size={14} className="text-warning" aria-hidden />}
                  {label}
                  <span className="sr-only">{safe ? '(safe setting)' : '(unsafe setting)'}</span>
                </span>
                <span className="block text-xs text-muted">{protects}</span>
              </span>
            </label>
          );
        })}
        <div className={`space-y-1.5 rounded-lg border p-2.5 ${sec.controls.output === 'text' ? 'border-line' : 'border-warning/60 bg-warning-soft'}`}>
          <p className="text-sm font-medium">JavaScript writes the result with</p>
          <div role="group" aria-label="Output method" className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
            {(['text', 'html'] as const).map((method) => (
              <button
                key={method}
                type="button"
                aria-pressed={sec.controls.output === method}
                onClick={() => control({ output: method })}
                className="rounded-md px-2.5 py-1 font-mono text-sm text-muted hover:text-text aria-pressed:bg-surface aria-pressed:text-text aria-pressed:shadow-sm"
              >
                .{method}()
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">.text() shows data as plain text. .html() parses it as HTML — unsafe for data you did not write.</p>
        </div>
      </fieldset>
    </div>
  );
}

/** The simulated page. Unsafe .html() output is described, never actually injected. */
export function SecurityPlayground({ compact = false }: { compact?: boolean }) {
  const { state, entry, input, play } = useSimulation();
  if (!entry) return null;
  const sec = input as WpSecurityInput;
  const scenario = entry.scenario;
  const execution = state.execution;
  const at = state.stageIndex;
  const sent = execution !== null && hasReached(scenario, at, 'request-sent');
  const done = execution !== null && hasReached(scenario, at, 'dom-updated');
  const inProgress = execution !== null && state.status !== 'finished';
  const text = done && execution ? securityResultText(execution) : null;
  const unsafeHtml = text !== null && !execution!.failure && sec.controls.output === 'html' && containsHtml(text);
  const received = done && execution?.response ? execution.response.rawBody : null;

  let result: ReactNode = <span className="text-muted">(empty)</span>;
  if (unsafeHtml) {
    result = (
      <span className="block space-y-1.5">
        <span className="flex items-center gap-1.5 font-semibold text-danger">
          <ShieldAlert size={15} aria-hidden /> Script would run (simulated)
        </span>
        <span className="block text-xs leading-relaxed text-text">
          .html() turned the text into real HTML: the browser would create an <code className="font-mono">&lt;img&gt;</code> element, fail to
          load <code className="font-mono">src=x</code>, and run its <code className="font-mono">onerror</code> handler — the attacker’s script,
          running on this site. Nothing was actually injected here.
        </span>
      </span>
    );
  } else if (text !== null) {
    result = <span className={`break-words font-mono text-xs ${execution!.failure ? 'text-danger' : ''}`}>{text}</span>;
  } else if (sent) {
    result = (
      <span className="inline-flex items-center gap-1.5 text-muted">
        <Loader size={13} className="animate-spin" aria-hidden /> Loading...
      </span>
    );
  }

  return (
    <div className="space-y-3">
      <BrowserFrame url="ajax-lab.test/wp-admin/admin.php?page=student-records">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Student records</p>
            <Tag>#student-id = {JSON.stringify(sec.studentId)}</Tag>
          </div>
          <button
            type="button"
            onClick={play}
            disabled={inProgress}
            className="h-8 rounded-md bg-accent px-3 text-sm font-medium text-on-accent hover:opacity-90 disabled:opacity-50"
          >
            Load record
          </button>
          <div className={`rounded-md border p-2.5 text-sm ${unsafeHtml ? 'border-danger bg-danger-soft' : 'border-line'}`}>
            <div className="mb-1 flex justify-end">
              <Tag>#student-result</Tag>
            </div>
            <div className="min-h-5 [overflow-wrap:anywhere]">{result}</div>
          </div>
        </div>
      </BrowserFrame>
      {!compact && received !== null && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Data the browser received</p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2 p-2 font-mono text-[11px] [overflow-wrap:anywhere]">
            {received}
          </pre>
          {execution?.tags.includes('leak') && (
            <p className="text-xs font-medium text-danger">Private fields (email, grade) reached a user who is not allowed to see them.</p>
          )}
        </div>
      )}
    </div>
  );
}
