import { FlaskConical } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useSimulation } from '../app/providers/SimulationProvider';
import { Badge } from '../components/ui/Badge';
import { Tabs } from '../components/ui/Tabs';
import { ExplanationPanel } from '../components/visualizer/ExplanationPanel';
import { LifecycleDiagram } from '../components/visualizer/LifecycleDiagram';
import { PacketTrack } from '../components/visualizer/PacketTrack';
import { PlaybackControls } from '../components/visualizer/PlaybackControls';
import { wpSecurityScenario } from '../data/scenarios/wp-security-lab';
import { wpStudentScenario } from '../data/scenarios/wp-student-details';
import { DispatchPreview, HookRegistry, RequestControls } from '../features/wordpress/HookRegistry';
import { NoprivExercise } from '../features/wordpress/NoprivExercise';
import { SecurityControlsPanel, SecurityPlayground } from '../features/wordpress/SecurityLab';
import { useLifecycleView } from '../hooks/useLifecycleView';

type LabTab = 'dispatcher' | 'security';

const TAB_SCENARIO: Record<LabTab, string> = { dispatcher: wpStudentScenario.id, security: wpSecurityScenario.id };

const EXPERIMENTS: { preset: string; title: string; question: string }[] = [
  { preset: 'missing-nonce', title: 'Missing nonce', question: 'Where does check_ajax_referer() stop the request, and what does jQuery receive?' },
  { preset: 'nonce-not-authorization', title: 'Nonce is not authorization', question: 'The subscriber has a valid nonce. Why are they still refused?' },
  { preset: 'no-capability-check', title: 'Remove the capability check', question: 'Same subscriber, same valid nonce. What reaches the browser now?' },
  { preset: 'public-visitor', title: 'Public endpoint, no capability check', question: 'A logged-out visitor asks. Which two mistakes combine here?' },
  { preset: 'sql-injection', title: 'SQL injection, validation removed', question: 'How many records come back for "42 OR 1=1"?' },
  { preset: 'sql-injection-blocked', title: 'Same input, validation on', question: 'What does absint() turn "42 OR 1=1" into?' },
  { preset: 'xss-html', title: 'Stored HTML with .html()', question: 'The server sent the same text both times. What does .html() do with it?' },
  { preset: 'xss-text', title: 'Stored HTML with .text()', question: 'What does the visitor see instead?' },
];

function Card({ title, children, labelledBy }: { title: string; children: ReactNode; labelledBy: string }) {
  return (
    <section aria-labelledby={labelledBy} className="min-w-0 space-y-3 rounded-xl border border-line bg-surface p-4">
      <h2 id={labelledBy} className="text-base font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Experiments() {
  const { applyPreset } = useSimulation();
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <FlaskConical size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden />
        <div>
          <h3 className="text-sm font-semibold">Experiments</h3>
          <p className="text-xs text-muted">Each one sets up the request and the controls, then sends it. Watch the callback stage and the response.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {EXPERIMENTS.map(({ preset, title, question }) => (
          <li key={preset}>
            <button
              type="button"
              onClick={() => applyPreset(wpSecurityScenario.id, preset, { play: true })}
              className="w-full space-y-0.5 rounded-lg border border-line p-2.5 text-left hover:border-accent/60 hover:bg-surface-2"
            >
              <span className="block text-sm font-medium">{title}</span>
              <span className="block text-xs text-muted">{question}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The simulated WordPress hook dispatcher (§7.2) and security lab (§9), driving the same engine as the AJAX Lab. */
export function WordPressLabPage() {
  const { track, setTrack, entry, loadScenario } = useSimulation();
  const view = useLifecycleView();
  const tab: LabTab = entry?.scenario.id === wpSecurityScenario.id ? 'security' : 'dispatcher';

  useEffect(() => {
    if (track !== 'wordpress') setTrack('wordpress');
  }, [track, setTrack]);

  // Render only once a WordPress scenario is loaded; the first frame may still hold a standalone one.
  const ready = entry?.scenario.track === 'wordpress' && view;

  return (
    <div className="flex flex-col gap-4 p-3 sm:p-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">WordPress Lab</h1>
          <Badge>Simulated WordPress — no real site is contacted</Badge>
        </div>
        <p className="max-w-3xl text-sm text-muted">
          WordPress AJAX uses the same browser and HTTP foundations as any AJAX request. What WordPress adds is its own entry point,
          admin-ajax.php, and a hook system that decides which PHP function runs.
        </p>
      </div>

      {ready && (
        <div className="min-w-0 rounded-xl border border-line bg-surface">
          <Tabs<LabTab>
            label="WordPress Lab"
            tabs={[
              { id: 'dispatcher', label: 'Hook dispatcher' },
              { id: 'security', label: 'Security lab' },
            ]}
            active={tab}
            onChange={(next) => loadScenario(TAB_SCENARIO[next])}
          >
            <div className="grid gap-4 rounded-b-xl bg-bg p-3 sm:p-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
              <div className="flex min-w-0 flex-col gap-4">
                {tab === 'dispatcher' ? (
                  <>
                    <Card title="Request" labelledBy="wp-request">
                      <RequestControls />
                    </Card>
                    <Card title="Registered hooks" labelledBy="wp-hooks">
                      <HookRegistry />
                    </Card>
                    <Card title="How admin-ajax.php will dispatch it" labelledBy="wp-preview">
                      <DispatchPreview />
                    </Card>
                  </>
                ) : (
                  <>
                    <Card title="Request and safety controls" labelledBy="sec-controls">
                      <SecurityControlsPanel />
                    </Card>
                    <Card title="The page" labelledBy="sec-page">
                      <SecurityPlayground />
                    </Card>
                  </>
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <section aria-labelledby="wp-run" className="min-w-0 space-y-4 rounded-xl border border-line bg-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="wp-run" className="text-base font-semibold">
                      Send it
                    </h2>
                    <Link to="/code" className="text-sm text-accent underline">
                      Follow it in the Code Studio
                    </Link>
                  </div>
                  <LifecycleDiagram view={view} />
                  <PacketTrack />
                  <PlaybackControls />
                </section>
                <div className="grid gap-4 xl:grid-cols-2">
                  <section aria-label="Explanation" className="min-w-0 rounded-xl border border-line bg-surface p-4">
                    <ExplanationPanel view={view} />
                  </section>
                  <section
                    aria-label={tab === 'dispatcher' ? 'Guided exercise' : 'Experiments'}
                    className="min-w-0 rounded-xl border border-line bg-surface p-4"
                  >
                    {tab === 'dispatcher' ? <NoprivExercise /> : <Experiments />}
                  </section>
                </div>
              </div>
            </div>
          </Tabs>
        </div>
      )}
    </div>
  );
}
