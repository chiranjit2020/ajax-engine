import type { ComponentType } from 'react';
import type { Execution, StageId } from '../engine/types';
import { AuthBranches, dispatchFromExecution, HookNameFormula } from './wordpress/DispatchVisuals';

interface StageDetailsProps {
  execution: Execution;
  input: unknown;
}

/** Extra visual explanations for particular stages, shown above the stage data. */
export const STAGE_DETAILS: Record<StageId, ComponentType<StageDetailsProps>> = {
  'wp-hook-dispatch': ({ execution, input }) => <HookNameFormula result={dispatchFromExecution(execution, input)} />,
  'wp-auth-branch': ({ execution, input }) => <AuthBranches result={dispatchFromExecution(execution, input)} />,
};
