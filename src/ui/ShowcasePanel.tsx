import { Pause, Play, X, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { AtlasCopy } from '../shared/i18n/atlas.js';
import type { useShowcase } from './useShowcase.js';

const labels = {
  overview: 'showcaseOverview',
  river: 'showcaseRiver',
  water: 'showcaseWater',
  compare: 'showcaseCompare',
  transition: 'showcaseTransition',
  history: 'showcaseHistory',
  finish: 'showcaseFinish',
} as const;
export default function ShowcasePanel({
  showcase,
  copy,
  reduced,
  ready,
  level,
  year,
  onExplore,
}: {
  showcase: ReturnType<typeof useShowcase>;
  copy: AtlasCopy;
  reduced: boolean;
  ready: boolean;
  level: number;
  year: number;
  onExplore: () => void;
}) {
  const icon = { size: 18, strokeWidth: 1.5, 'aria-hidden': true as const };
  const finished = showcase.stage === 'finish';
  const primary = useRef<HTMLButtonElement>(null);
  const exit = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      (primary.current?.disabled ? exit.current : primary.current)?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <>
      <div className="showcase-heading">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>Fault &amp; Flow</h2>
        <p>
          {copy.flow} · {copy.fault}
        </p>
      </div>
      <aside
        className="showcase-panel"
        aria-label={copy.showcase}
        data-testid="showcase-panel"
      >
        <div className="showcase-stage">
          <strong aria-live="polite">{copy[labels[showcase.stage]]}</strong>
          <p>
            {showcase.failed
              ? copy.showcaseFailed
              : !ready
                ? copy.showcaseLoading
                : showcase.stage === 'water' || showcase.stage === 'compare'
                  ? `${copy.level}: ${level.toFixed(1)} m · ${copy.scenarioNote}`
                  : showcase.stage === 'history' || finished
                    ? `${copy.year}: ${year} · ${copy.noPrediction}`
                    : copy.disclaimer}
          </p>
        </div>
        <div className="showcase-actions">
          <button
            ref={primary}
            className="primary-button"
            type="button"
            disabled={showcase.failed || (reduced && !ready)}
            onClick={
              finished ? onExplore : reduced ? showcase.next : showcase.togglePause
            }
          >
            {finished ? (
              <>
                {copy.showcaseExplore}
                <ArrowUpRight {...icon} />
              </>
            ) : reduced ? (
              copy.showcaseNext
            ) : (
              <>
                {showcase.paused ? <Play {...icon} /> : <Pause {...icon} />}{' '}
                {showcase.paused ? copy.showcaseResume : copy.showcasePause}
              </>
            )}
          </button>
          {finished && (
            <button className="text-button" type="button" onClick={showcase.start}>
              {copy.showcaseReplay}
            </button>
          )}
          <button
            ref={exit}
            className="icon-button"
            type="button"
            onClick={() => showcase.stop()}
            aria-label={copy.showcaseSkip}
          >
            <X {...icon} />
          </button>
        </div>
      </aside>
    </>
  );
}
