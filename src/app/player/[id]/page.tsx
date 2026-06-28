"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { useFantasyConfig, type ScoringWeights } from "@/context/FantasyContext";
import type { PaginatedResponse } from "@/types/fantasy";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const LIMIT = 50;

interface PlayerGameLog {
  GAME_DATE: string;
  GAME_ID: string;
  MATCHUP: string;
  WL: string;
  MIN: number;
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
  fantasy_score: number;
}

async function fetchPlayerGames(
  season: string,
  playerId: number,
  weights: ScoringWeights,
  limit: number,
  offset: number,
  sortBy: "date" | "fantasy_score",
  order: "asc" | "desc",
): Promise<PaginatedResponse<PlayerGameLog>> {
  const url = new URL(`${API_BASE}/${season}/player/${playerId}/games`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("sort_by", sortBy);
  url.searchParams.set("order", order);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(weights),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.detail ?? `Request failed (${res.status})`);
  }

  return res.json();
}

function StatCell({ value, decimals = 0 }: { value: number; decimals?: number }) {
  return (
    <div className="text-right font-mono tabular-nums">
      {decimals > 0 ? value.toFixed(decimals) : value}
    </div>
  );
}

export default function PlayerGameLogPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const playerId = Number(params.id);
  const playerName = searchParams.get("name") ?? "Player";

  const { appliedConfig, weights, season } = useFantasyConfig();

  // Use applied weights if available; fall back to live draft weights
  const effectiveWeights = appliedConfig?.weights ?? weights;
  const effectiveSeason = appliedConfig?.season ?? season;

  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<"date" | "fantasy_score">("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setOffset(0);
  }, [sortBy, order]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [
      "player-games",
      effectiveSeason,
      playerId,
      effectiveWeights,
      LIMIT,
      offset,
      sortBy,
      order,
    ],
    queryFn: () =>
      fetchPlayerGames(
        effectiveSeason,
        playerId,
        effectiveWeights,
        LIMIT,
        offset,
        sortBy,
        order,
      ),
    enabled: !Number.isNaN(playerId),
    placeholderData: (prev) => prev,
  });

  function toggleSort(col: "date" | "fantasy_score") {
    if (sortBy === col) {
      setOrder((o) => (o === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setOrder("desc");
    }
  }

  function SortIcon({ col }: { col: "date" | "fantasy_score" }) {
    if (sortBy !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-40" />;
    return order === "desc"
      ? <ArrowDown className="ml-1 inline h-3 w-3" />
      : <ArrowUp className="ml-1 inline h-3 w-3" />;
  }

  const columns = useMemo<ColumnDef<PlayerGameLog>[]>(
    () => [
      {
        accessorKey: "GAME_DATE",
        header: () => (
          <button
            onClick={() => toggleSort("date")}
            className="flex items-center gap-0.5 hover:text-foreground"
          >
            Date <SortIcon col="date" />
          </button>
        ),
        cell: ({ getValue }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: "MATCHUP",
        header: "Matchup",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{row.original.MATCHUP}</span>
            <span
              className={cn(
                "rounded px-1 py-0.5 text-[10px] font-semibold",
                row.original.WL === "W"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-600",
              )}
            >
              {row.original.WL}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "PTS",
        header: () => <div className="text-right">PTS</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "REB",
        header: () => <div className="text-right">REB</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "AST",
        header: () => <div className="text-right">AST</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "STL",
        header: () => <div className="text-right">STL</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "BLK",
        header: () => <div className="text-right">BLK</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "FGM",
        header: () => <div className="text-right">FGM</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "FGA",
        header: () => <div className="text-right">FGA</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "FG3M",
        header: () => <div className="text-right">3PM</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "FG3A",
        header: () => <div className="text-right">3PA</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "FTM",
        header: () => <div className="text-right">FTM</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "FTA",
        header: () => <div className="text-right">FTA</div>,
        cell: ({ getValue }) => <StatCell value={getValue() as number} />,
      },
      {
        accessorKey: "TOV",
        header: () => <div className="text-right">TOV</div>,
        cell: ({ getValue }) => (
          <div
            className={cn(
              "text-right font-mono tabular-nums",
              (getValue() as number) >= 4 ? "text-destructive" : "",
            )}
          >
            {getValue() as number}
          </div>
        ),
      },
      {
        accessorKey: "fantasy_score",
        header: () => (
          <div className="text-right">
            <button
              onClick={() => toggleSort("fantasy_score")}
              className="inline-flex items-center gap-0.5 hover:text-foreground"
            >
              FP <SortIcon col="fantasy_score" />
            </button>
          </div>
        ),
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return (
            <div
              className={cn(
                "text-right font-mono font-semibold tabular-nums",
                v >= 40
                  ? "text-primary"
                  : v >= 25
                    ? "text-foreground"
                    : "text-muted-foreground",
              )}
            >
              {v.toFixed(2)}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortBy, order, offset],
  );

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = data?.total ?? 0;
  const canGoPrev = offset > 0;
  const canGoNext = offset + LIMIT < total;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + LIMIT, total);

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader active="leaderboard" />

      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <div>
          <h2 className="text-base font-semibold leading-none">{playerName}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {effectiveSeason.replace("-", "–")} · Game Log
          </p>
        </div>
      </div>

      {/* Error */}
      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load game log."}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="font-mono text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isPending ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No games found for this player.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0 ? `Showing ${rangeStart}–${rangeEnd} of ${total} games` : "No games"}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canGoPrev}
            onClick={() => setOffset((o) => Math.max(0, o - LIMIT))}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canGoNext}
            onClick={() => setOffset((o) => o + LIMIT)}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}