// import { useState, useEffect } from 'react';
// import API from '../services/api';
// import { ExpenseItem, ExpenseClassification, DepartmentBudgetPlan } from '../types/api';

// export interface ItemWithClassification extends ExpenseItem {
//   classificationName: string;
//   classificationAbbr: string;
// }

// export const useExpenseData = (activePlanId?: number) => {
//   const [classifications, setClassifications] = useState<ExpenseClassification[]>([]);
//   const [items, setItems] = useState<ItemWithClassification[]>([]);
//   const [amountMap, setAmountMap] = useState<Map<string, number>>(new Map());
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!activePlanId) {
//       setLoading(false);
//       return;
//     }

//     let cancelled = false;

//     const fetchData = async () => {
//       try {
//         setLoading(true);

//         const [itemsRes, classRes, plansRes] = await Promise.all([
//           API.get('/expense-class-items'),
//           API.get('/expense-classifications'),
//           // Fetch ALL dept plans under this budget plan in one request
//           API.get('/department-budget-plans', {
//             params: { budget_plan_id: activePlanId },
//           }),
//         ]);

//         if (cancelled) return;

//         const allItems: ExpenseItem[]               = itemsRes.data.data;
//         const allClassifications: ExpenseClassification[] = classRes.data.data;
//         const allPlans: DepartmentBudgetPlan[]       = plansRes.data.data;

//         // Build amountMap across ALL department plans that belong to this budget plan.
//         // Key: `${dept_id}-${expense_item_id}` → total_amount
//         const newAmountMap = new Map<string, number>();

//         allPlans
//           .filter(p => p.budget_plan_id === activePlanId)
//           .forEach(plan => {
//             plan.items.forEach(item => {
//               const key = `${plan.dept_id}-${item.expense_item_id}`;
//               newAmountMap.set(key, Number(item.total_amount));
//             });
//           });

//         // Build a set of expense_item_ids that have at least one non-zero amount
//         // across any department. Items with no data at all are excluded so the
//         // summary table stays clean.
//         const itemIdsWithData = new Set<number>();
//         newAmountMap.forEach((amount, key) => {
//           if (amount > 0) {
//             const itemId = parseInt(key.split('-')[1], 10);
//             itemIdsWithData.add(itemId);
//           }
//         });

//         const classMap = new Map<number, { name: string; abbr: string }>();
//         allClassifications.forEach(cls => {
//           classMap.set(cls.expense_class_id, {
//             name: cls.expense_class_name,
//             abbr: cls.abbreviation,
//           });
//         });

//         const enrichedItems: ItemWithClassification[] = allItems
//           // Only keep items that have actual data in at least one department
//           .filter(item => itemIdsWithData.has(item.expense_class_item_id))
//           .map(item => {
//             const cls = classMap.get(item.expense_class_id) ?? { name: 'Unknown', abbr: '' };
//             return {
//               ...item,
//               classificationName: cls.name,
//               classificationAbbr: cls.abbr,
//             };
//           });

//         setAmountMap(newAmountMap);
//         setClassifications(allClassifications);
//         setItems(enrichedItems);
//       } catch (error) {
//         if (!cancelled) console.error('Failed to fetch expense data', error);
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     fetchData();
//     return () => { cancelled = true; };
//   }, [activePlanId]);

//   return { classifications, items, amountMap, loading };
// };

// FULL REPLACEMENT for useExpenseData.ts
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { ExpenseItem, ExpenseClassification, DepartmentBudgetPlan } from '../types/api';

export interface ItemWithClassification extends ExpenseItem {
  classificationName: string;
  classificationAbbr: string;
}

export const useExpenseData = (activePlanId?: number) => {
  const { data: rawItems = [], isLoading: itemsLoading } = useQuery<ExpenseItem[]>({
    queryKey: ['expense-class-items'],
    queryFn: () => API.get('/expense-class-items').then(r => r.data.data),
  });

  const { data: rawClassifications = [], isLoading: classLoading } = useQuery<ExpenseClassification[]>({
    queryKey: ['expense-classifications'],
    queryFn: () => API.get('/expense-classifications').then(r => r.data.data),
  });

  const { data: allPlans = [], isLoading: plansLoading } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['dept-budget-plans', activePlanId!],
    queryFn: () =>
      API.get('/department-budget-plans', {
        params: { budget_plan_id: activePlanId },
      }).then(r => r.data.data),
    enabled: !!activePlanId,
  });

  const loading = itemsLoading || classLoading || plansLoading || !activePlanId;

  const { items, amountMap, classifications } = useMemo(() => {
    if (!activePlanId || !allPlans.length) {
      return {
        items: [] as ItemWithClassification[],
        amountMap: new Map<string, number>(),
        classifications: rawClassifications,
      };
    }

    const newAmountMap = new Map<string, number>();
    allPlans
      .filter(p => p.budget_plan_id === activePlanId)
      .forEach(plan => {
        plan.items.forEach(item => {
          const key = `${plan.dept_id}-${item.expense_item_id}`;
          newAmountMap.set(key, Number(item.total_amount));
        });
      });

    const itemIdsWithData = new Set<number>();
    newAmountMap.forEach((amount, key) => {
      if (amount > 0) {
        const itemId = parseInt(key.split('-')[1], 10);
        itemIdsWithData.add(itemId);
      }
    });

    const classMap = new Map<number, { name: string; abbr: string }>();
    rawClassifications.forEach(cls => {
      classMap.set(cls.expense_class_id, {
        name: cls.expense_class_name,
        abbr: cls.abbreviation,
      });
    });

    const enrichedItems: ItemWithClassification[] = rawItems
      .filter(item => itemIdsWithData.has(item.expense_class_item_id))
      .map(item => {
        const cls = classMap.get(item.expense_class_id) ?? { name: 'Unknown', abbr: '' };
        return { ...item, classificationName: cls.name, classificationAbbr: cls.abbr };
      });

    return { items: enrichedItems, amountMap: newAmountMap, classifications: rawClassifications };
  }, [rawItems, rawClassifications, allPlans, activePlanId]);

  return { classifications, items, amountMap, loading };
};
