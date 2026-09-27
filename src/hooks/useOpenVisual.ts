import { useNavigate } from 'react-router';
import { useSimulation } from '../app/providers/SimulationProvider';
import type { VisualLink } from '../data/learning/types';

/** Open a scenario in the state a lesson or challenge describes, then go to the right page. */
export function useOpenVisual() {
  const { applyPreset } = useSimulation();
  const navigate = useNavigate();
  return (link: VisualLink) => {
    applyPreset(link.scenarioId, link.preset, link.stage === undefined ? { play: true } : { stage: link.stage });
    navigate(link.route ?? '/');
  };
}
