"use client";

import { useQuery } from "@tanstack/react-query";
import type { ScoringWeights, DateRangeState, Season } from "@/context/FantasyContext";
import type { PaginatedResponse, BasePlayerRecord } from "../types/fantasy";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Structurally compatible with FantasyContext's (unexported) FantasyConfigSnapshot.
// Extra fields like leagueSettings on the real object are fine — TS allows
// assigning objects with excess properties to a narrower interface as long
// as it's not an inline literal.
export interface LeaderboardSnapshot {
  season: Season;
  weights: ScoringWeights;
  dateRange: DateRangeState;
}

export interface UseLeaderboardParams {
  appliedConfig: LeaderboardSnapshot | null;
  generationCount: number;
  limit: number;
  offset: number;
  sortBy: "total" | "avg";
}

async function fetchLeaderboard(
  config: LeaderboardSnapshot,
  limit: number,
  offset: number,
  sortBy: "total" | "avg",
): Promise<PaginatedResponse<BasePlayerRecord>> {
  const { season, weights, dateRange } = config;
  const isDateRange = Boolean(dateRange.startDate && dateRange.endDate);

  const path = isDateRange
    ? `/${season}/players/fantasy-scores/date-range`
    : `/${season}/players/fantasy-scores`;

  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("sort_by", sortBy);

  const body = isDateRange
    ? { start_date: dateRange.startDate, end_date: dateRange.endDate, weights }
    : weights;

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.detail ?? `Request failed (${res.status})`);
  }

  return res.json();
}

export function useLeaderboard(params: UseLeaderboardParams) {
  const { appliedConfig, generationCount, limit, offset, sortBy } = params;

  return useQuery({
    queryKey: [
      "leaderboard",
      generationCount,
      appliedConfig?.season,
      appliedConfig?.weights,
      appliedConfig?.dateRange,
      limit,
      offset,
      sortBy,
    ],
    queryFn: () =>
      fetchLeaderboard(appliedConfig as LeaderboardSnapshot, limit, offset, sortBy),
    enabled: Boolean(appliedConfig),
    placeholderData: (prev) => prev,
  });
}