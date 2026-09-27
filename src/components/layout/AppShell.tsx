import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { NAV_ITEMS } from '../../app/navigation';
import { StageAnnouncer } from '../visualizer/StageAnnouncer';
import { ThemeToggle } from './ThemeToggle';
import { WorkspaceToolbar } from './WorkspaceToolbar';

function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="7" className="fill-accent" />
        <path
          d="M8 12h13l-4-4M24 20H11l4 4"
          className="stroke-on-accent"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      AJAX Lab
    </span>
  );
}

function NavLinks({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  return (
    <ul className={compact ? 'flex flex-col gap-1' : 'flex flex-col gap-0.5'}>
      {NAV_ITEMS.map(({ path, label, short, icon: Icon }) => (
        <li key={path}>
          <NavLink
            to={path}
            end={path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              compact
                ? `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium ${isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-text'}`
                : `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-accent-soft text-accent' : 'text-text hover:bg-surface-2'}`
            }
          >
            <Icon size={compact ? 18 : 17} aria-hidden />
            {compact ? <span>{short}</span> : label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="grid size-9 place-items-center rounded-lg text-text hover:bg-surface-2 md:hidden"
      >
        <Menu size={20} aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialogRef.current && setOpen(false)}
        aria-label="Navigation"
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-line bg-surface p-0 text-text backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="grid size-9 place-items-center rounded-lg hover:bg-surface-2"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <nav aria-label="Primary" className="p-3">
          <NavLinks compact={false} onNavigate={() => setOpen(false)} />
        </nav>
      </dialog>
    </>
  );
}

export function AppShell() {
  const { pathname } = useLocation();
  const onWorkspace = pathname === '/';

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <a
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-20 shrink-0 flex-col items-center gap-4 border-r border-line bg-surface py-3 md:flex">
        <span className="sr-only">AJAX Lab</span>
        <nav aria-label="Primary" className="w-full px-2">
          <NavLinks compact />
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-4">
          <MobileMenu />
          <Logo />
          <p className="hidden text-sm text-muted 2xl:block">See every request. Understand every response.</p>
          <div className="ml-auto flex items-center gap-3">
            {onWorkspace && (
              <div className="hidden lg:block">
                <WorkspaceToolbar />
              </div>
            )}
            <ThemeToggle />
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none">
          <Outlet />
        </main>
        <StageAnnouncer />
      </div>
    </div>
  );
}
