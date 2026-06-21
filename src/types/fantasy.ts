import type { ScoringWeights, LeagueSettings } from "@/context/FantasyContext";

// Re-exported for convenience so consumers can import everything fantasy-
// related from one place if they want to, without creating a second source
// of truth — these are just pass-throughs from FantasyContext.
export type { ScoringWeights, LeagueSettings };

// ---------------------------------------------------------------------------
// Response shapes — mirror the dicts returned by main.py's pagination/
// groupby logic. Field names match the backend exactly (snake_case where
// the backend uses snake_case) since these are deserialized directly from
// JSON with no remapping layer.
// ---------------------------------------------------------------------------

// GET-by-POST result row from /{season}/players/fantasy-scores and
// /{season}/players/fantasy-scores/date-range (see `grouped` in main.py).
export interface BasePlayerRecord {
  PLAYER_ID: number;
  PLAYER_NAME: string;
  games_played: number;
  total_fantasy_pts: number;
  avg_fantasy_pts: number;
}

// Result row from /{season}/players/precision-auction-values
// (see `final_player_pool` in main.py).
export interface PlayerAuctionRecord {
  PLAYER_ID: number;
  PLAYER_NAME: string;
  total_weighted_points: number;
  total_accumulated_vorp: number;
  adjusted_vorp: number;
  auction_value: number;
}

// Mirrors PrecisionAuctionConfig in main.py. Composed from the context's
// LeagueSettings + weights rather than redeclared field-by-field, so the
// two can't drift apart.
export interface AuctionConfig extends LeagueSettings {
  weights: ScoringWeights;
}

// Mirrors the `paginate()` helper's return shape in main.py — used by
// every paginated endpoint.
export interface PaginatedResponse<T> {
  total: number;
  offset: number;
  limit: number;
  data: T[];
}