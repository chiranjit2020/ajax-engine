import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { App } from '../app/App';

function stageButtons() {
  return within(screen.getAllByRole('list', { name: 'Request lifecycle stages' })[0]!).getAllByRole('button');
}
const currentStageTitle = () => stageButtons().find((button) => button.getAttribute('aria-current') === 'step')?.textContent ?? null;

/** Play the run to the end, one stage per act() (each timer is scheduled after the previous render). */
function playToEnd() {
  act(() => screen.getAllByRole('button', { name: /^(Play|Resume)$/ })[0]!.click());
  for (let i = 0; i < 12; i++) act(() => vi.advanceTimersByTime(2_000));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WordPress Lab', () => {
  it('guides the learner through fixing a missing wp_ajax_nopriv_ registration', () => {
    window.location.hash = '#/wordpress';
    render(<App />);

    act(() => screen.getByRole('button', { name: 'Start the exercise' }).click());
    const steps = () => within(screen.getByRole('list', { name: 'Exercise steps' })).getAllByRole('listitem');
    expect(within(steps()[0]!).getByLabelText('Not done yet')).toBeInTheDocument();

    playToEnd();
    expect(currentStageTitle()).toContain('JavaScript updates the DOM');
    expect(within(stageButtons()[4]!).getByText('Failed')).toBeInTheDocument();
    expect(within(stageButtons()[5]!).getByText('Not reached')).toBeInTheDocument();
    expect(within(steps()[0]!).getByLabelText('Done')).toBeInTheDocument();

    act(() => screen.getByRole('button', { name: /wp_ajax_nopriv_get_student_details/ }).click());
    expect(within(steps()[1]!).getByLabelText('Done')).toBeInTheDocument();
    expect(screen.getByText('Matches this request')).toBeInTheDocument();

    playToEnd();
    expect(within(steps()[2]!).getByLabelText('Done')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Fixed.');
  });

  it('previews dispatch from the same registry the simulation uses', () => {
    window.location.hash = '#/wordpress';
    render(<App />);

    expect(screen.getByText('→ true → ajax_lab_get_student_details()')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/action/), { target: { value: 'get_student' } });
    expect(screen.getByText("→ false → wp_die( '0', 400 )")).toBeInTheDocument();
    expect(screen.queryByText('Matches this request')).toBeNull();
  });

  it('shows where the run halted and why, using the server trace', () => {
    window.location.hash = '#/wordpress';
    render(<App />);

    fireEvent.change(screen.getByLabelText('Nonce'), { target: { value: 'missing' } });
    act(() => stageButtons()[5]!.click());
    expect(screen.getByText(/check_ajax_referer\( 'ajax_lab_nonce', 'nonce' \) failed: no nonce was sent/)).toBeInTheDocument();
    act(() => stageButtons()[7]!.click());
    expect(screen.getByText(/check_ajax_referer\(\) answered "-1" with HTTP 403/)).toBeInTheDocument();
  });
});

describe('WordPress mode in the AJAX Lab', () => {
  it('updates #student-result from the WordPress response', () => {
    window.location.hash = '#/';
    render(<App />);
    act(() => screen.getAllByRole('button', { name: 'WordPress' })[0]!.click());

    act(() => screen.getByRole('button', { name: 'Load student' }).click());
    for (let i = 0; i < 12; i++) act(() => vi.advanceTimersByTime(2_000));
    const result = screen.getByText('#student-result').parentElement!.parentElement!;
    expect(result).toHaveTextContent('Aarav Das');
  });
});

describe('Code Studio', () => {
  it('shows browser and server code side by side and follows the stage into admin-ajax.php', () => {
    window.location.hash = '#/code';
    render(<App />);
    act(() => screen.getAllByRole('button', { name: 'WordPress' })[0]!.click());

    const server = screen.getByRole('region', { name: 'Server (PHP)' });
    expect(screen.getByRole('region', { name: 'Browser (JavaScript)' })).toBeInTheDocument();

    const highlighted = () => [...server.querySelectorAll('[data-line].bg-accent-soft')].map((line) => line.textContent).join('\n');
    const showing = (label: string) => within(server).getByRole('button', { name: label }).getAttribute('aria-pressed') === 'true';

    // Hook name stage: only WordPress core has code for it, so the pane follows into admin-ajax.php.
    act(() => stageButtons()[3]!.click());
    expect(showing('admin-ajax.php')).toBe(true);
    expect(highlighted()).toContain("$action = $_REQUEST['action'];");

    // Auth branch: admin-ajax.php also has code here, so the pane stays and shows the logged-out branch.
    act(() => stageButtons()[4]!.click());
    expect(showing('admin-ajax.php')).toBe(true);
    expect(highlighted()).toContain('has_action( "wp_ajax_nopriv_{$action}" )');

    // Callback: only the plugin has code, so the pane follows back to ajax-lab.php.
    act(() => stageButtons()[5]!.click());
    expect(showing('ajax-lab.php')).toBe(true);
    expect(highlighted()).toContain("check_ajax_referer('ajax_lab_nonce', 'nonce');");
  });
});

describe('Security lab', () => {
  function openSecurityTab() {
    window.location.hash = '#/wordpress';
    render(<App />);
    act(() => screen.getByRole('tab', { name: 'Security lab' }).click());
  }
  const finish = () => {
    for (let i = 0; i < 12; i++) act(() => vi.advanceTimersByTime(2_000));
  };

  it('describes stored XSS with .html() without injecting any markup', () => {
    openSecurityTab();
    act(() => screen.getByRole('button', { name: /Stored HTML with \.html\(\)/ }).click());
    finish();
    expect(screen.getByText('Script would run (simulated)')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows the same stored HTML as inert text with .text()', () => {
    openSecurityTab();
    act(() => screen.getByRole('button', { name: /Stored HTML with \.text\(\)/ }).click());
    finish();
    expect(screen.getAllByText(`Mallory <img src=x onerror="alert('XSS')">`).length).toBeGreaterThan(0);
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows a private-data leak when the capability check is removed', () => {
    openSecurityTab();
    act(() => screen.getByRole('button', { name: /Remove the capability check/ }).click());
    finish();
    expect(screen.getByText('Private fields (email, grade) reached a user who is not allowed to see them.')).toBeInTheDocument();
  });

  it('refuses a subscriber with a valid nonce', () => {
    openSecurityTab();
    act(() => screen.getByRole('button', { name: /Nonce is not authorization/ }).click());
    finish();
    expect(screen.getAllByText('You are not allowed to view student records.').length).toBeGreaterThan(0);
  });
});

describe('Announcements', () => {
  it('announces stage changes on the WordPress Lab too, including skipped stages', () => {
    window.location.hash = '#/wordpress';
    render(<App />);
    fireEvent.change(screen.getByLabelText(/action/), { target: { value: '' } });
    act(() => stageButtons()[3]!.click());
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('Stage 4 of 8: Hook name from action. This stage did not run.');
  });
});
