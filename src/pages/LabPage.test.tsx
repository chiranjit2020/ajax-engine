import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { SCENARIOS, resolveSource } from '../data/scenarios';

function stageButtons() {
  return within(screen.getByRole('list', { name: 'Request lifecycle stages' })).getAllByRole('button');
}

function currentStageTitle() {
  return stageButtons().find((button) => button.getAttribute('aria-current') === 'step')?.textContent ?? null;
}

const nextButton = () => screen.getAllByRole('button', { name: /^Next$/ })[0]!;
const card = () => screen.getByText('#profile-card').closest('[aria-busy]') as HTMLElement;
const inspector = () => screen.getByRole('region', { name: 'Inspectors' });

beforeEach(() => {
  window.location.hash = '#/';
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('AJAX Lab workspace', () => {
  it('steps through stages with Next and Previous', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(currentStageTitle()).toBeNull();
    await user.click(nextButton());
    expect(currentStageTitle()).toContain('User action');
    await user.click(nextButton());
    await user.click(nextButton());
    expect(currentStageTitle()).toContain('HTTP request');
    await user.click(screen.getAllByRole('button', { name: /^Previous$/ })[0]!);
    expect(currentStageTitle()).toContain('JavaScript handler');
  });

  it('plays automatically when the playground button is clicked, updating the card only at the DOM stage', () => {
    vi.useFakeTimers();
    render(<App />);

    expect(within(card()).getByText('No profile loaded.')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Load Profile' }).click());
    expect(currentStageTitle()).toContain('User action');
    expect(screen.getByRole('button', { name: 'Load Profile' })).toBeDisabled();

    act(() => vi.advanceTimersByTime(700));
    expect(currentStageTitle()).toContain('JavaScript handler');
    expect(card()).toHaveAttribute('aria-busy', 'true');

    // Each stage's timer is scheduled after the previous render, so advance one stage per act().
    for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(2_000));
    expect(currentStageTitle()).toContain('JavaScript handles response');
    expect(within(card()).queryByText('Maya Chen')).toBeNull();

    act(() => vi.advanceTimersByTime(2_000));
    expect(currentStageTitle()).toContain('DOM update');
    expect(within(card()).getByText('Maya Chen')).toBeInTheDocument();
    expect(card()).toHaveAttribute('aria-busy', 'false');
    expect(screen.getByRole('button', { name: 'Load Profile' })).toBeEnabled();
  });

  it('stops playback cleanly when switching mode mid-run', () => {
    vi.useFakeTimers();
    render(<App />);

    act(() => screen.getByRole('button', { name: 'Play' }).click());
    act(() => vi.advanceTimersByTime(700));
    act(() => screen.getAllByRole('button', { name: 'WordPress' })[0]!.click());
    expect(screen.getByRole('button', { name: 'Load student' })).toBeInTheDocument();
    expect(currentStageTitle()).toBeNull();
    for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(2_000));
    expect(currentStageTitle()).toBeNull();

    act(() => screen.getAllByRole('button', { name: 'Standalone' })[0]!.click());
    expect(currentStageTitle()).toBeNull();
    for (let i = 0; i < 10; i++) act(() => vi.advanceTimersByTime(2_000));
    expect(currentStageTitle()).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('highlights the matching lines in every implementation and jumps to a stage from a code line', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = inspector();

    await user.click(stageButtons()[7]!);
    const highlighted = () =>
      [...within(panel).getByRole('tabpanel').querySelectorAll('[data-line].bg-accent-soft')].map((line) => line.textContent).join('\n');
    expect(highlighted()).toContain("card.querySelector('.name').textContent = profile.name;");

    await user.click(within(panel).getByRole('button', { name: 'jQuery.ajax()' }));
    expect(highlighted()).toContain("card.find('.name').text(profile.name);");

    await user.click(within(panel).getByRole('button', { name: 'XMLHttpRequest' }));
    expect(highlighted()).toContain("card.querySelector('.name').textContent = profile.name;");

    await user.click(within(panel).getAllByRole('button', { name: /go to stage “JavaScript handler”/ })[0]!);
    expect(currentStageTitle()).toContain('JavaScript handler');
    expect(highlighted()).toContain('new XMLHttpRequest()');
    expect(within(panel).getByText(/open\(\) configures it but sends nothing yet/)).toBeInTheDocument();
  });

  it('copies the cleaned source code, without stage markers', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<App />);

    await user.click(within(inspector()).getByRole('button', { name: 'Copy code' }));
    const fetchFile = SCENARIOS[0]!.code.find((file) => file.id === 'fetch')!;
    expect(writeText).toHaveBeenCalledWith(resolveSource(fetchFile, SCENARIOS[0]!.scenario.defaultInput).code);
    expect(writeText.mock.calls[0]![0]).not.toMatch(/@stage|@note|@end/);
  });

  it('only shows response data once the response has arrived', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = inspector();

    await user.click(within(panel).getByRole('tab', { name: 'Network' }));
    await user.click(stageButtons()[3]!);
    await user.click(within(panel).getByRole('button', { name: 'Response' }));
    expect(within(panel).getByText(/No response yet/)).toBeInTheDocument();

    await user.click(stageButtons()[5]!);
    expect(within(panel).getByText('{"id":7,"name":"Maya Chen","role":"Frontend Developer","location":"Singapore"}')).toBeInTheDocument();
    expect(within(panel).getByText(/Not parsed yet/)).toBeInTheDocument();
  });

  it('opens the request in the inspector when the request packet is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(stageButtons()[2]!);
    await user.click(screen.getAllByRole('button', { name: /^Request packet, in transit: GET \/api\/profile\?id=7/ })[0]!);
    const panel = inspector();
    expect(within(panel).getByRole('tab', { name: 'Network' })).toHaveAttribute('aria-selected', 'true');
    expect(within(panel).getByText('Query parameters')).toBeInTheDocument();
  });

  it('stops at the failing stage for a missing profile and explains why', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: /Profile/ }), '999');
    await user.click(stageButtons()[7]!);
    expect(currentStageTitle()).toContain('JavaScript handles response');
    expect(screen.getAllByText('The server responded with HTTP 404 Not Found.').length).toBeGreaterThan(0);
    expect(screen.getByText(/fetch\(\) does not reject for this on its own/)).toBeInTheDocument();
    expect(within(stageButtons()[7]!).getByText('Not reached')).toBeInTheDocument();
    expect(within(card()).getByText('Could not load the profile.')).toBeInTheDocument();
  });
});

describe('More standalone scenarios', () => {
  const choose = (title: string) =>
    act(() => {
      const select = screen.getAllByRole('combobox', { name: 'Scenario' })[0]! as HTMLSelectElement;
      const option = [...select.options].find((item) => item.text === title)!;
      fireEvent.change(select, { target: { value: option.value } });
    });
  const finish = () => {
    for (let i = 0; i < 12; i++) act(() => vi.advanceTimersByTime(2_000));
  };

  it('recovers from a transient network error on retry', () => {
    vi.useFakeTimers();
    render(<App />);
    choose('Failure and recovery');
    fireEvent.change(screen.getByLabelText('Simulated server condition'), { target: { value: 'network' } });
    act(() => screen.getByRole('button', { name: 'Load notifications' }).click());
    finish();
    expect(screen.getByText('You appear to be offline. Try again.')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: /Try again/ }).click());
    finish();
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
    expect(screen.getByText(/Attempt 2\./)).toBeInTheDocument();
  });

  it('shows field errors from a 422 response', () => {
    vi.useFakeTimers();
    render(<App />);
    choose('Submit a form (POST)');
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    act(() => screen.getByRole('button', { name: 'Register' }).click());
    finish();
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows stale search results when cancellation is off, and correct ones when on', () => {
    vi.useFakeTimers();
    render(<App />);
    choose('Live search (GET)');
    act(() => screen.getByRole('button', { name: 'Pause typing (search)' }).click());
    finish();
    const results = () => screen.getByText('#results').closest('[aria-busy]') as HTMLElement;
    expect(within(results()).getByText('Cat bed')).toBeInTheDocument();
    expect(within(results()).queryByText('Camera')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: /Cancel outdated requests/ }));
    act(() => screen.getByRole('button', { name: 'Pause typing (search)' }).click());
    finish();
    expect(within(results()).getByText(/arrived after the one for “cat” and replaced it/)).toBeInTheDocument();
    expect(within(results()).getByText('Camera')).toBeInTheDocument();
  });

  it('confirms before deleting, then removes the row after a 204', () => {
    vi.useFakeTimers();
    render(<App />);
    choose('Delete a record (DELETE)');
    act(() => screen.getAllByRole('button', { name: 'Delete' })[1]!.click());
    const dialog = screen.getByRole('alertdialog', { name: 'Delete Review pull request?' });
    act(() => within(dialog).getByRole('button', { name: 'Delete' }).click());
    finish();
    expect(screen.queryByText('Review pull request')).toBeNull();
    expect(screen.getByText('Write tests')).toBeInTheDocument();
  });

  it('loads pages until there are no more', () => {
    vi.useFakeTimers();
    render(<App />);
    choose('Load more content (pagination)');
    act(() => screen.getByRole('button', { name: /Load more/ }).click());
    finish();
    expect(screen.getByText('Debouncing input')).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: /Load more/ }).click());
    finish();
    expect(screen.getByText('Nonces and capabilities')).toBeInTheDocument();
    expect(screen.getByText('No more articles.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Load more/ })).toBeNull();
  });

  it('shows the value the server saved after a PATCH', () => {
    vi.useFakeTimers();
    render(<App />);
    choose('Update a record (PATCH)');
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Principal Engineer' } });
    act(() => screen.getByRole('button', { name: 'Save' }).click());
    finish();
    expect(screen.getByText('#profile-card').closest('div')!.parentElement).toHaveTextContent('Principal Engineer');
  });
});

describe('Real Request mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stays in simulation until an origin is entered and acknowledged, then sends one real request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('{"id":7,"name":"From a real server","role":"Tester"}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText(/Execution: simulation/));
    await user.click(screen.getByRole('button', { name: 'Real request' }));
    await user.type(screen.getByLabelText('Server origin'), 'http://localhost:8080');
    await user.click(nextButton());
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('checkbox', { name: /I understand this sends a real HTTP request/ }));
    expect(screen.getByText('Real Request mode is on. Press Play to send.')).toBeInTheDocument();
    await user.click(nextButton());
    await screen.findByText('Real request', { selector: 'span' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toBe('http://localhost:8080/api/profile?id=7');

    // Stepping through the same run never sends the request again.
    await user.click(stageButtons()[7]!);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(within(card()).getByText('From a real server')).toBeInTheDocument();

    await user.click(stageButtons()[4]!);
    expect(screen.getByText(/A real server is handling this request/)).toBeInTheDocument();
  });

  it('reports a failed real request without inventing a response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByText(/Execution: simulation/));
    await user.click(screen.getByRole('button', { name: 'Real request' }));
    await user.type(screen.getByLabelText('Server origin'), 'http://localhost:9');
    await user.click(screen.getByRole('checkbox', { name: /I understand/ }));
    await user.click(stageButtons()[7]!);
    await screen.findAllByText(/it may not allow requests from this page’s origin \(CORS\)/);
    expect(within(stageButtons()[5]!).getByText('Failed')).toBeInTheDocument();
  });
});
