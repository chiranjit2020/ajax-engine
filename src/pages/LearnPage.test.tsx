import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../app/App';
import { LESSONS } from '../data/learning/lessons';

beforeEach(() => {
  window.localStorage.clear();
});

/** The learning pages are lazy-loaded, so wait for the page heading before querying. */
async function renderAt(hash: string) {
  window.location.hash = hash;
  render(<App />);
  await screen.findByRole('heading', { level: 1 });
}

async function passCheck(user: ReturnType<typeof userEvent.setup>, lessonId: string) {
  const lesson = LESSONS.find((item) => item.id === lessonId)!;
  act(() => {
    window.location.hash = `#/learn/${lessonId}`;
  });
  // Wait for this lesson (not the previous one) to render.
  await screen.findByRole('heading', { level: 1, name: new RegExp(lesson.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) });
  const part = screen.getByRole('region', { name: /Check your understanding/ });
  await user.click(within(part).getByRole('radio', { name: lesson.check.options[lesson.check.answer]!.text }));
  await user.click(within(part).getByRole('button', { name: 'Check answer' }));
  expect(within(part).getByRole('status')).toHaveTextContent('Correct.');
}

describe('Learn', () => {
  it('completes lessons through their knowledge check and unlocks the next level', async () => {
    const user = userEvent.setup();
    await renderAt('#/learn');

    expect(screen.getByText('Complete 3 lessons in Level 1 to unlock this level.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuenow', '0');

    for (const id of ['what-is-ajax', 'reload-vs-async', 'client-server']) await passCheck(user, id);

    act(() => {
      window.location.hash = '#/learn';
    });
    expect(await screen.findByRole('progressbar', { name: 'Lessons completed' })).toHaveAttribute('aria-valuenow', '3');
    expect(screen.queryByText('Complete 3 lessons in Level 1 to unlock this level.')).toBeNull();
    expect(screen.getByRole('link', { name: /XMLHttpRequest and readyState/ })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('ajax-lab:progress')!).lessons).toHaveProperty('what-is-ajax');
  });

  it('explains a wrong answer and allows another try', async () => {
    const user = userEvent.setup();
    await renderAt('#/learn/what-is-ajax');

    const part = screen.getByRole('region', { name: /Check your understanding/ });
    await user.click(within(part).getByRole('radio', { name: 'It only works on WordPress sites.' }));
    await user.click(within(part).getByRole('button', { name: 'Check answer' }));
    expect(within(part).getByRole('status')).toHaveTextContent('Any website can use AJAX');
    await user.click(within(part).getByRole('button', { name: 'Try again' }));
    expect(within(part).getByRole('button', { name: 'Check answer' })).toBeInTheDocument();
  });

  it('opens the simulator in the state a lesson describes', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      'ajax-lab:progress',
      JSON.stringify({ lessons: { 'what-is-ajax': {}, 'reload-vs-async': {}, 'client-server': {} }, challenges: {} }),
    );
    await renderAt('#/learn/fetch-promises');

    await user.click(screen.getByRole('button', { name: 'Show me visually' }));
    expect(window.location.hash).toBe('#/');
    const stages = within(await screen.findByRole('list', { name: 'Request lifecycle stages' })).getAllByRole('button');
    expect(stages.find((button) => button.getAttribute('aria-current') === 'step')).toHaveTextContent('JavaScript handles response');
    expect(screen.getByRole('combobox', { name: /Profile/ })).toHaveValue('999');
  });

  it('keeps later levels locked when opened directly', async () => {
    await renderAt('#/learn/build-feature');
    expect(screen.getByText(/Complete 3 lessons in Level 3 to unlock it/)).toBeInTheDocument();
  });
});

describe('Challenges', () => {
  it('checks an ordering task and records the attempt', async () => {
    const user = userEvent.setup();
    await renderAt('#/challenges');

    const challenge = screen.getByText('A standalone AJAX request').closest('details')!;
    challenge.open = true;
    await user.click(within(challenge).getByRole('button', { name: 'Check answer' }));
    expect(within(challenge).getByRole('status')).toHaveTextContent(/items are in the wrong place/);
    expect(JSON.parse(window.localStorage.getItem('ajax-lab:progress')!).challenges['trace-standalone']).toEqual({ attempts: 1, solved: false });

    // Solve it with the move buttons: repeatedly move each expected item up into place.
    const expected = ['User action', 'JavaScript handler', 'HTTP request', 'Server receives request', 'Server-side processing', 'HTTP response', 'JavaScript handles response', 'DOM update'];
    await user.click(within(challenge).getByRole('button', { name: 'Try again' }));
    for (let target = 0; target < expected.length; target++) {
      const order = () => within(within(challenge).getByRole('list', { name: 'Items to order' })).getAllByRole('listitem').map((item) => item.textContent);
      while (!order()[target]!.includes(expected[target]!)) {
        fireEvent.click(within(challenge).getByRole('button', { name: `Move “${expected[target]}” up` }));
      }
    }
    await user.click(within(challenge).getByRole('button', { name: 'Check answer' }));
    expect(within(challenge).getByRole('status')).toHaveTextContent('Correct.');
    expect(screen.getByRole('progressbar', { name: 'Challenges solved' })).toHaveAttribute('aria-valuenow', '1');
    // Many individual move clicks: allow extra time when the whole suite runs in parallel.
  }, 15_000);

  it('shows debugging evidence from a real simulated run', async () => {
    await renderAt('#/challenges');
    const challenge = screen.getByText('A single “0”').closest('details')!;
    expect(within(challenge).getAllByText(/HTTP\/1\.1 400 Bad Request/).length).toBeGreaterThan(0);
    // Only what browser DevTools could show — server-side notes would give the answer away.
    expect(challenge.textContent).not.toMatch(/has_action|only used for logged-in|callback never ran/);
  });
});

describe('Quick Reference', () => {
  it('filters entries by search', async () => {
    await renderAt('#/reference');
    fireEvent.change(screen.getByLabelText('Search the reference'), { target: { value: 'nonce' } });
    expect(screen.getByText("check_ajax_referer( $action, 'nonce' )")).toBeInTheDocument();
    expect(screen.queryByText('201 Created')).toBeNull();
  });
});
