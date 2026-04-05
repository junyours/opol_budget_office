import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';
import {
  DepartmentBudgetPlan,
  ExpenseClassification,
  ExpenseItem,
  DepartmentBudgetPlanItem,
} from '../../types/api';
import Form2 from './Form2';
import Form3 from './Form3';
import Form4 from './Form4';
import { LoadingState } from '../common/LoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
  draft: {
    label: 'Draft',
    badge: 'text-amber-700 bg-amber-50 border-amber-200',
    dot:   'bg-amber-400',
  },
  submitted: {
    label: 'Submitted',
    badge: 'text-blue-700 bg-blue-50 border-blue-200',
    dot:   'bg-blue-400',
  },
  approved: {
    label: 'Approved',
    badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    dot:   'bg-emerald-400',
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

const BudgetPlanDetail: React.FC = () => {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();

  const [plan, setPlan]                     = useState<DepartmentBudgetPlan | null>(null);
  const [classifications, setClassifications] = useState<ExpenseClassification[]>([]);
  const [expenseItems, setExpenseItems]     = useState<ExpenseItem[]>([]);
  const [pastYearPlan,        setPastYearPlan]        = useState<DepartmentBudgetPlan | null>(null);
  const [obligationYearPlan,  setObligationYearPlan]  = useState<DepartmentBudgetPlan | null>(null);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState('2');

  // Submit flow
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [submitting, setSubmitting]               = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    if (!id) { navigate('/dashboard'); return; }

    try {
      const [planRes, classRes, itemsRes] = await Promise.all([
        API.get(`/department-budget-plans/${id}`),
        API.get('/expense-classifications'),
        API.get('/expense-class-items'),
      ]);

      const currentPlan: DepartmentBudgetPlan = planRes.data.data;

      let pastPlan: DepartmentBudgetPlan | null = null;
      let obligationPlan: DepartmentBudgetPlan | null = null;
      try {
        const pastRes = await API.get(
          `/department-budget-plans/by-dept-year/${currentPlan.dept_id}/${currentPlan.budget_plan!.year - 1}`
        );
        pastPlan = pastRes.data.data;
      } catch { /* 404 — no past plan */ }
      try {
        const oblRes = await API.get(
          `/department-budget-plans/by-dept-year/${currentPlan.dept_id}/${currentPlan.budget_plan!.year - 2}`
        );
        obligationPlan = oblRes.data.data;
      } catch { /* 404 — no obligation plan */ }

      // Auto-copy items from past year if current plan is empty
      if (currentPlan.items.length === 0 && pastPlan && pastPlan.items.length > 0) {
        const copyPromises = pastPlan.items.map((item: DepartmentBudgetPlanItem) =>
          API.post(`/department-budget-plans/${currentPlan.dept_budget_plan_id}/items`, {
            expense_item_id: item.expense_item_id,
          })
        );
        await Promise.all(copyPromises);
        const updatedRes = await API.get(`/department-budget-plans/${id}`);
        currentPlan.items = updatedRes.data.data.items;
      }

      setPlan(currentPlan);
      setClassifications(classRes.data.data);
      setExpenseItems(itemsRes.data.data);
      setPastYearPlan(pastPlan);
      setObligationYearPlan(obligationPlan);
    } catch (error: any) {
      console.error('Failed to fetch data', error);
      if (error.response?.status === 403) {
        navigate('/dashboard', { state: { error: 'You do not have access to this budget plan.' } });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!plan) return;
    setSubmitting(true);
    try {
      await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/submit`);
      toast.success('Budget plan submitted successfully.');
      setSubmitConfirmOpen(false);
      fetchData(); // refresh status
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;
  if (!plan)   return <div className="p-6 text-gray-500">Budget plan not found.</div>;

  // A plan is editable only if it's a draft
  const isEditable = plan.status === 'draft';
  const statusCfg  = statusConfig[plan.status] ?? statusConfig.draft;

  // Check if parent plan is still open (to show/hide submit button)
  const parentIsOpen = (plan.budget_plan as any)?.is_open !== false;

  return (
    <div className="p-6">

      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Department Budget Plan
          </span>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight mt-0.5">
            FY {plan.budget_plan?.year ?? 'N/A'}
          </h1>
          <div className="flex items-center gap-2.5 mt-1.5">
            <span className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border',
              statusCfg.badge
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
              {statusCfg.label}
            </span>

            {/* Submissions closed notice */}
            {!parentIsOpen && plan.status === 'draft' && (
              <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                Submissions closed
              </span>
            )}
          </div>
        </div>

        {/* Submit button — shown only when draft and parent plan is open */}
        {plan.status === 'draft' && parentIsOpen && (
          <Button
            size="sm"
            onClick={() => setSubmitConfirmOpen(true)}
            className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Submit for Review
          </Button>
        )}

        {/* Submitted / approved badge action */}
        {plan.status === 'submitted' && (
          <span className="text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg font-medium">
            Awaiting admin approval
          </span>
        )}
        {plan.status === 'approved' && (
          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
            <CheckCircleIcon className="w-3.5 h-3.5" />
            Approved
          </span>
        )}
      </div>

      {/* ── Forms Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 inline-flex gap-0.5 mb-4">
          <TabsTrigger value="2" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">
            Form 2 — Expenditures
          </TabsTrigger>
          <TabsTrigger value="3" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">
            Form 3 — Personnel
          </TabsTrigger>
          <TabsTrigger value="4" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">
            Form 4 — AIP Programs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="2">
          <Form2
            plan={plan}
            pastYearPlan={pastYearPlan}
            obligationYearPlan={obligationYearPlan}
            classifications={classifications}
            expenseItems={expenseItems}
            isEditable={isEditable}
            onItemUpdate={fetchData}
          />
        </TabsContent>

        <TabsContent value="3">
          <Form3
            plan={plan}
            pastYearPlan={pastYearPlan}
            departmentId={plan.dept_id}
            isEditable={isEditable}
          />
        </TabsContent>

        <TabsContent value="4">
          <Form4
            plan={plan}
            isEditable={isEditable}
          />
        </TabsContent>
      </Tabs>

      {/* ── Submit Confirm Dialog ── */}
      <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Submit budget plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              Once submitted, you will <span className="font-medium text-gray-700">no longer be able to edit</span> this
              plan until the Budget Officer returns it for revision. Make sure all forms are complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Submit for Review'
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetPlanDetail;