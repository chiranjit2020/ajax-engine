import { Check, Circle, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSimulation } from '../../app/providers/SimulationProvider';
import { DEFAULT_WP_INPUT, WP_ACTION, WP_CALLBACK, type WpStudentInput } from '../../data/scenarios/wp-student-details';
import { hasReached } from '../../engine/execution';

/**
 * Guided exercise (spec §7.2): fix a missing wp_ajax_nopriv_ registration.
 * Progress is observed from real runs of the simulation, not self-reported.
 */
export function NoprivExercise() {
  const { entry, state, input, setInput } = useSimulation();
  const wp = input as WpStudentInput;
  const [active, setActive] = useState(false);
  const [sawFailure, setSawFailure] = useState(false);
  const [sawSuccess, setSawSuccess] = useState(false);

  const execution = state.execution;
  const scenario = entry?.scenario;
  const reachedAuth = scenario ? state.stageIndex >= scenario.stages.findIndex((stage) => stage.id === 'wp-auth-branch') : false;
  const finished = scenario && execution ? hasReached(scenario, state.stageIndex, 'dom-updated') : false;
  const hasNopriv = wp.registrations.some((registration) => registration.hook === `wp_ajax_nopriv_${WP_ACTION}`);

  useEffect(() => {
    if (!active || !execution) return;
    const loggedOut = execution.tags.includes('logged-out');
    if (loggedOut && execution.tags.includes('no-hook') && reachedAuth) setSawFailure(true);
    if (sawFailure && hasNopriv && loggedOut && finished && !execution.failure) setSawSuccess(true);
  }, [active, execution, reachedAuth, finished, sawFailure, hasNopriv]);

  function start() {
    setSawFailure(false);
    setSawSuccess(false);
    setActive(true);
    setInput({
      ...DEFAULT_WP_INPUT,
      loggedIn: false,
      registrations: [{ id: 'ex1', hook: `wp_ajax_${WP_ACTION}`, callback: WP_CALLBACK }],
    });
  }

  const steps = [
    { done: sawFailure, text: 'Send the request as a logged-out visitor. Watch where it stops, and what the response body is.' },
    { done: sawFailure && hasNopriv, text: `Register the missing hook: add wp_ajax_nopriv_${WP_ACTION} in the hook registry.` },
    { done: sawSuccess, text: 'Send the request again, still logged out. The callback should now run.' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <GraduationCap size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Exercise: why do logged-out visitors get “0”?</h3>
          <p className="text-xs text-muted">
            A plugin works for the site admin, but visitors who are not logged in see “The request failed.” Find out why and fix it.
          </p>
        </div>
      </div>
      {!active ? (
        <button type="button" onClick={start} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent hover:opacity-90">
          Start the exercise
        </button>
      ) : (
        <>
          <ol className="space-y-2" aria-label="Exercise steps">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-2 text-sm">
                {step.done ? (
                  <Check size={16} className="mt-0.5 shrink-0 text-success" aria-label="Done" />
                ) : (
                  <Circle size={16} className="mt-0.5 shrink-0 text-muted" aria-label="Not done yet" />
                )}
                <span className={step.done ? 'text-muted line-through decoration-muted/50' : ''}>{step.text}</span>
              </li>
            ))}
          </ol>
          {sawSuccess ? (
            <div role="status" className="space-y-1 rounded-lg border border-success/40 bg-success-soft p-3 text-sm">
              <p className="font-semibold text-success">Fixed.</p>
              <p className="leading-relaxed">
                Logged-out visitors fire <code className="font-mono">wp_ajax_nopriv_{WP_ACTION}</code>, a different hook from{' '}
                <code className="font-mono">wp_ajax_{WP_ACTION}</code>. With nothing registered there, admin-ajax.php answered “0” with HTTP 400
                before your callback could run. Public actions need both registrations — and should only return data meant for the public.
              </p>
            </div>
          ) : (
            <button type="button" onClick={start} className="text-xs text-muted underline hover:text-text">
              Restart the exercise
            </button>
          )}
        </>
      )}
    </div>
  );
}
