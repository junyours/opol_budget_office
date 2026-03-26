import React from 'react';
import { CalamityFundData } from '../../hooks/useCalamityFund';
import { cn } from '@/src/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPeso = (v: number | null | undefined): string => {
  if (v === null || v === undefined || v === 0) return '–';
  return `₱${Math.round(v).toLocaleString('en-PH')}`;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface CalamityFundSectionProps {
  data: CalamityFundData | null;
  loading: boolean;
  /** Column widths array — should match the parent Form2 table */
  colWidths?: number[];
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Read-only 5% Calamity Fund section rendered inside Form2 for
 * Special Account departments (sh, occ, pm).
 *
 * Place this below the last classification block and before the Grand Total.
 */
const CalamityFundSection: React.FC<CalamityFundSectionProps> = ({
  data,
  loading,
}) => {
  const preDisaster   = data?.pre_disaster   ?? null;
  const quickResponse = data?.quick_response ?? null;
  const total         = data?.calamity_fund  ?? null;

  const TH = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500';
  const TD = 'px-3 py-2.5 text-[12px]';
  const TD_MONO = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

  return (
    <div className="mb-2">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-y border-gray-200 bg-gray-50">
        <span className="text-[12px] font-semibold text-gray-700">
          5% Calamity Fund
        </span>
        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
          Derived from Income Fund — Tax Revenue
        </span>
        {loading && (
          <span className="text-[10px] text-gray-400 flex items-center gap-1">
            <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />
            Loading…
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse" style={{ minWidth: 900 }}>
          {/* Minimal header matching Form2 column structure */}
          <thead>
            <tr>
              <th className={cn(TH, 'text-left w-[110px]')}>Ref.</th>
              <th className={cn(TH, 'text-left')}>Description</th>
              {/* Past columns (Sem1, Sem2, Total) — blank for calamity fund */}
              <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right w-[95px]">
                Sem 1
              </th>
              <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right w-[95px]">
                Sem 2
              </th>
              <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-wide text-right w-[95px]">
                Total
              </th>
              {/* Proposed */}
              <th className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wide text-right w-[95px]">
                Proposed
              </th>
              {/* Inc/Dec & % — not applicable */}
              <th className={cn(TH, 'text-right w-[95px]')}>Inc / Dec</th>
              <th className={cn(TH, 'text-right w-[80px]')}>%</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {/* 70% Pre-Disaster Preparedness */}
            <tr className="bg-white hover:bg-gray-50/60 transition-colors">
              <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>5% × 70%</td>
              <td className={cn(TD, 'text-gray-800')}>
                Pre-Disaster Preparedness
                <span className="ml-2 text-[10px] text-gray-400">(70% of 5% Calamity Fund)</span>
              </td>
              {/* Past cols — not applicable */}
              <td className={cn(TD_MONO, 'bg-gray-50 text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'bg-gray-50 text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'bg-gray-50 text-gray-300')}>–</td>
              {/* Proposed */}
              <td className={cn(TD_MONO, 'bg-gray-50 text-blue-700 font-semibold')}>
                {loading ? (
                  <span className="text-gray-300 animate-pulse">…</span>
                ) : (
                  fmtPeso(preDisaster)
                )}
              </td>
              {/* Inc/Dec & % — not applicable */}
              <td className={cn(TD_MONO, 'text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'text-gray-300')}>–</td>
            </tr>

            {/* 30% Quick Response Fund */}
            <tr className="bg-white hover:bg-gray-50/60 transition-colors">
              <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>5% × 30%</td>
              <td className={cn(TD, 'text-gray-800')}>
                Quick Response Fund (QRF)
                <span className="ml-2 text-[10px] text-gray-400">(30% of 5% Calamity Fund)</span>
              </td>
              <td className={cn(TD_MONO, 'bg-gray-50 text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'bg-gray-50 text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'bg-gray-50 text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'bg-gray-50 text-blue-700 font-semibold')}>
                {loading ? (
                  <span className="text-gray-300 animate-pulse">…</span>
                ) : (
                  fmtPeso(quickResponse)
                )}
              </td>
              <td className={cn(TD_MONO, 'text-gray-300')}>–</td>
              <td className={cn(TD_MONO, 'text-gray-300')}>–</td>
            </tr>

            {/* Subtotal — 5% Calamity Fund */}
            <tr className="bg-gray-100 border-t border-gray-200">
              <td />
              <td className={cn(TD, 'font-semibold text-gray-700')}>
                Total 5% Calamity Fund
              </td>
              <td className={cn(TD_MONO, 'font-semibold text-gray-700 bg-gray-100')}>–</td>
              <td className={cn(TD_MONO, 'font-semibold text-gray-700 bg-gray-100')}>–</td>
              <td className={cn(TD_MONO, 'font-semibold text-gray-700 bg-gray-100')}>–</td>
              <td className={cn(TD_MONO, 'font-semibold text-gray-700 bg-gray-100')}>
                {loading ? (
                  <span className="text-gray-300 animate-pulse">…</span>
                ) : (
                  fmtPeso(total)
                )}
              </td>
              <td className={cn(TD_MONO, 'text-gray-300 bg-gray-100')}>–</td>
              <td className={cn(TD_MONO, 'text-gray-300 bg-gray-100')}>–</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Formula legend */}
      {data?.total_tax_revenue_proposed && (
        <p className="px-4 py-2 text-[10px] text-gray-400">
          Based on Tax Revenue proposed amount of{' '}
          <span className="font-semibold text-gray-600 font-mono">
            {fmtPeso(data.total_tax_revenue_proposed)}
          </span>
          {' '}× 5% = {fmtPeso(total)}.
          Pre-Disaster = 70% · QRF = 30%.
        </p>
      )}
    </div>
  );
};

export default CalamityFundSection;