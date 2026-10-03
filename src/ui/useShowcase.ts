import { useEffect, useRef, useState } from 'react';
import type { AtlasPresentation } from '../shared/atlas.js';
import { CATALOGUE_END_YEAR } from '../shared/catalogue.js';
import { SHOWCASE_STAGES, showcaseFrame, showcaseRecord } from '../shared/showcase.js';
import catalogue from '../data/earthquakes.json';
import districts from '../data/districts.json';
import type { TerrainViewController } from './terrain/useTerrainView.js';

type Options = {
  view: TerrainViewController;
  atlas: AtlasPresentation;
  setAtlas: (
    next: AtlasPresentation | ((previous: AtlasPresentation) => AtlasPresentation),
  ) => void;
  level: number;
  inflow: number;
  reduced: boolean;
  onBegin: () => void;
  onExit: () => void;
};

/** Opt-in orchestration through the existing typed engine API. No scene internals. */
export function useShowcase(options: Options) {
  const current = useRef(options);
  current.current = options;
  const original = useRef<{
    atlas: AtlasPresentation;
    area: TerrainViewController['areaId'];
    speed: number;
  } | null>(null);
  const applied = useRef<string | null>(null);
  const clock = useRef(0);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [preparedStage, setPreparedStage] = useState<string | null>(null);
  const frame = showcaseFrame(elapsed ?? 0);
  const active = elapsed !== null;
  const ready = options.view.state.status.phase === 'ready';
  const failed =
    options.view.state.status.phase === 'error' ||
    !!options.view.fatal ||
    options.view.water?.supported === false;

  function stop(restore = true) {
    const { view, setAtlas, onExit } = current.current;
    view.setWaterPlaying(false);
    view.setWaterOn(false);
    if (original.current) {
      view.setWaterSpeed(original.current.speed);
      if (restore) {
        setAtlas(original.current.atlas);
        view.setArea(original.current.area);
      }
    }
    applied.current = null;
    setPreparedStage(null);
    setElapsed(null);
    onExit();
  }
  const stopRef = useRef(stop);
  stopRef.current = stop;

  function start() {
    const { view, atlas, reduced, onBegin } = current.current;
    if (!active)
      original.current = { atlas, area: view.areaId, speed: view.water?.speed ?? 60 };
    applied.current = null;
    setPreparedStage(null);
    clock.current = 0;
    setPaused(reduced);
    setElapsed(0);
    onBegin();
  }

  useEffect(() => {
    if (!active || !ready || applied.current === frame.stage) return;
    const { view, setAtlas, level, inflow, reduced } = current.current;
    const area =
      frame.stage === 'water' || frame.stage === 'compare' ? 'majuli' : 'assam-overview';
    if (view.areaId !== area) {
      view.setArea(area);
      return;
    }
    if (view.state.status.phase !== 'ready' || view.state.status.areaId !== area) return;
    applied.current = frame.stage;
    if (frame.stage === 'overview') {
      view.setWaterOn(false);
      setAtlas((a) => ({
        ...a,
        mode: 'flow',
        selectedDistrict: null,
        selectedQuake: null,
        sectionOpen: false,
        comparison: false,
        flowView: 'surface',
        districts: true,
        places: false,
        rivers: true,
        boundaries: true,
      }));
      view.resetCamera();
    } else if (frame.stage === 'river') {
      const anchor = districts.districts.find((d) => d.name === 'Majuli');
      if (anchor) {
        view.focusLocation(anchor.longitude, anchor.latitude);
        view.zoomView(1.8);
      }
      setAtlas((a) => ({ ...a, districts: false }));
    } else if (frame.stage === 'water') {
      view.setWaterLevel(level);
      view.setWaterDischarge(inflow);
      view.setWaterOn(true);
      view.setWaterSpeed(60);
      view.setWaterPlaying(!reduced && !paused);
      setAtlas((a) => ({ ...a, comparison: false }));
    } else if (frame.stage === 'compare') {
      view.setWaterPlaying(false);
      setAtlas((a) => ({
        ...a,
        comparison: true,
        comparisonPosition: reduced ? 0.5 : 0.95,
      }));
    } else if (frame.stage === 'transition') {
      view.setWaterOn(false);
      setAtlas((a) => ({
        ...a,
        mode: 'fault',
        comparison: false,
        quakeYear: 1900,
        selectedQuake: null,
        minimumMagnitude: 5,
      }));
    } else if (frame.stage === 'history' && reduced) {
      setAtlas((a) => ({
        ...a,
        quakeYear: CATALOGUE_END_YEAR,
        selectedQuake: showcaseRecord(catalogue.events, CATALOGUE_END_YEAR)?.id ?? null,
      }));
    } else if (frame.stage === 'finish') {
      setAtlas((a) => ({ ...a, quakeYear: CATALOGUE_END_YEAR, districts: true }));
      setPaused(true);
    }
    setPreparedStage(frame.stage);
  }, [active, ready, options.view.areaId, frame.stage, paused]);

  useEffect(() => {
    if (!active || paused || options.reduced || failed) return;
    let request = 0;
    let previous = 0;
    let painted = 0;
    const advance = (now: number) => {
      const { view, setAtlas } = current.current;
      const step = showcaseFrame(clock.current);
      if (
        previous &&
        view.state.status.phase === 'ready' &&
        applied.current === step.stage
      ) {
        clock.current += Math.min(250, now - previous);
        const next = showcaseFrame(clock.current);
        if (now - painted >= 80 || next.stage !== step.stage) {
          painted = now;
          setElapsed(clock.current);
          if (next.stage === 'compare')
            setAtlas((a) => ({ ...a, comparisonPosition: next.comparison }));
          if (next.stage === 'history')
            setAtlas((a) => ({
              ...a,
              quakeYear: next.year,
              selectedQuake: showcaseRecord(catalogue.events, next.year)?.id ?? null,
            }));
        }
      }
      previous = now;
      request = requestAnimationFrame(advance);
    };
    request = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(request);
  }, [active, paused, options.reduced, failed]);

  useEffect(() => {
    if (!active) return;
    options.view.setWaterPlaying(!paused && !options.reduced && frame.stage === 'water');
  }, [active, paused, options.reduced, frame.stage, options.view.setWaterPlaying]);

  useEffect(() => {
    if (!active) return;
    const hidden = () => {
      if (document.hidden) setPaused(true);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopRef.current();
    };
    const navigate = () => stopRef.current(false);
    document.addEventListener('visibilitychange', hidden);
    document.addEventListener('keydown', escape);
    window.addEventListener('popstate', navigate);
    return () => {
      document.removeEventListener('visibilitychange', hidden);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('popstate', navigate);
    };
  }, [active]);
  useEffect(() => () => current.current.view.setWaterPlaying(false), []);

  return {
    active,
    paused,
    failed,
    sceneReady: ready && preparedStage === frame.stage,
    stage: frame.stage,
    index: frame.index,
    start,
    stop,
    togglePause: () => setPaused((value) => !value),
    next: () => {
      const next = SHOWCASE_STAGES[frame.index + 1];
      if (next) {
        clock.current = next.start;
        setElapsed(next.start);
      }
    },
  };
}
