import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Badge } from '@/src/components/ui/badge';
import { Separator } from '@/src/components/ui/separator';
import { Download, Eye, FileText, Loader2, RefreshCw } from 'lucide-react';
import API from '../../services/api';

/* ─── Types ─────────────────────────────────────────────── */
interface BudgetPlan {
  budget_plan_id: number;
  year: number;
  is_active: boolean;
}
interface Department {
  dept_id: number;
  dept_name: string;
  dept_abbreviation: string;
}

const FORMS = [
  { id: 'form2', label: 'LBP Form No. 2', desc: 'Programmed Appropriation by Object of Expenditures' },
  { id: 'form3', label: 'LBP Form No. 3', desc: 'Plantilla of Personnel' },
  { id: 'form4', label: 'LBP Form No. 4', desc: 'Annual Investment Program (Special Programs)' },
] as const;
type FormId = typeof FORMS[number]['id'];

/* ════════════════════════════════════════════════════════════
   REPORTS PAGE
════════════════════════════════════════════════════════════ */
const ReportsPage: React.FC = () => {
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedForms, setSelectedForms] = useState<Set<FormId>>(new Set(['form2']));
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  /* ── Init ── */
  useEffect(() => {
    (async () => {
      try {
        const [plansRes, deptsRes] = await Promise.all([
          API.get('/budget-plans'),
          API.get('/departments'),
        ]);
        const plans: BudgetPlan[] = (plansRes.data.data ?? []).sort(
          (a: BudgetPlan, b: BudgetPlan) => b.year - a.year
        );
        setBudgetPlans(plans);
        setDepartments(deptsRes.data.data ?? []);
        const active = plans.find((p: BudgetPlan) => p.is_active);
        if (active) setSelectedPlanId(String(active.budget_plan_id));
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  /* ── Cleanup blob URL ── */
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  /* ── Toggle form (keep at least 1) ── */
  const toggleForm = (id: FormId) => {
    setSelectedForms((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  /* ── Shared PDF fetcher (POST + anti‑intercept measures) ── */
  const fetchPdf = useCallback(
  async (download: boolean): Promise<Blob> => {
    const params: Record<string, unknown> = {
      budget_plan_id: selectedPlanId,
      department: selectedDept,
      'forms[]': Array.from(selectedForms),
      _: Date.now(),
    };
    if (download) params.download = true;

    try {
      const response = await API.post('/reports/generate', null, {
        params,
        responseType: 'blob',
        headers: {
          Accept: 'application/pdf',
          'X-Requested-With': 'XMLHttpRequest',
          'X-No-Intercept': 'true',
        },
      });

      // If the response is empty (0 bytes) or content-type is not PDF, assume interception
      if (response.headers['content-type'] !== 'application/pdf') {
        const text = await response.data.text();
        let message = 'Server returned an error';
        try {
          const json = JSON.parse(text);
          message = json.message || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      // Check blob size (some IDM interceptions return 0-byte blob)
      if (response.data.size === 0) {
        throw new Error('Empty PDF – possibly intercepted by download manager');
      }

      return response.data;
    } catch (error: any) {
      // If we suspect IDM interception, offer a fallback
      if (
        error.message.includes('Empty PDF') ||
        error.message.includes('intercepted') ||
        (error.response && error.response.status === 204)
      ) {
        // Build the same URL and open in new tab as fallback
        const url = new URL(API.defaults.baseURL + '/reports/generate');
        url.search = new URLSearchParams(params as any).toString();
        window.open(url.toString(), '_blank');
        throw new Error('Download manager interfered – opening in new tab. Please disable IDM for localhost.');
      }
      throw error;
    }
  },
  [selectedPlanId, selectedDept, selectedForms]
);

  const isReady = Boolean(selectedPlanId) && selectedForms.size > 0;

  /* ── Preview ── */
  const handlePreview = async () => {
    if (!isReady || loadingPreview) return;
    setLoadingPreview(true);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  /* ── Download ── */
  const handleDownload = async () => {
    if (!isReady || loadingDl) return;
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const plan = budgetPlans.find((p) => String(p.budget_plan_id) === selectedPlanId);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `Budget_FY${plan?.year ?? ''}_${
          selectedDept === 'all' ? 'AllDepts' : `Dept${selectedDept}`
        }_${Array.from(selectedForms)
          .join('-')
          .toUpperCase()}.pdf`,
      });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download PDF');
    } finally {
      setLoadingDl(false);
    }
  };

  const selectedPlan = budgetPlans.find((p) => String(p.budget_plan_id) === selectedPlanId);
  const selectedDeptName =
    selectedDept === 'all'
      ? 'All Departments'
      : departments.find((d) => String(d.dept_id) === selectedDept)?.dept_name ?? '—';

  return (
    <div className="flex flex-col h-full gap-5 p-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Budget Reports</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Generate LBP Forms 2, 3, and 4 — preview before downloading.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-5 flex-1 min-h-0">
        {/* ── Left: options ── */}
        <div className="flex flex-col gap-4 w-full xl:w-72 flex-shrink-0">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Budget Plan</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Select
                value={selectedPlanId}
                onValueChange={setSelectedPlanId}
                disabled={loadingInit}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
                </SelectTrigger>
                <SelectContent>
                  {budgetPlans.map((p) => (
                    <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
                      <span className="flex items-center gap-2">
                        FY {p.year}
                        {p.is_active && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
                            Active
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Department</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Select
                value={selectedDept}
                onValueChange={setSelectedDept}
                disabled={loadingInit}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.dept_id} value={String(d.dept_id)}>
                      {d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Forms to Include</CardTitle>
              <CardDescription className="text-xs">At least one required.</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {FORMS.map((form) => (
                <label key={form.id} htmlFor={form.id} className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    id={form.id}
                    checked={selectedForms.has(form.id)}
                    onCheckedChange={() => toggleForm(form.id)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <div className="text-sm font-medium text-zinc-800">{form.label}</div>
                    <div className="text-xs text-zinc-500">{form.desc}</div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs text-zinc-600 space-y-1">
            <div>
              <span className="font-semibold text-zinc-700">Plan:</span>{' '}
              {selectedPlan ? `FY ${selectedPlan.year}` : '—'}
            </div>
            <div>
              <span className="font-semibold text-zinc-700">Dept:</span> {selectedDeptName}
            </div>
            <div>
              <span className="font-semibold text-zinc-700">Forms:</span>{' '}
              {selectedForms.size > 0
                ? Array.from(selectedForms)
                    .map((f) => f.toUpperCase())
                    .join(', ')
                : '—'}
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePreview}
              disabled={!isReady || loadingPreview || loadingDl}
              variant="outline"
              className="w-full"
            >
              {loadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview PDF
                </>
              )}
            </Button>
            <Button
              onClick={handleDownload}
              disabled={!isReady || loadingDl || loadingPreview}
              className="w-full"
            >
              {loadingDl ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ── Right: PDF preview ── */}
        <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-zinc-200 overflow-hidden bg-zinc-100">
          {previewUrl && (
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-zinc-200 flex-shrink-0">
              <span className="text-xs text-zinc-500 font-medium">
                Preview — {selectedPlan ? `FY ${selectedPlan.year}` : ''}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handlePreview}
                  disabled={loadingPreview}
                >
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={handleDownload}
                  disabled={loadingDl}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Save
                </Button>
              </div>
            </div>
          )}

          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={`${previewUrl}#toolbar=1&navpanes=0`}
              className="flex-1 w-full border-0"
              title="PDF Preview"
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <FileText className="w-14 h-14 text-zinc-300" />
              <div>
                <p className="text-sm font-medium text-zinc-500">No preview yet</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {loadingPreview
                    ? 'Generating PDF…'
                    : 'Select options above, then click "Preview PDF".'}
                </p>
              </div>
              {!loadingPreview && isReady && (
                <Button size="sm" variant="outline" className="mt-1" onClick={handlePreview}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview PDF
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;