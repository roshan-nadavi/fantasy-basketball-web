"use client";

import Link from "next/link";
import { BarChart3, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  active: "leaderboard" | "auction";
}

export function PageHeader({ active }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-none">
            Precision Fantasy Analytics
          </h1>
          <p className="text-xs text-muted-foreground">
            {active === "leaderboard" ? "Master Leaderboard" : "Precision Auction Board"}
          </p>
        </div>
      </div>

      {active === "leaderboard" ? (
        <Link href="/auction">
          <Button variant="secondary">
            <Gavel className="mr-1.5 h-4 w-4" />
            View Auction Values
          </Button>
        </Link>
      ) : (
        <Link href="/">
          <Button variant="secondary">
            <BarChart3 className="mr-1.5 h-4 w-4" />
            View Leaderboard
          </Button>
        </Link>
      )}
    </div>
  );
}