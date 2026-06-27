"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NumberStepper } from "@/components/ui/number-stepper";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

import {
  useFantasyConfig,
  AVAILABLE_SEASONS,
  type ScoringWeights,
  type LeagueSettings,
  type Season,
} from "@/context/FantasyContext";
import { useAuctionValues } from "@/hooks/use-auction-values";
import type { PlayerAuctionRecord } from "@/types/fantasy";

const LIMIT = 50;

const WEIGHT_FIELDS: (keyof ScoringWeights)[] = [
  "FGM", "FGA", "FG3M", "FG3A", "FTM", "FTA",
  "OREB", "DREB", "REB", "AST", "STL", "BLK", "TOV", "PF", "PTS",
];

// `kind` controls rounding after a step click: int fields snap to whole
// numbers, float fields keep two decimal places. NumberStepper itself
// always steps by a flat 1 / -1 regardless of kind.
const LEAGUE_SETTING_FIELDS: {
  key: keyof LeagueSettings;
  label: string;
  kind: "int" | "float";
}[] = [
  { key: "num_teams", label: "Teams", kind: "int" },
  { key: "roster_size", label: "Roster Size", kind: "int" },
  { key: "total_budget_per_team", label: "Budget / Team", kind: "float" },
  { key: "regular_weeks", label: "Regular Weeks", kind: "int" },
  { key: "playoff_weeks", label: "Playoff Weeks", kind: "int" },
  { key: "post_season_weightage", label: "Playoff Weight", kind: "float" },
];

export default function AuctionPage() {
  const {
    season,
    setSeason,
    weights,
    setWeight,
    leagueSettings,
    setLeagueSetting,
    appliedConfig,
    generationCount,
    generate,
  } = useFantasyConfig();

  const [offset, setOffset] = useState(0);

  // Same edge-case rule as the Home Page: changing inputs alone does nothing
  // until Generate snapshots them into appliedConfig — so offset resets off
  // generationCount, not off the live draft values.
  useEffect(() => {
    setOffset(0);
  }, [generationCount]);

  const hasGenerated = Boolean(appliedConfig);

  const { data, isPending, isFetching, isError, error } = useAuctionValues({
    appliedConfig,
    generationCount,
    limit: LIMIT,
    offset,
  });

  function handleWeightChange(stat: keyof ScoringWeights, value: number) {
    setWeight(stat, Math.round(value * 100) / 100);
  }

  function handleLeagueSettingChange(
    key: keyof LeagueSettings,
    value: number,
    kind: "int" | "float",
  ) {
    const rounded = kind === "int" ? Math.round(value) : Math.round(value * 100) / 100;
    setLeagueSetting(key, rounded as never);
  }

  const columns = useMemo<ColumnDef<PlayerAuctionRecord>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        cell: ({ row }) => offset + row.index + 1,
      },
      {
        accessorKey: "PLAYER_NAME",
        header: "Player",
      },
      {
        accessorKey: "total_weighted_points",
        header: () => <div className="text-right">Weighted Pts</div>,
        cell: ({ getValue }) => (
          <div className="text-right font-mono">
            {(getValue() as number).toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "total_accumulated_vorp",
        header: () => <div className="text-right">Total VORP</div>,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return (
            <div
              className={cn(
                "text-right font-mono",
                v > 0 ? "text-money" : "text-muted-foreground",
              )}
            >
              {v.toFixed(2)}
            </div>
          );
        },
      },
      {
        accessorKey: "adjusted_vorp",
        header: () => <div className="text-right">Adj. VORP</div>,
        cell: ({ getValue }) => {
          const v = getValue() as number;
          return (
            <div
              className={cn(
                "text-right font-mono",
                v > 0 ? "text-money" : "text-muted-foreground",
              )}
            >
              {v.toFixed(2)}
            </div>
          );
        },
      },
      {
        accessorKey: "auction_value",
        header: () => <div className="text-right">Auction $</div>,
        cell: ({ getValue }) => (
          <div className="text-right font-mono font-semibold text-money">
            ${(getValue() as number).toFixed(2)}
          </div>
        ),
      },
    ],
    [offset],
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
      <PageHeader active="auction" />

      {/* ---------- Settings Header ---------- */}
      <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-muted-foreground">
              Season
            </label>
            <Select
              value={season}
              onValueChange={(value) => setSeason(value as Season)}
            >
              <SelectTrigger className="h-8 w-[120px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_SEASONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace("_", "-")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {LEAGUE_SETTING_FIELDS.map(({ key, label, kind }) => (
            <div key={key} className="flex flex-col gap-1">
              <label
                htmlFor={`league-${key}`}
                className="text-xs font-mono text-muted-foreground"
              >
                {label}
              </label>
              <NumberStepper
                id={`league-${key}`}
                value={leagueSettings[key]}
                onChange={(v) => handleLeagueSettingChange(key, v, kind)}
                step={1}
                className="w-[130px]"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-mono text-muted-foreground">
            Scoring Weights
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {WEIGHT_FIELDS.map((stat) => (
              <div key={stat} className="flex flex-col gap-1">
                <label
                  htmlFor={`weight-${stat}`}
                  className="text-[10px] font-mono text-muted-foreground"
                >
                  {stat}
                </label>
                <NumberStepper
                  id={`weight-${stat}`}
                  value={weights[stat]}
                  onChange={(v) => handleWeightChange(stat, v)}
                  step={1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------- Filter Controls Toolbar ---------- */}
      <div className="flex items-center gap-3">
        <Button onClick={generate}>
          {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate
        </Button>
      </div>

      {/* ---------- Error State ---------- */}
      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load auction values."}
        </div>
      )}

      {/* ---------- Server-Paginated Table ---------- */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="font-mono text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {!hasGenerated ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  Set your league settings and click Generate to calculate auction values.
                </TableCell>
              </TableRow>
            ) : isPending ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
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
                  No players found for this configuration.
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

      {/* ---------- Pagination ---------- */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total > 0
            ? `Showing ${rangeStart}–${rangeEnd} of ${total}`
            : "No results"}
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