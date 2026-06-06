// components/ldrrmfip/LdrrmfipTableSkeleton.tsx
//
// Mirrors the exact layout of LdrrmfipPage's renderTable output:
//   source sub-header → N category cards (header + 9-col table) → summary footer
//
// Typography uses the project CSS classes (text-eyebrow, text-table-header, etc.)
// so the skeleton proportions match the real content precisely.

import React from "react";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

// ─── Column widths — must stay in sync with renderTable ──────────────────────
const COL_WIDTHS = [
  "w-[28%]", // description
  "w-[9%]",  // implementing office
  "w-[8%]",  // starting date
  "w-[8%]",  // completion date
  "w-[12%]", // expected output
  "w-[7%]",  // funding source
  "w-[9%]",  // mooe
  "w-[9%]",  // co
  "w-[9%]",  // total
  "w-8",     // actions
];

// ─── Single category card skeleton ───────────────────────────────────────────

function CategoryCardSkeleton({ index }: { index: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      {/* Category header bar — mirrors: px-4 py-2.5 border-b flex items-center justify-between */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        {/* text-eyebrow width varies per category */}
        <Skeleton className={cn("h-2.5 rounded", index === 0 ? "w-36" : "w-28")} />
        {/* Add Item button */}
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            {/* Column headers — matches text-table-header row */}
            <tr className="border-b border-gray-200">
              {COL_WIDTHS.map((w, ci) => (
                <th key={ci} className={cn("px-3 py-2.5 bg-white", w)}>
                  {/* Last col (actions) has no label skeleton */}
                  {ci < 9 && (
                    <Skeleton className={cn(
                      "h-2 rounded",
                      // Amount columns right-aligned — shorter skeleton
                      ci >= 6 ? "w-8 ml-auto" :
                      // Center columns — medium
                      ci >= 2 && ci <= 5 ? "w-3/4 mx-auto" :
                      // Description — longest
                      "w-4/5"
                    )} />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* 3 data rows per category */}
            {Array.from({ length: 3 }).map((_, ri) => (
              <tr
                key={ri}
                className={cn(ri % 2 === 1 && "bg-gray-50/40")}
                style={{ animationDelay: `${(index * 3 + ri) * 40}ms` }}
              >
                {/* Description — text-table-primary height (13px → h-3.5) */}
                <td className="px-3 py-3">
                  <Skeleton className={cn("h-3.5 rounded", ri % 2 === 0 ? "w-4/5" : "w-3/4")} />
                </td>

                {/* Implementing office — text-table-secondary (11px → h-2.5) */}
                <td className="px-3 py-3 text-center">
                  <Skeleton className="h-2.5 w-12 mx-auto rounded" />
                </td>

                {/* Starting date */}
                <td className="px-3 py-3 text-center">
                  <Skeleton className="h-2.5 w-10 mx-auto rounded" />
                </td>

                {/* Completion date */}
                <td className="px-3 py-3 text-center">
                  <Skeleton className="h-2.5 w-10 mx-auto rounded" />
                </td>

                {/* Expected output */}
                <td className="px-3 py-3">
                  <Skeleton className="h-2.5 w-full rounded" />
                </td>

                {/* Funding source — badge shape */}
                <td className="px-3 py-3 text-center">
                  <Skeleton className="h-5 w-14 mx-auto rounded-full bg-teal-100/60" />
                </td>

                {/* MOOE — text-table-number (11px mono → h-2.5, right) */}
                <td className="px-3 py-3 text-right">
                  <Skeleton className="h-2.5 w-16 ml-auto rounded" />
                </td>

                {/* CO */}
                <td className="px-3 py-3 text-right">
                  <Skeleton className="h-2.5 w-10 ml-auto rounded" />
                </td>

                {/* Total — text-table-total (12px bold → h-3) */}
                <td className="px-3 py-3 text-right">
                  <Skeleton className="h-3 w-16 ml-auto rounded" />
                </td>

                {/* Actions */}
                <td className="w-8" />
              </tr>
            ))}
          </tbody>

          {/* Subtotal footer — text-table-header label + text-table-total amounts */}
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50/80">
              {/* Label spanning 6 cols, right-aligned */}
              <td colSpan={6} className="px-3 py-2.5 text-right">
                <Skeleton className="h-2.5 w-28 ml-auto rounded" />
              </td>
              {/* MOOE subtotal */}
              <td className="px-3 py-2.5 text-right">
                <Skeleton className="h-3 w-16 ml-auto rounded" />
              </td>
              {/* CO subtotal */}
              <td className="px-3 py-2.5 text-right">
                <Skeleton className="h-3 w-12 ml-auto rounded" />
              </td>
              {/* Total subtotal — text-table-grand-total (13px → h-3.5) */}
              <td className="px-3 py-2.5 text-right">
                <Skeleton className="h-3.5 w-20 ml-auto rounded" />
              </td>
              <td className="w-8" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Summary footer skeleton — mirrors A / B / C rows ────────────────────────

function SummaryFooterSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <tbody>
          {/* Row A — text-table-primary label + text-table-grand-total amount */}
          <tr className="border-b border-gray-100">
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-4 rounded" />  {/* "A." */}
                <Skeleton className="h-3 w-64 rounded" />
              </div>
              <Skeleton className="h-2 w-32 rounded mt-1.5 ml-6" /> {/* limit meta */}
            </td>
            <td className="px-5 py-3 w-52 text-right">
              <Skeleton className="h-3.5 w-28 ml-auto rounded" />
            </td>
          </tr>

          {/* Row B */}
          <tr className="border-b border-gray-100">
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-4 rounded" />
                <Skeleton className="h-3 w-72 rounded" />
              </div>
            </td>
            <td className="px-5 py-3 w-52 text-right">
              <Skeleton className="h-3.5 w-28 ml-auto rounded" />
            </td>
          </tr>

          {/* Row C — blue tint background */}
          <tr className="bg-blue-50/40 border-t border-blue-100">
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-4 rounded bg-blue-200" />
                <Skeleton className="h-3 w-56 rounded bg-blue-200" />
                {/* "derived" badge */}
                <Skeleton className="h-5 w-32 rounded bg-blue-100" />
              </div>
            </td>
            <td className="px-5 py-3 w-52 text-right">
              <Skeleton className="h-3.5 w-28 ml-auto rounded bg-blue-200" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function LdrrmfipTableSkeleton() {
  return (
    <div className="space-y-5">

      {/* Source sub-header — mirrors: flex items-center justify-center gap-3 */}
      <div className="flex items-center justify-center gap-3 py-1">
        <span className="h-px flex-1 max-w-[80px] bg-gray-100 rounded-full" />
        <div className="text-center space-y-1">
          {/* text-eyebrow height (10px → h-2.5) */}
          <Skeleton className="h-2.5 w-48 mx-auto rounded bg-red-100/70" />
          {/* text-subtitle height (12px → h-3) */}
          <Skeleton className="h-3 w-36 mx-auto rounded" />
        </div>
        <span className="h-px flex-1 max-w-[80px] bg-gray-100 rounded-full" />
      </div>

      {/* Two category cards */}
      <CategoryCardSkeleton index={0} />
      <CategoryCardSkeleton index={1} />

      {/* Summary footer */}
      <SummaryFooterSkeleton />

    </div>
  );
}
