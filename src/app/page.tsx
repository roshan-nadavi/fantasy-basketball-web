"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { DateRange } from "react-day-picker";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CalendarIcon, Loader2, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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

import {
  useFantasyConfig,
  AVAILABLE_SEASONS,
  type ScoringWeights,
  type DateRangeState,
  type Season,
} from "@/context/FantasyContext";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import type { BasePlayerRecord } from "@/types/fantasy";

const LIMIT = 150;

const WEIGHT_FIELDS: (keyof ScoringWeights)[] = [
  "FGM", "FGA", "FG3M", "FG3A", "FTM", "FTA",
  "OREB", "DREB", "REB", "AST", "STL", "BLK", "TOV", "PF", "PTS",
];

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function parseISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function contextRangeToPicker(range: DateRangeState): DateRange | undefined {
  if (!range.startDate) return undefined;
  return {
    from: parseISODate(range.startDate),
    to: range.endDate ? parseISODate(range.endDate) : undefined,
  };
}

export default function HomePage() {
  const router = useRouter();

  const {
    season,
    setSeason,
    weights,
    setWeight,
    dateRange,
    setDateRange,
    clearDateRange,
    appliedConfig,
    generationCount,
    generate,
  } = useFantasyConfig();

  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState<"total" | "avg">("total");

  useEffect(() => {
    setOffset(0);
  }, [generationCount, sortBy]);

  const hasGenerated = Boolean(appliedConfig);

  const { data, isPending, isFetching, isError, error } = useLeaderboard({
    appliedConfig,
    generationCount,
    limit: LIMIT,
    offset,
    sortBy,
  });

  function handleWeightChange(stat: keyof ScoringWeights, value: number) {
    setWeight(stat, Math.round(value * 100) / 100);
  }

  function handleViewPlayer(playerId: number, playerName: string) {
    router.push(`/player/${playerId}?name=${encodeURIComponent(playerName)}`);
  }

  const columns = useMemo<ColumnDef<BasePlayerRecord>[]>(
    () => [
      {
        id: "rank",
        header: "#",
        cell: ({ row }) => (
          <div className="tabular-nums">{offset + row.index + 1}</div>
        ),
      },
      {
        accessorKey: "PLAYER_NAME",
        header: "Player",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span>{row.original.PLAYER_NAME}</span>
            <Button
              size="xs"
              onClick={() => handleViewPlayer(row.original.PLAYER_ID, row.original.PLAYER_NAME)}
              title="View full season stats"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Stats
            </Button>
          </div>
        ),
      },
      {
        accessorKey: "games_played",
        header: () => <div className="text-right">GP</div>,
        cell: ({ getValue }) => (
          <div className="text-right tabular-nums">{getValue() as number}</div>
        ),
      },
      {
        accessorKey: "total_fantasy_pts",
        header: () => <div className="text-right">Total FP</div>,
        cell: ({ getValue }) => (
          <div className="text-right font-mono tabular-nums">
            {(getValue() as number).toFixed(2)}
          </div>
        ),
      },
      {
        accessorKey: "avg_fantasy_pts",
        header: () => <div className="text-right">Avg FP</div>,
        cell: ({ getValue }) => (
          <div className="text-right font-mono tabular-nums">
            {(getValue() as number).toFixed(2)}
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <PageHeader active="leaderboard" />

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

          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono text-muted-foreground">
              Date Range
            </label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-8 justify-start text-left text-sm font-normal"
                  />
                }
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {dateRange.startDate ? (
                  dateRange.endDate ? (
                    <>
                      {format(parseISODate(dateRange.startDate), "MMM d, yyyy")} –{" "}
                      {format(parseISODate(dateRange.endDate), "MMM d, yyyy")}
                    </>
                  ) : (
                    format(parseISODate(dateRange.startDate), "MMM d, yyyy")
                  )
                ) : (
                  <span>Full Season</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={contextRangeToPicker(dateRange)}
                  onSelect={(range) =>
                    setDateRange({
                      startDate: range?.from ? toApiDateString(range.from) : null,
                      endDate: range?.to ? toApiDateString(range.to) : null,
                    })
                  }
                  numberOfMonths={2}
                  autoFocus
                />
                {dateRange.startDate && (
                  <div className="border-t p-2">
                    <Button variant="ghost" size="sm" onClick={clearDateRange}>
                      Clear dates
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
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
        <Select
          value={sortBy}
          onValueChange={(v) => setSortBy(v as "total" | "avg")}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="total">Sort: Total Points</SelectItem>
            <SelectItem value="avg">Sort: Avg Points</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={generate}>
          {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Generate
        </Button>
      </div>

      {/* ---------- Error State ---------- */}
      {isError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load leaderboard."}
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
                  Set your weights and click Generate to load the leaderboard.
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