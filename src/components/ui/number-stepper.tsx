"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberStepperProps {
  id?: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  className?: string;
}

export function NumberStepper({
  id,
  value,
  onChange,
  step = 1,
  className,
}: NumberStepperProps) {
  function handleTyped(raw: string) {
    const parsed = parseFloat(raw);
    onChange(Number.isNaN(parsed) ? 0 : parsed);
  }

  return (
    <div
      className={cn(
        "flex h-8 items-stretch overflow-hidden rounded-lg border border-input",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(value - step)}
        aria-label="Decrement"
        className="flex w-7 shrink-0 items-center justify-center bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(e) => handleTyped(e.target.value)}
        className="w-full min-w-0 flex-1 border-x border-input bg-transparent px-1 text-center font-mono text-sm outline-none focus-visible:bg-input/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        aria-label="Increment"
        className="flex w-7 shrink-0 items-center justify-center bg-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}