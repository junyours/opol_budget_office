// src/hooks/useIncomeFundGrandTotal.ts

import { useState, useEffect } from 'react';
import API from '@/src/services/api';
import { IncomeFundRow } from '@/src/types/api';
import { useActiveBudgetPlan } from './useActiveBudgetPlan';

interface GrandTotalResult {
  grandTotal: number | null;
  loading: boolean;
  error: string | null;
}

export const useIncomeFundGrandTotal = (source: string = 'general-fund') => {
  const { activePlan } = useActiveBudgetPlan();
  const [grandTotal, setGrandTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrandTotal = async () => {
      if (!activePlan) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await API.get(`/income-fund?source=${source}`);
        const rows = res.data.data as IncomeFundRow[];
        
        // Calculate grand total (excluding Total Non-Income Receipts)
        const beginningCashRow = rows.find(r => r.name === 'Beginning Cash Balance');
        const beginningCash = beginningCashRow?.proposed ?? 0;
        
        // Group children
        const childrenMap = new Map<number, IncomeFundRow[]>();
        rows.forEach(row => {
          if (row.parent_id !== null) {
            if (!childrenMap.has(row.parent_id)) {
              childrenMap.set(row.parent_id, []);
            }
            childrenMap.get(row.parent_id)!.push(row);
          }
        });

        // Calculate subtotals
        const sumDescendants = (parentId: number, field: keyof Pick<IncomeFundRow, 'proposed'>) => {
          let total = 0;
          const stack = [parentId];
          while (stack.length) {
            const pid = stack.pop()!;
            const children = childrenMap.get(pid) || [];
            for (const child of children) {
              total += child[field] ?? 0;
              stack.push(child.id);
            }
          }
          return total;
        };

        // Define parent IDs for subtotals (based on general fund structure)
        const subtotalConfigs = [
          { parentId: 4, name: 'Total Tax Revenue' }, // Tax Revenue parent
          { parentId: 14, name: 'Total Non-Tax Revenue' }, // Non-Tax Revenue parent
          { parentId: 33, name: 'Total External Source' }, // External Source parent
          { parentId: 45, name: 'Total Non-Income Receipts' } // Non-Income Receipts parent
        ];

        const subtotals = subtotalConfigs.map(config => ({
          name: config.name,
          total: sumDescendants(config.parentId, 'proposed')
        }));

        // Filter out Total Non-Income Receipts
        const filteredSubtotals = subtotals.filter(s => s.name !== 'Total Non-Income Receipts');
        
        // Calculate grand total
        const total = beginningCash + filteredSubtotals.reduce((acc, s) => acc + s.total, 0);
        setGrandTotal(total);
        setError(null);
      } catch (err) {
        console.error('Failed to calculate grand total', err);
        setError('Failed to calculate grand total');
        setGrandTotal(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGrandTotal();
  }, [activePlan, source]);

  return { grandTotal, loading, error };
};