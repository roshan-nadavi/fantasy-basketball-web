"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

// ---------------------------------------------------------------------------
// Types — mirrored 1:1 from the FastAPI Pydantic models in main.py
// ---------------------------------------------------------------------------

export interface ScoringWeights {
  FGM: number;
  FGA: number;
  FG3M: number;
  FG3A: number;
  FTM: number;
  FTA: number;
  OREB: number;
  DREB: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TOV: number;
  PF: number;
  PTS: number;
}

// Defaults taken directly from `class ScoringWeights(BaseModel)` in main.py,
// with user-specified overrides applied.
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  FGM: 2,
  FGA: -1,
  FG3M: 1,
  FG3A: 0,
  FTM: 1,
  FTA: -1,
  OREB: 0,
  DREB: 0,
  REB: 1,
  AST: 2,
  STL: 4,
  BLK: 4,
  TOV: -2,
  PF: 0,
  PTS: 1,
};

export interface DateRangeState {
  // "YYYY-MM-DD" strings matching DateRangeScoringRequest, or null when the
  // user hasn't picked a range yet (falls back to the base endpoint).
  startDate: string | null;
  endDate: string | null;
}

// Mirrors PrecisionAuctionConfig, minus `weights` (tracked separately above
// since it's reused by the base leaderboard endpoints too).
export interface LeagueSettings {
  regular_weeks: number;
  playoff_weeks: number;
  post_season_weightage: number;
  num_teams: number;
  roster_size: number;
  total_budget_per_team: number;
}

export const DEFAULT_LEAGUE_SETTINGS: LeagueSettings = {
  regular_weeks: 20,
  playoff_weeks: 3,
  post_season_weightage: 2.5,
  num_teams: 10,
  roster_size: 13,
  total_budget_per_team: 200.0,
};

// Seasons available on disk, derived from the parquet filenames the backend
// loads at startup. Keys must match the `season_key` the backend builds via
// f"{parts[1]}_{parts[2]}" in main.py's lifespan handler.
export const AVAILABLE_SEASONS = ["2025-26", "2024-25", "2023-24","2022-23"] as const;
export type Season = (typeof AVAILABLE_SEASONS)[number];

const DEFAULT_SEASON: Season = "2025-26";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface FantasyConfigSnapshot {
  season: Season;
  weights: ScoringWeights;
  dateRange: DateRangeState;
  leagueSettings: LeagueSettings;
}

interface FantasyContextValue {
  // ---- Live, editable draft values — bind form inputs directly to these.
  season: Season;
  setSeason: (season: Season) => void;

  weights: ScoringWeights;
  setWeight: (stat: keyof ScoringWeights, value: number) => void;
  setWeights: (weights: ScoringWeights) => void;
  resetWeights: () => void;

  dateRange: DateRangeState;
  setDateRange: (range: DateRangeState) => void;
  clearDateRange: () => void;

  leagueSettings: LeagueSettings;
  setLeagueSetting: <K extends keyof LeagueSettings>(
    key: K,
    value: LeagueSettings[K]
  ) => void;
  setLeagueSettings: (settings: LeagueSettings) => void;

  // ---- Fetch initialization toggle ----------------------------------------
  // Draft state above can be freely edited (sliders dragged, dates picked)
  // without firing any network request. Calling `generate()` snapshots the
  // current draft into `appliedConfig` and bumps `generationCount`.
  //
  // Pages should derive their TanStack Query `queryKey` / `enabled` flag
  // from `appliedConfig` + `generationCount` — NOT from the live draft
  // state — so typing in a weight field doesn't trigger a refetch on every
  // keystroke. The "Generate" button just calls `generate()`.
  appliedConfig: FantasyConfigSnapshot | null;
  generationCount: number;
  generate: () => void;
}

const FantasyContext = createContext<FantasyContextValue | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FantasyProvider({ children }: { children: ReactNode }) {
  const [season, setSeason] = useState<Season>(DEFAULT_SEASON);
  const [weights, setWeights] = useState<ScoringWeights>(
    DEFAULT_SCORING_WEIGHTS
  );
  const [dateRange, setDateRange] = useState<DateRangeState>({
    startDate: null,
    endDate: null,
  });
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings>(
    DEFAULT_LEAGUE_SETTINGS
  );

  const [appliedConfig, setAppliedConfig] =
    useState<FantasyConfigSnapshot | null>(null);
  const [generationCount, setGenerationCount] = useState(0);

  const setWeight = useCallback(
    (stat: keyof ScoringWeights, value: number) => {
      setWeights((prev) => ({ ...prev, [stat]: value }));
    },
    []
  );

  const resetWeights = useCallback(() => {
    setWeights(DEFAULT_SCORING_WEIGHTS);
  }, []);

  const clearDateRange = useCallback(() => {
    setDateRange({ startDate: null, endDate: null });
  }, []);

  const setLeagueSetting = useCallback(
    <K extends keyof LeagueSettings>(key: K, value: LeagueSettings[K]) => {
      setLeagueSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const generate = useCallback(() => {
    setAppliedConfig({ season, weights, dateRange, leagueSettings });
    setGenerationCount((c) => c + 1);
  }, [season, weights, dateRange, leagueSettings]);

  const value = useMemo<FantasyContextValue>(
    () => ({
      season,
      setSeason,
      weights,
      setWeight,
      setWeights,
      resetWeights,
      dateRange,
      setDateRange,
      clearDateRange,
      leagueSettings,
      setLeagueSetting,
      setLeagueSettings,
      appliedConfig,
      generationCount,
      generate,
    }),
    [
      season,
      weights,
      setWeight,
      resetWeights,
      dateRange,
      clearDateRange,
      leagueSettings,
      setLeagueSetting,
      appliedConfig,
      generationCount,
      generate,
    ]
  );

  return (
    <FantasyContext.Provider value={value}>{children}</FantasyContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFantasyConfig(): FantasyContextValue {
  const ctx = useContext(FantasyContext);
  if (!ctx) {
    throw new Error("useFantasyConfig must be used within a FantasyProvider");
  }
  return ctx;
}