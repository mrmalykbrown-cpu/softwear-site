"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

const TIERS = [
  { value: "", label: "All tiers" },
  { value: "SAFE", label: "Safe" },
  { value: "BALANCED", label: "Balanced" },
  { value: "AGGRESSIVE", label: "Aggressive" },
];

const OUTCOMES = [
  { value: "", label: "All outcomes" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
  { value: "VOID", label: "Void" },
  { value: "UNMARKED", label: "Not yet marked" },
];

/**
 * Filters submit as a plain GET form, so the active filter lives in the URL:
 * it survives a refresh, it can be bookmarked, and the CSV export can be a
 * simple link that carries the same query.
 */
export function HistoryFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const value = (key: string) => params.get(key) ?? "";
  const hasFilters = ["tier", "outcome", "from", "to"].some((key) => params.get(key));

  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const [key, raw] of form.entries()) {
          const entry = String(raw);
          if (entry) next.set(key, entry);
        }
        router.push(`/history${next.toString() ? `?${next}` : ""}`);
      }}
    >
      <div>
        <label htmlFor="tier" className="sr-only">
          Tier
        </label>
        <Select id="tier" name="tier" defaultValue={value("tier")}>
          {TIERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="outcome" className="sr-only">
          Outcome
        </label>
        <Select id="outcome" name="outcome" defaultValue={value("outcome")}>
          {OUTCOMES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor="from" className="sr-only">
          From date
        </label>
        <Input id="from" name="from" type="date" defaultValue={value("from")} numeric />
      </div>

      <div>
        <label htmlFor="to" className="sr-only">
          To date
        </label>
        <Input id="to" name="to" type="date" defaultValue={value("to")} numeric />
      </div>

      <div className="flex gap-2">
        <Button type="submit" variant="secondary" className="flex-1">
          Apply
        </Button>
        {hasFilters ? (
          <Button type="button" variant="ghost" onClick={() => router.push("/history")}>
            Clear
          </Button>
        ) : null}
      </div>
    </form>
  );
}
