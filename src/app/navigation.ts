import { BookMarked, BookOpen, Code2, FlaskConical, Network, Trophy, Workflow, type LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  /** Short label for the compact rail. */
  short: string;
  icon: LucideIcon;
  description: string;
}

/** Seven primary modules. The Lab workspace is the visualizer (spec §4, merged per Phase 1). */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'AJAX Lab', short: 'Lab', icon: FlaskConical, description: 'Run a request and watch every stage of its lifecycle.' },
  { path: '/learn', label: 'Learn', short: 'Learn', icon: BookOpen, description: 'Structured lessons from first principles to professional practice.' },
  { path: '/code', label: 'Code Studio', short: 'Code', icon: Code2, description: 'Follow one request through browser JavaScript and server PHP.' },
  { path: '/network', label: 'Network Inspector', short: 'Network', icon: Network, description: 'Headers, payloads, status codes, and timing for the active request.' },
  { path: '/wordpress', label: 'WordPress Lab', short: 'WP Lab', icon: Workflow, description: 'admin-ajax.php, action hooks, nonces, and capabilities.' },
  { path: '/challenges', label: 'Quiz & Challenges', short: 'Quiz', icon: Trophy, description: 'Predict, trace, debug, and secure requests.' },
  { path: '/reference', label: 'Quick Reference', short: 'Ref', icon: BookMarked, description: 'Methods, hooks, status codes, and common errors.' },
];
