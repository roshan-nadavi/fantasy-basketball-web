"use client";

import { useQuery } from "@tanstack/react-query";
import type { ScoringWeights, LeagueSettings, Season } from "@/context/FantasyContext";
import type { PaginatedResponse, PlayerAuctionRecord, AuctionConfig } from "@/types/fantasy";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Structurally compatible with FantasyContext's FantasyConfigSnapshot —
// dateRange is simply unused/ignored here since the auction endpoint
// doesn't accept it.
export interface AuctionSnapshot {
  season: Season;
  weights: ScoringWeights;
  leagueSettings: LeagueSettings;
}

export interface UseAuctionValuesParams {
  appliedConfig: AuctionSnapshot | null;
  generationCount: number;
  limit: number;
  offset: number;
}

async function fetchAuctionValues(
  config: AuctionSnapshot,
  limit: number,
  offset: number,
): Promise<PaginatedResponse<PlayerAuctionRecord>> {
  const { season, weights, leagueSettings } = config;

  const url = new URL(`${API_BASE}/${season}/players/precision-auction-values`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  const body: AuctionConfig = { weights, ...leagueSettings };

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

export function useAuctionValues(params: UseAuctionValuesParams) {
  const { appliedConfig, generationCount, limit, offset } = params;

  return useQuery({
    queryKey: [
      "auction-values",
      generationCount,
      appliedConfig?.season,
      appliedConfig?.weights,
      appliedConfig?.leagueSettings,
      limit,
      offset,
    ],
    queryFn: () =>
      fetchAuctionValues(appliedConfig as AuctionSnapshot, limit, offset),
    enabled: Boolean(appliedConfig),
    placeholderData: (prev) => prev,
  });
}