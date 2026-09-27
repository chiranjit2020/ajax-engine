import type { ComponentType } from 'react';
import { FailurePlayground } from './standalone/FailurePlayground';
import { FormPlayground } from './standalone/FormPlayground';
import { DeletePlayground, LoadMorePlayground, SearchPlayground, UpdatePlayground } from './standalone/MorePlaygrounds';
import { ProfilePlayground } from './standalone/load-profile/ProfilePlayground';
import { SecurityPlayground } from './wordpress/SecurityLab';
import { StudentPlayground } from './wordpress/StudentPlayground';

/** Interactive mini-page for each scenario, keyed by scenario ID. */
export const PLAYGROUNDS: Record<string, ComponentType> = {
  'load-profile': ProfilePlayground,
  'live-search': SearchPlayground,
  'submit-form': FormPlayground,
  'update-record': UpdatePlayground,
  'delete-record': DeletePlayground,
  'load-more': LoadMorePlayground,
  'failure-recovery': FailurePlayground,
  'wp-student-details': StudentPlayground,
  'wp-security-lab': SecurityPlayground,
};
