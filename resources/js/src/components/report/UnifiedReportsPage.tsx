// // /**
// //  * resources/js/components/admin/UnifiedReportsPage.tsx
// //  *
// //  * Unified LBP Reports UI — Forms 1–5 with:
// //  *   • Individual form generation (preview + download)
// //  *   • "Generate All" → downloads ZIP (all selected forms, all scopes)
// //  *   • Form checkboxes, department selector, budget plan selector
// //  *   • PDF preview panel (iframe)
// //  */

// // import React, { useState, useEffect, useCallback, useRef } from 'react';
// // import { toast } from 'sonner';
// // import { Button } from '@/src/components/ui/button';
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
// // import { Checkbox } from '@/src/components/ui/checkbox';
// // import { Badge } from '@/src/components/ui/badge';
// // import { Separator } from '@/src/components/ui/separator';
// // import {
// //   Download, Eye, FileText, Loader2, RefreshCw, Package, Info, ChevronDown, ChevronRight,
// // } from 'lucide-react';
// // import API from '@/src/services/api';

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface BudgetPlan { budget_plan_id: number; year: number; is_active: boolean; }
// // interface Department  { dept_id: number; dept_name: string; dept_abbreviation: string; }
// // interface FilterOption { value: string; label: string; }

// // // ─── Form definitions ────────────────────────────────────────────────────────

// // const FORM_DEFS = [
// //   {
// //     id: 'form1',
// //     label: 'LBP Form No. 1',
// //     desc: 'Budget of Expenditures & Sources of Financing (B.E.S.F.)',
// //     orientation: 'portrait' as const,
// //     needsScope: true,   // has a filter/scope selector
// //     needsDept: false,
// //   },
// //   {
// //     id: 'summary',
// //     label: 'Summary of Expenditures',
// //     desc: 'Summary of Expenditures by Office (General Fund)',
// //     orientation: 'portrait' as const,
// //     needsScope: false,
// //     needsDept: false,
// //   },
// //   {
// //     id: 'form5',
// //     label: 'LBP Form No. 5',
// //     desc: 'Statement of Indebtedness',
// //     orientation: 'landscape' as const,
// //     needsScope: false,
// //     needsDept: false,
// //   },
// //   {
// //     id: 'form6',
// //     label: 'LBP Form No. 6',
// //     desc: 'Statement of Statutory and Contractual Obligations',
// //     orientation: 'portrait' as const,
// //     needsScope: true,   // has the same filter dropdown as Form 1
// //     needsDept: false,
// //   },
// //   {
// //       id: 'form7',
// //       label: 'LBP Form No. 7',
// //       desc: 'Statement of Fund Allocation by Sector',
// //       orientation: 'portrait' as const,
// //       needsScope: true,   // same General Fund / Special Accounts selector as Form 1 & 6
// //       needsDept: false,
// //     },
// //     {
// //     id: 'pscomputation',
// //     label: 'PS Computation',
// //     desc: 'Personnel Services Computation (GF)',
// //     orientation: 'portrait' as const,
// //     needsScope: false,
// //     needsDept: false,
// //   },
// //     {
// //     id: 'mdf20',
// //     label: '20% MDF Report',
// //     desc: '20% Municipal Development Fund',
// //     orientation: 'portrait' as const,
// //     needsScope: false,
// //     needsDept: false,
// //   },
// //   {
// //     id: 'calamity5',
// //     label: '5% Calamity Fund',
// //     desc: 'LDRRMF Investment Plan (General Fund & Special Accounts)',
// //     orientation: 'landscape' as const,
// //     needsScope: true,
// //     needsDept: false,
// //   },
// //   {
// //     id: 'form2',
// //     label: 'LBP Form No. 2',
// //     desc: 'Programmed Appropriation by Object of Expenditures',
// //     orientation: 'portrait' as const,
// //     needsScope: false,
// //     needsDept: true,
// //   },
// //   {
// //     id: 'form3',
// //     label: 'LBP Form No. 3',
// //     desc: 'Plantilla of Personnel',
// //     orientation: 'portrait' as const,
// //     needsScope: false,
// //     needsDept: true,
// //   },
// //   {
// //     id: 'form4',
// //     label: 'LBP Form No. 4',
// //     desc: 'Annual Investment Program (Special Programs)',
// //     orientation: 'portrait' as const,
// //     needsScope: false,
// //     needsDept: true,
// //   },





// //   ] as const;

// // type FormId = typeof FORM_DEFS[number]['id'];

// // // ─── Endpoint resolver ───────────────────────────────────────────────────────

// // // function endpointFor(forms: FormId[]): string {
// // //   if (forms.includes('form1') && forms.length === 1) return '/reports/unified/form1';
// // //   if (forms.includes('form5') && forms.length === 1) return '/reports/unified/form5';
// // //   const deptForms = forms.filter(f => ['form2','form3','form4'].includes(f));
// // //   if (deptForms.length === forms.length) return '/reports/unified/dept';
// // //   return ''; // mixed — use generate-all
// // // }
// //   function endpointFor(forms: FormId[]): string {
// //     if (forms.includes('form1')   && forms.length === 1) return '/reports/unified/form1';
// //     if (forms.includes('form5')   && forms.length === 1) return '/reports/unified/form5';
// //     if (forms.includes('summary') && forms.length === 1) return '/reports/unified/summary';
// //     if (forms.includes('form6') && forms.length === 1) return '/reports/unified/form6pdf';
// //     if (forms.includes('form7') && forms.length === 1) return '/reports/unified/form7pdf';
// //     if (forms.includes('pscomputation') && forms.length === 1) return '/reports/unified/pscomputationpdf';
// //     if (forms.includes('mdf20') && forms.length === 1) return '/reports/unified/mdf20pdf';
// //     if (forms.includes('calamity5') && forms.length === 1) return '/reports/unified/calamity5pdf';
// //     const deptForms = forms.filter(f => ['form2','form3','form4'].includes(f));
// //     if (deptForms.length === forms.length) return '/reports/unified/dept';
// //     return '';
// //   }

// // // ═════════════════════════════════════════════════════════════════════════════
// // // COMPONENT
// // // ═════════════════════════════════════════════════════════════════════════════

// // const UnifiedReportsPage: React.FC = () => {

// //   // ── State ──────────────────────────────────────────────────────────────────
// //   const [budgetPlans,    setBudgetPlans]    = useState<BudgetPlan[]>([]);
// //   const [departments,    setDepartments]    = useState<Department[]>([]);
// //   const [filterOptions,  setFilterOptions]  = useState<FilterOption[]>([
// //     { value: 'all',          label: 'All (General Fund + Special Accounts)' },
// //     { value: 'general-fund', label: 'General Fund only' },
// //   ]);

// //   const [selectedPlanId, setSelectedPlanId] = useState<string>('');
// //   const [selectedDept,   setSelectedDept]   = useState<string>('all');
// //   const [selectedFilter, setSelectedFilter] = useState<string>('all');
// //   const [selectedForms,  setSelectedForms]  = useState<Set<FormId>>(new Set(['form1']));

// //   const [loadingInit,    setLoadingInit]    = useState(true);
// //   const [loadingPreview, setLoadingPreview] = useState(false);
// //   const [loadingDl,      setLoadingDl]      = useState(false);
// //   const [loadingAll,     setLoadingAll]     = useState(false);
// //   const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);

// //   const [showInfo, setShowInfo] = useState(false);

// //   // ── Init ───────────────────────────────────────────────────────────────────
// //   useEffect(() => {
// //     (async () => {
// //       try {
// //         const [plansRes, deptsRes, sourcesRes] = await Promise.all([
// //           API.get('/budget-plans'),
// //           API.get('/departments'),
// //           API.get('/reports/unified/sources').catch(() => null),
// //         ]);

// //         const plans: BudgetPlan[] = (plansRes.data.data ?? []).sort(
// //           (a: BudgetPlan, b: BudgetPlan) => b.year - a.year
// //         );
// //         setBudgetPlans(plans);
// //         setDepartments(deptsRes.data.data ?? []);

// //         const active = plans.find((p: BudgetPlan) => p.is_active);
// //         if (active) setSelectedPlanId(String(active.budget_plan_id));

// //         if (sourcesRes?.data?.data) setFilterOptions(sourcesRes.data.data);
// //       } catch {
// //         toast.error('Failed to load data');
// //       } finally {
// //         setLoadingInit(false);
// //       }
// //     })();
// //   }, []);

// //   // ── Cleanup blob URL ───────────────────────────────────────────────────────
// //   useEffect(
// //     () => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); },
// //     [previewUrl]
// //   );

// //   // ── Helpers ────────────────────────────────────────────────────────────────
// //   const toggleForm = (id: FormId) => {
// //     setSelectedForms(prev => {
// //       const next = new Set(prev);
// //       if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); }
// //       else               next.add(id);
// //       return next;
// //     });
// //     setPreviewUrl(null);
// //   };

// //   const isReady      = Boolean(selectedPlanId) && selectedForms.size > 0;
// //   const forms        = Array.from(selectedForms) as FormId[];
// //   const hasDeptForms = forms.some(f => ['form2','form3','form4'].includes(f));
// //   const hasForm1  = forms.includes('form1');
// //   const hasForm6     = forms.includes('form6');
// //   const hasForm7     = forms.includes('form7');
// //   const hasCalamity5 = forms.includes('calamity5');
// //   const hasScopeForm = hasForm1 || hasForm6 || hasForm7 || hasCalamity5;
// //   // const hasScopeForm = hasForm1 || hasForm6 || hasForm7;

// //   const scopeLabel = (() => {
// //     const scopeForms = [hasForm1 && '1', hasForm6 && '6', hasForm7 && '7'].filter(Boolean);
// //     if (scopeForms.length > 1) return `Form ${scopeForms.join(' & ')} Scope`;
// //     if (hasForm7) return 'Form 7 Scope';
// //     if (hasForm6) return 'Form 6 Scope';
// //     return 'Form 1 Scope';
// //   })();
// //   const hasForm5     = forms.includes('form5');

// //   // Can preview a single-endpoint selection
// //   const singleEndpoint = endpointFor(forms);
// //   const canPreview     = isReady && Boolean(singleEndpoint);

// //   // ── Build params for a single-form request ────────────────────────────────
// //   // const buildParams = useCallback((download: boolean): Record<string, unknown> => {
// //   //   const p: Record<string, unknown> = {
// //   //     budget_plan_id: selectedPlanId,
// //   //     _: Date.now(),
// //   //   };
// //   //   if (download) p.download = true;

// //   //   if (forms.includes('form1'))                                    p.filter = selectedFilter;
// //   //   if (forms.some(f => ['form2','form3','form4'].includes(f))) {
// //   //     p.department = selectedDept;
// //   //     p['forms[]'] = forms.filter(f => ['form2','form3','form4'].includes(f));
// //   //   }
// //   //   return p;
// //   // }, [selectedPlanId, selectedFilter, selectedDept, forms]);
// //   const buildParams = useCallback((download: boolean): Record<string, unknown> => {
// //   const p: Record<string, unknown> = {
// //     budget_plan_id: selectedPlanId,
// //     _: Date.now(),
// //   };
// //   if (download) p.download = true;

// //   // Both form1 and form6 use the filter
// //   if (forms.includes('form1') || forms.includes('form6') || forms.includes('form7')) p.filter = selectedFilter;
// //   if (forms.some(f => ['form2','form3','form4'].includes(f))) {
// //     p.department = selectedDept;
// //     p['forms[]'] = forms.filter(f => ['form2','form3','form4'].includes(f));
// //   }
// //   return p;
// // }, [selectedPlanId, selectedFilter, selectedDept, forms]);

// //   // ── Fetch PDF blob (single endpoint) ─────────────────────────────────────
// //   const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
// //     const endpoint = endpointFor(forms);
// //     if (!endpoint) throw new Error('Mixed forms — use Generate All to download as ZIP.');

// //     const response = await API.post(endpoint, null, {
// //       params: buildParams(download),
// //       responseType: 'blob',
// //       headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
// //     });

// //     if (!response.headers['content-type']?.includes('application/pdf')) {
// //       const text = await (response.data as Blob).text();
// //       let msg = 'Server error';
// //       try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
// //       throw new Error(msg);
// //     }
// //     if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
// //     return response.data as Blob;
// //   }, [forms, buildParams]);

// //   // ── Preview ────────────────────────────────────────────────────────────────
// //   const handlePreview = async () => {
// //     if (!canPreview || loadingPreview) return;
// //     setLoadingPreview(true);
// //     if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
// //     try {
// //       const blob = await fetchPdf(false);
// //       setPreviewUrl(URL.createObjectURL(blob));
// //     } catch (err: any) {
// //       toast.error(err.message ?? 'Failed to generate preview');
// //     } finally {
// //       setLoadingPreview(false);
// //     }
// //   };

// //   // ── Download single PDF ────────────────────────────────────────────────────
// //   const handleDownload = async () => {
// //     if (!canPreview || loadingDl) return;
// //     setLoadingDl(true);
// //     try {
// //       const blob = await fetchPdf(true);
// //       const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
// //       const label = forms.map(f => f.toUpperCase()).join('-');
// //       const url   = URL.createObjectURL(blob);
// //       const a     = Object.assign(document.createElement('a'), {
// //         href: url,
// //         download: `LBP_${label}_FY${plan?.year ?? ''}.pdf`,
// //       });
// //       document.body.appendChild(a); a.click(); document.body.removeChild(a);
// //       URL.revokeObjectURL(url);
// //       toast.success('PDF downloaded');
// //     } catch (err: any) {
// //       toast.error(err.message ?? 'Failed to download');
// //     } finally {
// //       setLoadingDl(false);
// //     }
// //   };

// //   // ── Generate All → ZIP ────────────────────────────────────────────────────
// //   const handleGenerateAll = async () => {
// //     if (!isReady || loadingAll) return;
// //     setLoadingAll(true);
// //     try {
// //       const plan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
// //       const response = await API.post('/reports/unified/generate-all', null, {
// //         params: {
// //           budget_plan_id: selectedPlanId,
// //           'forms[]':      forms,
// //           _:              Date.now(),
// //         },
// //         responseType: 'blob',
// //         headers: { Accept: 'application/zip', 'X-Requested-With': 'XMLHttpRequest' },
// //       });

// //       if ((response.data as Blob).size === 0) throw new Error('Empty ZIP received');

// //       const url = URL.createObjectURL(response.data as Blob);
// //       const a   = Object.assign(document.createElement('a'), {
// //         href:     url,
// //         download: `LBP_AllForms_FY${plan?.year ?? ''}.zip`,
// //       });
// //       document.body.appendChild(a); a.click(); document.body.removeChild(a);
// //       URL.revokeObjectURL(url);
// //       toast.success('ZIP downloaded — check your downloads folder');
// //     } catch (err: any) {
// //       toast.error(err.message ?? 'Failed to generate ZIP');
// //     } finally {
// //       setLoadingAll(false);
// //     }
// //   };

// //   // ── Derived labels ─────────────────────────────────────────────────────────
// //   const selectedPlan   = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
// //   const selectedDeptName = selectedDept === 'all'
// //     ? 'All Departments'
// //     : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';

// //   const isBusy = loadingPreview || loadingDl || loadingAll;

// //   // ── ZIP outline (tooltip content) ─────────────────────────────────────────
// //   const zipContents = () => {
// //     const lines: string[] = ['📁 01_GeneralFund/'];
// //     if (hasForm1)                   lines.push('  • Form1_GeneralFund_FY***.pdf');
// //     if (hasDeptForms)               lines.push('  • Forms_[2-3-4]_[Dept]_FY***.pdf  (each dept)');
// //     if (hasForm5)                   lines.push('  • Form5_Indebtedness_FY***.pdf');
// //     if (hasForm6)                   lines.push('  • Form6_StatutoryObligations_GF_FY***.pdf');
// //     if (hasForm7)                   lines.push('  • Form7_FundAllocationBySector_GF_FY***.pdf');
// //     if (forms.includes('summary'))  lines.push('  • SummaryOfExpenditures_FY***.pdf');
// //     if (forms.includes('pscomputation')) lines.push('  • PS_Computation_FY***.pdf');
// //     if (forms.includes('mdf20'))    lines.push('  • 20MDF_FY***.pdf');
// //     if (forms.includes('calamity5')) lines.push('  • 5pct_CalamityFund_GF_FY***.pdf');
// //     lines.push('📁 02_SA_[ABBR]/  (per Special Account dept)');
// //     if (hasForm1)                   lines.push('  • Form1_[ABBR]_FY***.pdf');
// //     if (hasDeptForms)               lines.push('  • Forms_[2-3-4]_[ABBR]_FY***.pdf');
// //     if (hasForm6)                   lines.push('  • Form6_[ABBR]_FY***.pdf');
// //     if (hasForm7)                   lines.push('  • Form7_FundAllocationBySector_[ABBR]_FY***.pdf');
// //     if (forms.includes('calamity5')) lines.push('  • 5pct_CalamityFund_[ABBR]_FY***.pdf');
// //     return lines.join('\n');
// //   };

// //   // ════════════════════════════════════════════════════════════════════════════
// //   // RENDER
// //   // ════════════════════════════════════════════════════════════════════════════

// //   return (
// //     <div className="h-screen flex flex-col overflow-hidden bg-white">

// //       {/* ── Top bar ── */}
// //       <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-100">
// //         <div>
// //           <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Budget Reports</p>
// //           <h1 className="text-lg font-bold text-zinc-900 leading-tight">LBP Forms</h1>
// //           <p className="text-[11px] text-zinc-400">Unified report generator — preview or download as PDF / ZIP</p>
// //         </div>

// //         {previewUrl && (
// //           <div className="flex items-center gap-2">
// //             <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
// //             <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
// //               onClick={handlePreview} disabled={isBusy}>
// //               <RefreshCw className="h-3 w-3" />Refresh
// //             </Button>
// //             <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
// //               onClick={handleDownload} disabled={isBusy || !canPreview}>
// //               <Download className="h-3 w-3" />Save PDF
// //             </Button>
// //           </div>
// //         )}
// //       </div>

// //       {/* ── Body ── */}
// //       <div className="flex flex-1 min-h-0 overflow-hidden">

// //         {/* ── Left sidebar ── */}
// //         <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

// //           {/* Budget Plan */}
// //           <div>
// //             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
// //             <Select value={selectedPlanId}
// //               onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }}
// //               disabled={loadingInit}>
// //               <SelectTrigger className="w-full h-7 text-xs bg-white">
// //                 <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
// //               </SelectTrigger>
// //               <SelectContent>
// //                 {budgetPlans.map(p => (
// //                   <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
// //                     <span className="flex items-center gap-1.5">
// //                       FY {p.year}
// //                       {p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}
// //                     </span>
// //                   </SelectItem>
// //                 ))}
// //               </SelectContent>
// //             </Select>
// //           </div>

// //           {/* Forms to include */}
// //           <div>
// //             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">
// //               Forms to Include
// //             </p>
// //             <div className="space-y-2">
// //               {FORM_DEFS.map(form => (
// //                 <label key={form.id} htmlFor={`chk-${form.id}`}
// //                   className="flex items-start gap-2 cursor-pointer group">
// //                   <Checkbox
// //                     id={`chk-${form.id}`}
// //                     checked={selectedForms.has(form.id)}
// //                     onCheckedChange={() => toggleForm(form.id)}
// //                     className="mt-0.5 flex-shrink-0"
// //                   />
// //                   <div>
// //                     <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
// //                       {form.label}
// //                       {form.orientation === 'landscape' && (
// //                         <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>
// //                       )}
// //                     </div>
// //                     <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
// //                   </div>
// //                 </label>
// //               ))}
// //             </div>
// //           </div>

// //           {/* Scope — only shown when Form 1 is selected */}
// //           {/* {hasForm1 && (
// //             <div>
// //               <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
// //                 Form 1 Scope
// //               </p>
// //               <Select value={selectedFilter}
// //                 onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }}
// //                 disabled={loadingInit}>
// //                 <SelectTrigger className="w-full h-7 text-xs bg-white">
// //                   <SelectValue />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   {filterOptions.map(opt => (
// //                     <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>
// //           )} */}
// //           {hasScopeForm && (
// //   <div>
// //     <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
// //       {scopeLabel}
// //     </p>
// //     <Select value={selectedFilter}
// //       onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }}
// //       disabled={loadingInit}>
// //       <SelectTrigger className="w-full h-7 text-xs bg-white">
// //         <SelectValue />
// //       </SelectTrigger>
// //       <SelectContent>
// //         {filterOptions.map(opt => (
// //           <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
// //         ))}
// //       </SelectContent>
// //     </Select>
// //   </div>
// // )}

// //           {/* Department — shown when Form 2/3/4 selected */}
// //           {hasDeptForms && (
// //             <div>
// //               <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
// //                 Department
// //               </p>
// //               <Select value={selectedDept}
// //                 onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }}
// //                 disabled={loadingInit}>
// //                 <SelectTrigger className="w-full h-7 text-xs bg-white">
// //                   <SelectValue />
// //                 </SelectTrigger>
// //                 <SelectContent>
// //                   <SelectItem value="all">All Departments</SelectItem>
// //                   {departments.map(d => (
// //                     <SelectItem key={d.dept_id} value={String(d.dept_id)}>
// //                       {d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}
// //                     </SelectItem>
// //                   ))}
// //                 </SelectContent>
// //               </Select>
// //             </div>
// //           )}

// //           {/* Summary card */}
// //           {selectedPlan && (
// //             <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
// //               <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
// //               {/* {hasForm1 && <p>Form 1: {filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</p>} */}
// //               {hasScopeForm && <p>{scopeLabel}: {filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</p>}
// //               {hasDeptForms && <p>Depts: {selectedDeptName}</p>}
// //               <p>Forms: {forms.map(f => f.toUpperCase()).join(', ')}</p>
// //             </div>
// //           )}

// //           <Separator />

// //           {/* Action buttons */}
// //           <div className="flex flex-col gap-1.5">

// //             {/* Preview — only for single-endpoint combos */}
// //             {canPreview ? (
// //               <Button onClick={handlePreview}
// //                 disabled={!isReady || isBusy}
// //                 variant="outline" size="sm" className="w-full h-7 text-xs">
// //                 {loadingPreview
// //                   ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</>
// //                   : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
// //               </Button>
// //             ) : (
// //               <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">
// //                 Mixed forms — use<br />"Generate All ZIP" below
// //               </div>
// //             )}

// //             {/* Download single PDF */}
// //             {canPreview && (
// //               <Button onClick={handleDownload}
// //                 disabled={!isReady || isBusy}
// //                 size="sm" className="w-full h-7 text-xs">
// //                 {loadingDl
// //                   ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</>
// //                   : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
// //               </Button>
// //             )}

// //             {/* Generate All — always shown */}
// //             <div className="mt-1">
// //               <div
// //                 className="flex items-center gap-1 mb-1 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600"
// //                 onClick={() => setShowInfo(v => !v)}
// //               >
// //                 {showInfo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
// //                 ZIP structure
// //               </div>
// //               {showInfo && (
// //                 <pre className="rounded bg-zinc-100 p-1.5 text-[9px] text-zinc-500 whitespace-pre-wrap leading-relaxed mb-1.5">
// //                   {zipContents()}
// //                 </pre>
// //               )}
// //               <Button
// //                 onClick={handleGenerateAll}
// //                 disabled={!isReady || isBusy}
// //                 size="sm"
// //                 className="w-full h-8 text-xs bg-zinc-900 hover:bg-zinc-700 text-white"
// //               >
// //                 {loadingAll
// //                   ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Building ZIP…</>
// //                   : <><Package className="mr-1.5 h-3.5 w-3.5" />Generate All — Download ZIP</>}
// //               </Button>
// //               <p className="text-[9px] text-zinc-400 mt-1 text-center leading-tight">
// //                 General Fund first, then each Special Account dept
// //               </p>
// //             </div>
// //           </div>
// //         </div>

// //         {/* ── Right panel: iframe preview ── */}
// //         <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">
// //           {previewUrl ? (
// //             <iframe
// //               key={previewUrl}
// //               src={`${previewUrl}#toolbar=1&navpanes=0`}
// //               className="flex-1 w-full border-0 block"
// //               style={{ height: '100%' }}
// //               title="PDF Preview"
// //             />
// //           ) : (
// //             <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
// //               {loadingPreview ? (
// //                 <>
// //                   <Loader2 className="w-10 h-10 text-zinc-300 animate-spin" />
// //                   <p className="text-sm text-zinc-400">Generating PDF…</p>
// //                 </>
// //               ) : loadingAll ? (
// //                 <>
// //                   <Package className="w-10 h-10 text-zinc-300" />
// //                   <p className="text-sm text-zinc-400">Building ZIP — this may take a moment…</p>
// //                 </>
// //               ) : (
// //                 <>
// //                   <FileText className="w-14 h-14 text-zinc-200" />
// //                   <div>
// //                     <p className="text-sm font-medium text-zinc-400">No preview yet</p>
// //                     <p className="text-xs text-zinc-400 mt-0.5">
// //                       {canPreview
// //                         ? 'Select options and click Preview PDF'
// //                         : 'Select forms and click Generate All to download ZIP'}
// //                     </p>
// //                   </div>
// //                   {canPreview && isReady && (
// //                     <Button size="sm" variant="outline" className="mt-1 text-xs h-7"
// //                       onClick={handlePreview} disabled={isBusy}>
// //                       <Eye className="mr-1.5 h-3 w-3" />Preview PDF
// //                     </Button>
// //                   )}
// //                   {isReady && !canPreview && (
// //                     <Button size="sm"
// //                       className="mt-1 text-xs h-7 bg-zinc-900 hover:bg-zinc-700 text-white"
// //                       onClick={handleGenerateAll} disabled={isBusy}>
// //                       <Package className="mr-1.5 h-3 w-3" />Generate All — Download ZIP
// //                     </Button>
// //                   )}
// //                 </>
// //               )}
// //             </div>
// //           )}
// //         </div>

// //       </div>
// //     </div>
// //   );
// // };

// // export default UnifiedReportsPage;



// /**
//  * resources/js/components/admin/UnifiedReportsPage.tsx
//  *
//  * Unified LBP Reports UI — Two main tabs:
//  *   1. Annual Budget Proposal (original unified forms with Select All)
//  *   2. Local Expenditure Program (LEP forms)
//  */

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { toast } from 'sonner';
// import { Button } from '@/src/components/ui/button';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
// import { Checkbox } from '@/src/components/ui/checkbox';
// import { Badge } from '@/src/components/ui/badge';
// import { Separator } from '@/src/components/ui/separator';
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
// import {
//   Download, Eye, FileText, Loader2, RefreshCw, Package, ChevronDown, ChevronRight,
//   BookOpen, ClipboardList,
// } from 'lucide-react';
// import API from '@/src/services/api';

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface BudgetPlan { budget_plan_id: number; year: number; is_active: boolean; }
// interface Department  { dept_id: number; dept_name: string; dept_abbreviation: string; }
// interface FilterOption { value: string; label: string; }

// // ─── ABP Form definitions ────────────────────────────────────────────────────

// const FORM_DEFS = [
//   {
//     id: 'form1',
//     label: 'LBP Form No. 1',
//     desc: 'Budget of Expenditures & Sources of Financing (B.E.S.F.)',
//     orientation: 'portrait' as const,
//     needsScope: true,
//     needsDept: false,
//   },
//   {
//     id: 'summary',
//     label: 'Summary of Expenditures',
//     desc: 'Summary of Expenditures by Office (General Fund)',
//     orientation: 'portrait' as const,
//     needsScope: false,
//     needsDept: false,
//   },
//   {
//     id: 'form5',
//     label: 'LBP Form No. 5',
//     desc: 'Statement of Indebtedness',
//     orientation: 'landscape' as const,
//     needsScope: false,
//     needsDept: false,
//   },
//   {
//     id: 'form6',
//     label: 'LBP Form No. 6',
//     desc: 'Statement of Statutory and Contractual Obligations',
//     orientation: 'portrait' as const,
//     needsScope: true,
//     needsDept: false,
//   },
//   {
//     id: 'form7',
//     label: 'LBP Form No. 7',
//     desc: 'Statement of Fund Allocation by Sector',
//     orientation: 'portrait' as const,
//     needsScope: true,
//     needsDept: false,
//   },
//   {
//     id: 'pscomputation',
//     label: 'PS Computation',
//     desc: 'Personnel Services Computation (GF)',
//     orientation: 'portrait' as const,
//     needsScope: false,
//     needsDept: false,
//   },
//   {
//     id: 'mdf20',
//     label: '20% MDF Report',
//     desc: '20% Municipal Development Fund',
//     orientation: 'portrait' as const,
//     needsScope: false,
//     needsDept: false,
//   },
//   {
//     id: 'calamity5',
//     label: '5% Calamity Fund',
//     desc: 'LDRRMF Investment Plan (General Fund & Special Accounts)',
//     orientation: 'landscape' as const,
//     needsScope: true,
//     needsDept: false,
//   },
//   {
//     id: 'form2',
//     label: 'LBP Form No. 2',
//     desc: 'Programmed Appropriation by Object of Expenditures',
//     orientation: 'portrait' as const,
//     needsScope: false,
//     needsDept: true,
//   },
//   {
//     id: 'form3',
//     label: 'LBP Form No. 3',
//     desc: 'Plantilla of Personnel',
//     orientation: 'portrait' as const,
//     needsScope: false,
//     needsDept: true,
//   },
//   {
//     id: 'form4',
//     label: 'LBP Form No. 4',
//     desc: 'Annual Investment Program (Special Programs)',
//     orientation: 'portrait' as const,
//     needsScope: false,
//     needsDept: true,
//   },
// ] as const;

// type FormId = typeof FORM_DEFS[number]['id'];

// // ─── LEP Report definitions ───────────────────────────────────────────────────

// type LepFormIdValue = 'consolidated_plantilla'; // extend as new forms are added

// const LEP_FORM_DEFS: ReadonlyArray<{
//   id: LepFormIdValue;
//   label: string;
//   desc: string;
//   orientation: 'portrait' | 'landscape';
//   endpoint: string;
// }> = [
//   {
//     id: 'consolidated_plantilla',
//     label: 'Consolidated Plantilla of Personnel',
//     desc: 'All departments — General Fund + Special Accounts',
//     orientation: 'portrait',
//     endpoint: '/reports/lep/consolidated-plantilla',
//   },
//   // receipt_program will be added later
// ];

// type LepFormId = LepFormIdValue;

// // ─── Endpoint resolver ────────────────────────────────────────────────────────

// function endpointFor(forms: FormId[]): string {
//   if (forms.includes('form1')         && forms.length === 1) return '/reports/unified/form1';
//   if (forms.includes('form5')         && forms.length === 1) return '/reports/unified/form5';
//   if (forms.includes('summary')       && forms.length === 1) return '/reports/unified/summary';
//   if (forms.includes('form6')         && forms.length === 1) return '/reports/unified/form6pdf';
//   if (forms.includes('form7')         && forms.length === 1) return '/reports/unified/form7pdf';
//   if (forms.includes('pscomputation') && forms.length === 1) return '/reports/unified/pscomputationpdf';
//   if (forms.includes('mdf20')         && forms.length === 1) return '/reports/unified/mdf20pdf';
//   if (forms.includes('calamity5')     && forms.length === 1) return '/reports/unified/calamity5pdf';
//   const deptForms = forms.filter(f => ['form2','form3','form4'].includes(f));
//   if (deptForms.length === forms.length) return '/reports/unified/dept';
//   return '';
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // ABP PANEL (Annual Budget Proposal)
// // ═════════════════════════════════════════════════════════════════════════════

// const AbpPanel: React.FC<{
//   budgetPlans: BudgetPlan[];
//   departments: Department[];
//   filterOptions: FilterOption[];
//   loadingInit: boolean;
// }> = ({ budgetPlans, departments, filterOptions, loadingInit }) => {

//   const [selectedPlanId, setSelectedPlanId] = useState<string>('');
//   const [selectedDept,   setSelectedDept]   = useState<string>('all');
//   const [selectedFilter, setSelectedFilter] = useState<string>('all');
//   const [selectedForms,  setSelectedForms]  = useState<Set<FormId>>(new Set(['form1']));

//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [loadingDl,      setLoadingDl]      = useState(false);
//   const [loadingAll,     setLoadingAll]     = useState(false);
//   const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
//   const [showInfo,       setShowInfo]       = useState(false);

//   // Set active plan on init
//   useEffect(() => {
//     const active = budgetPlans.find(p => p.is_active);
//     if (active) setSelectedPlanId(String(active.budget_plan_id));
//   }, [budgetPlans]);

//   useEffect(
//     () => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); },
//     [previewUrl]
//   );

//   // ── Select All ────────────────────────────────────────────────────────────
//   const allFormIds = FORM_DEFS.map(f => f.id) as FormId[];
//   const allSelected = allFormIds.every(id => selectedForms.has(id));
//   const someSelected = allFormIds.some(id => selectedForms.has(id)) && !allSelected;

//   const toggleSelectAll = () => {
//     if (allSelected) {
//       // Deselect all — keep at least one (first)
//       setSelectedForms(new Set([allFormIds[0]]));
//     } else {
//       setSelectedForms(new Set(allFormIds));
//     }
//     setPreviewUrl(null);
//   };

//   const toggleForm = (id: FormId) => {
//     setSelectedForms(prev => {
//       const next = new Set(prev);
//       if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); }
//       else               next.add(id);
//       return next;
//     });
//     setPreviewUrl(null);
//   };

//   const isReady      = Boolean(selectedPlanId) && selectedForms.size > 0;
//   const forms        = Array.from(selectedForms) as FormId[];
//   const hasDeptForms = forms.some(f => ['form2','form3','form4'].includes(f));
//   const hasForm1     = forms.includes('form1');
//   const hasForm6     = forms.includes('form6');
//   const hasForm7     = forms.includes('form7');
//   const hasCalamity5 = forms.includes('calamity5');
//   const hasScopeForm = hasForm1 || hasForm6 || hasForm7 || hasCalamity5;
//   const hasForm5     = forms.includes('form5');

//   const scopeLabel = (() => {
//     const scopeForms = [hasForm1 && '1', hasForm6 && '6', hasForm7 && '7'].filter(Boolean);
//     if (scopeForms.length > 1) return `Form ${scopeForms.join(' & ')} Scope`;
//     if (hasForm7) return 'Form 7 Scope';
//     if (hasForm6) return 'Form 6 Scope';
//     return 'Form 1 Scope';
//   })();

//   const singleEndpoint = endpointFor(forms);
//   const canPreview     = isReady && Boolean(singleEndpoint);

//   const buildParams = useCallback((download: boolean): Record<string, unknown> => {
//     const p: Record<string, unknown> = { budget_plan_id: selectedPlanId, _: Date.now() };
//     if (download) p.download = true;
//     if (forms.includes('form1') || forms.includes('form6') || forms.includes('form7')) p.filter = selectedFilter;
//     if (forms.some(f => ['form2','form3','form4'].includes(f))) {
//       p.department = selectedDept;
//       p['forms[]'] = forms.filter(f => ['form2','form3','form4'].includes(f));
//     }
//     return p;
//   }, [selectedPlanId, selectedFilter, selectedDept, forms]);

//   const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
//     const endpoint = endpointFor(forms);
//     if (!endpoint) throw new Error('Mixed forms — use Generate All to download as ZIP.');
//     const response = await API.post(endpoint, null, {
//       params: buildParams(download),
//       responseType: 'blob',
//       headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
//     });
//     if (!response.headers['content-type']?.includes('application/pdf')) {
//       const text = await (response.data as Blob).text();
//       let msg = 'Server error';
//       try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
//       throw new Error(msg);
//     }
//     if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
//     return response.data as Blob;
//   }, [forms, buildParams]);

//   const handlePreview = async () => {
//     if (!canPreview || loadingPreview) return;
//     setLoadingPreview(true);
//     if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
//     try {
//       const blob = await fetchPdf(false);
//       setPreviewUrl(URL.createObjectURL(blob));
//     } catch (err: any) {
//       toast.error(err.message ?? 'Failed to generate preview');
//     } finally { setLoadingPreview(false); }
//   };

//   const handleDownload = async () => {
//     if (!canPreview || loadingDl) return;
//     setLoadingDl(true);
//     try {
//       const blob = await fetchPdf(true);
//       const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const label = forms.map(f => f.toUpperCase()).join('-');
//       const url   = URL.createObjectURL(blob);
//       const a     = Object.assign(document.createElement('a'), { href: url, download: `LBP_${label}_FY${plan?.year ?? ''}.pdf` });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('PDF downloaded');
//     } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
//     finally { setLoadingDl(false); }
//   };

//   const handleGenerateAll = async () => {
//     if (!isReady || loadingAll) return;
//     setLoadingAll(true);
//     try {
//       const plan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const response = await API.post('/reports/unified/generate-all', null, {
//         params: { budget_plan_id: selectedPlanId, 'forms[]': forms, _: Date.now() },
//         responseType: 'blob',
//         headers: { Accept: 'application/zip', 'X-Requested-With': 'XMLHttpRequest' },
//       });
//       if ((response.data as Blob).size === 0) throw new Error('Empty ZIP received');
//       const url = URL.createObjectURL(response.data as Blob);
//       const a   = Object.assign(document.createElement('a'), { href: url, download: `LBP_AllForms_FY${plan?.year ?? ''}.zip` });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('ZIP downloaded — check your downloads folder');
//     } catch (err: any) { toast.error(err.message ?? 'Failed to generate ZIP'); }
//     finally { setLoadingAll(false); }
//   };

//   const selectedPlan     = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//   const selectedDeptName = selectedDept === 'all'
//     ? 'All Departments'
//     : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';

//   const isBusy = loadingPreview || loadingDl || loadingAll;

//   const zipContents = () => {
//     const lines: string[] = ['📁 01_GeneralFund/'];
//     if (hasForm1)                          lines.push('  • Form1_GeneralFund_FY***.pdf');
//     if (hasDeptForms)                      lines.push('  • Forms_[2-3-4]_[Dept]_FY***.pdf  (each dept)');
//     if (hasForm5)                          lines.push('  • Form5_Indebtedness_FY***.pdf');
//     if (hasForm6)                          lines.push('  • Form6_StatutoryObligations_GF_FY***.pdf');
//     if (hasForm7)                          lines.push('  • Form7_FundAllocationBySector_GF_FY***.pdf');
//     if (forms.includes('summary'))         lines.push('  • SummaryOfExpenditures_FY***.pdf');
//     if (forms.includes('pscomputation'))   lines.push('  • PS_Computation_FY***.pdf');
//     if (forms.includes('mdf20'))           lines.push('  • 20MDF_FY***.pdf');
//     if (forms.includes('calamity5'))       lines.push('  • 5pct_CalamityFund_GF_FY***.pdf');
//     lines.push('📁 02_SA_[ABBR]/  (per Special Account dept)');
//     if (hasForm1)                          lines.push('  • Form1_[ABBR]_FY***.pdf');
//     if (hasDeptForms)                      lines.push('  • Forms_[2-3-4]_[ABBR]_FY***.pdf');
//     if (hasForm6)                          lines.push('  • Form6_[ABBR]_FY***.pdf');
//     if (hasForm7)                          lines.push('  • Form7_FundAllocationBySector_[ABBR]_FY***.pdf');
//     if (forms.includes('calamity5'))       lines.push('  • 5pct_CalamityFund_[ABBR]_FY***.pdf');
//     return lines.join('\n');
//   };

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">
//       {/* ── Left sidebar ── */}
//       <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

//         {/* Budget Plan */}
//         <div>
//           <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
//           <Select value={selectedPlanId}
//             onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }}
//             disabled={loadingInit}>
//             <SelectTrigger className="w-full h-7 text-xs bg-white">
//               <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
//             </SelectTrigger>
//             <SelectContent>
//               {budgetPlans.map(p => (
//                 <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
//                   <span className="flex items-center gap-1.5">
//                     FY {p.year}
//                     {p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}
//                   </span>
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Forms to include */}
//         <div>
//           <div className="flex items-center justify-between mb-1.5">
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">Forms to Include</p>
//           </div>

//           {/* Select All row */}
//           <label htmlFor="chk-select-all"
//             className="flex items-center gap-2 cursor-pointer group mb-2 pb-2 border-b border-zinc-200">
//             <Checkbox
//               id="chk-select-all"
//               checked={allSelected}
//               // indeterminate-like visual when some selected
//               className={`mt-0 flex-shrink-0 ${someSelected ? 'opacity-70' : ''}`}
//               onCheckedChange={toggleSelectAll}
//             />
//             <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">
//               {allSelected ? 'Deselect All' : 'Select All'}
//             </span>
//           </label>

//           <div className="space-y-2">
//             {FORM_DEFS.map(form => (
//               <label key={form.id} htmlFor={`chk-${form.id}`}
//                 className="flex items-start gap-2 cursor-pointer group">
//                 <Checkbox
//                   id={`chk-${form.id}`}
//                   checked={selectedForms.has(form.id)}
//                   onCheckedChange={() => toggleForm(form.id)}
//                   className="mt-0.5 flex-shrink-0"
//                 />
//                 <div>
//                   <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
//                     {form.label}
//                     {form.orientation === 'landscape' && (
//                       <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>
//                     )}
//                   </div>
//                   <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
//                 </div>
//               </label>
//             ))}
//           </div>
//         </div>

//         {/* Scope */}
//         {hasScopeForm && (
//           <div>
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">{scopeLabel}</p>
//             <Select value={selectedFilter}
//               onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }}
//               disabled={loadingInit}>
//               <SelectTrigger className="w-full h-7 text-xs bg-white">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 {filterOptions.map(opt => (
//                   <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         )}

//         {/* Department */}
//         {hasDeptForms && (
//           <div>
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Department</p>
//             <Select value={selectedDept}
//               onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }}
//               disabled={loadingInit}>
//               <SelectTrigger className="w-full h-7 text-xs bg-white">
//                 <SelectValue />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Departments</SelectItem>
//                 {departments.map(d => (
//                   <SelectItem key={d.dept_id} value={String(d.dept_id)}>
//                     {d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         )}

//         {/* Summary card */}
//         {selectedPlan && (
//           <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
//             <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
//             {hasScopeForm && <p>{scopeLabel}: {filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</p>}
//             {hasDeptForms && <p>Depts: {selectedDeptName}</p>}
//             <p>Forms: {forms.map(f => f.toUpperCase()).join(', ')}</p>
//           </div>
//         )}

//         <Separator />

//         {/* Action buttons */}
//         <div className="flex flex-col gap-1.5">
//           {canPreview ? (
//             <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-7 text-xs">
//               {loadingPreview ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</> : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
//             </Button>
//           ) : (
//             <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">
//               Mixed forms — use<br />"Generate All ZIP" below
//             </div>
//           )}

//           {canPreview && (
//             <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-7 text-xs">
//               {loadingDl ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</> : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
//             </Button>
//           )}

//           <div className="mt-1">
//             <div className="flex items-center gap-1 mb-1 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600" onClick={() => setShowInfo(v => !v)}>
//               {showInfo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
//               ZIP structure
//             </div>
//             {showInfo && (
//               <pre className="rounded bg-zinc-100 p-1.5 text-[9px] text-zinc-500 whitespace-pre-wrap leading-relaxed mb-1.5">
//                 {zipContents()}
//               </pre>
//             )}
//             <Button onClick={handleGenerateAll} disabled={!isReady || isBusy} size="sm"
//               className="w-full h-8 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
//               {loadingAll
//                 ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Building ZIP…</>
//                 : <><Package className="mr-1.5 h-3.5 w-3.5" />Generate All — Download ZIP</>}
//             </Button>
//             <p className="text-[9px] text-zinc-400 mt-1 text-center leading-tight">
//               General Fund first, then each Special Account dept
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* ── Right panel: iframe preview ── */}
//       <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">
//         {previewUrl ? (
//           <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
//             <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
//             <div className="flex-1" />
//             <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}>
//               <RefreshCw className="h-3 w-3" />Refresh
//             </Button>
//             <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy || !canPreview}>
//               <Download className="h-3 w-3" />Save PDF
//             </Button>
//           </div>
//         ) : null}
//         {previewUrl ? (
//           <iframe key={previewUrl} src={`${previewUrl}#toolbar=1&navpanes=0`}
//             className="flex-1 w-full border-0 block" style={{ height: '100%' }} title="PDF Preview" />
//         ) : (
//           <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
//             {loadingPreview ? (
//               <><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /><p className="text-sm text-zinc-400">Generating PDF…</p></>
//             ) : loadingAll ? (
//               <><Package className="w-10 h-10 text-zinc-300" /><p className="text-sm text-zinc-400">Building ZIP — this may take a moment…</p></>
//             ) : (
//               <>
//                 <FileText className="w-14 h-14 text-zinc-200" />
//                 <div>
//                   <p className="text-sm font-medium text-zinc-400">No preview yet</p>
//                   <p className="text-xs text-zinc-400 mt-0.5">
//                     {canPreview ? 'Select options and click Preview PDF' : 'Select forms and click Generate All to download ZIP'}
//                   </p>
//                 </div>
//                 {canPreview && isReady && (
//                   <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}>
//                     <Eye className="mr-1.5 h-3 w-3" />Preview PDF
//                   </Button>
//                 )}
//                 {isReady && !canPreview && (
//                   <Button size="sm" className="mt-1 text-xs h-7 bg-zinc-900 hover:bg-zinc-700 text-white" onClick={handleGenerateAll} disabled={isBusy}>
//                     <Package className="mr-1.5 h-3 w-3" />Generate All — Download ZIP
//                   </Button>
//                 )}
//               </>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // LEP PANEL (Local Expenditure Program)
// // ═════════════════════════════════════════════════════════════════════════════

// const LepPanel: React.FC<{
//   budgetPlans: BudgetPlan[];
//   loadingInit: boolean;
// }> = ({ budgetPlans, loadingInit }) => {

//   const [selectedPlanId,  setSelectedPlanId]  = useState<string>('');
//   const [selectedForms,   setSelectedForms]   = useState<Set<LepFormId>>(new Set(['consolidated_plantilla']));
//   const [loadingPreview,  setLoadingPreview]  = useState(false);
//   const [loadingDl,       setLoadingDl]       = useState(false);
//   const [previewUrl,      setPreviewUrl]      = useState<string | null>(null);

//   useEffect(() => {
//     const active = budgetPlans.find(p => p.is_active);
//     if (active) setSelectedPlanId(String(active.budget_plan_id));
//   }, [budgetPlans]);

//   useEffect(
//     () => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); },
//     [previewUrl]
//   );

//   const allLepIds    = LEP_FORM_DEFS.map(f => f.id) as LepFormId[];
//   const allSelected  = allLepIds.every(id => selectedForms.has(id));
//   const someSelected = allLepIds.some(id => selectedForms.has(id)) && !allSelected;

//   const toggleSelectAll = () => {
//     if (allSelected) setSelectedForms(new Set([allLepIds[0]]));
//     else             setSelectedForms(new Set(allLepIds));
//     setPreviewUrl(null);
//   };

//   const toggleForm = (id: LepFormId) => {
//     setSelectedForms(prev => {
//       const next = new Set(prev);
//       if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); }
//       else               next.add(id);
//       return next;
//     });
//     setPreviewUrl(null);
//   };

//   const isReady = Boolean(selectedPlanId) && selectedForms.size > 0;
//   const isBusy  = loadingPreview || loadingDl;

//   // For now we only have consolidated_plantilla — single endpoint
//   const currentEndpoint = selectedForms.size === 1
//     ? LEP_FORM_DEFS.find(f => selectedForms.has(f.id))?.endpoint ?? ''
//     : '';

//   const fetchLepPdf = useCallback(async (download: boolean): Promise<Blob> => {
//     if (!currentEndpoint) throw new Error('Select a single LEP form to preview.');
//     const response = await API.post(currentEndpoint, null, {
//       params: { budget_plan_id: selectedPlanId, download: download ? 1 : undefined, _: Date.now() },
//       responseType: 'blob',
//       headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
//     });
//     if (!response.headers['content-type']?.includes('application/pdf')) {
//       const text = await (response.data as Blob).text();
//       let msg = 'Server error';
//       try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
//       throw new Error(msg);
//     }
//     if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
//     return response.data as Blob;
//   }, [currentEndpoint, selectedPlanId]);

//   const handlePreview = async () => {
//     if (!isReady || loadingPreview || !currentEndpoint) return;
//     setLoadingPreview(true);
//     if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
//     try {
//       const blob = await fetchLepPdf(false);
//       setPreviewUrl(URL.createObjectURL(blob));
//     } catch (err: any) { toast.error(err.message ?? 'Failed to generate preview'); }
//     finally { setLoadingPreview(false); }
//   };

//   const handleDownload = async () => {
//     if (!isReady || loadingDl || !currentEndpoint) return;
//     setLoadingDl(true);
//     try {
//       const blob = await fetchLepPdf(true);
//       const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const label = Array.from(selectedForms).map(f => f.toUpperCase()).join('-');
//       const url   = URL.createObjectURL(blob);
//       const a     = Object.assign(document.createElement('a'), { href: url, download: `LEP_${label}_FY${plan?.year ?? ''}.pdf` });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('PDF downloaded');
//     } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
//     finally { setLoadingDl(false); }
//   };

//   const selectedPlan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//   const canPreview   = isReady && Boolean(currentEndpoint);

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">
//       {/* ── Left sidebar ── */}
//       <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

//         {/* Budget Plan */}
//         <div>
//           <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
//           <Select value={selectedPlanId}
//             onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }}
//             disabled={loadingInit}>
//             <SelectTrigger className="w-full h-7 text-xs bg-white">
//               <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
//             </SelectTrigger>
//             <SelectContent>
//               {budgetPlans.map(p => (
//                 <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
//                   <span className="flex items-center gap-1.5">
//                     FY {p.year}
//                     {p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}
//                   </span>
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* LEP Forms */}
//         <div>
//           <div className="flex items-center justify-between mb-1.5">
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">LEP Documents</p>
//           </div>

//           {/* Select All */}
//           <label htmlFor="lep-chk-select-all"
//             className="flex items-center gap-2 cursor-pointer group mb-2 pb-2 border-b border-zinc-200">
//             <Checkbox
//               id="lep-chk-select-all"
//               checked={allSelected}
//               className={`mt-0 flex-shrink-0 ${someSelected ? 'opacity-70' : ''}`}
//               onCheckedChange={toggleSelectAll}
//             />
//             <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">
//               {allSelected ? 'Deselect All' : 'Select All'}
//             </span>
//           </label>

//           <div className="space-y-2">
//             {LEP_FORM_DEFS.map(form => (
//               <label key={form.id} htmlFor={`lep-chk-${form.id}`}
//                 className="flex items-start gap-2 cursor-pointer group">
//                 <Checkbox
//                   id={`lep-chk-${form.id}`}
//                   checked={selectedForms.has(form.id)}
//                   onCheckedChange={() => toggleForm(form.id)}
//                   className="mt-0.5 flex-shrink-0"
//                 />
//                 <div>
//                   <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
//                     {form.label}
//                     {form.orientation === 'landscape' && (
//                       <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>
//                     )}
//                   </div>
//                   <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
//                 </div>
//               </label>
//             ))}

//             {/* Coming soon placeholders */}
//             <div className="opacity-40 cursor-not-allowed">
//               <div className="flex items-start gap-2">
//                 <Checkbox disabled className="mt-0.5 flex-shrink-0" />
//                 <div>
//                   <div className="text-xs font-semibold text-zinc-500 leading-tight">Receipt Program</div>
//                   <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">General Fund & Special Accounts income — coming soon</div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {selectedPlan && (
//           <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
//             <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
//             <p>Docs: {Array.from(selectedForms).join(', ')}</p>
//           </div>
//         )}

//         <Separator />

//         <div className="flex flex-col gap-1.5">
//           {canPreview ? (
//             <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-7 text-xs">
//               {loadingPreview ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</> : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
//             </Button>
//           ) : (
//             <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">
//               Select a single LEP document to preview
//             </div>
//           )}
//           {canPreview && (
//             <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-7 text-xs">
//               {loadingDl ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</> : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
//             </Button>
//           )}
//         </div>
//       </div>

//       {/* ── Right panel ── */}
//       <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">
//         {previewUrl && (
//           <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
//             <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
//             <div className="flex-1" />
//             <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}>
//               <RefreshCw className="h-3 w-3" />Refresh
//             </Button>
//             <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy}>
//               <Download className="h-3 w-3" />Save PDF
//             </Button>
//           </div>
//         )}
//         {previewUrl ? (
//           <iframe key={previewUrl} src={`${previewUrl}#toolbar=1&navpanes=0`}
//             className="flex-1 w-full border-0 block" style={{ height: '100%' }} title="LEP PDF Preview" />
//         ) : (
//           <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
//             {loadingPreview ? (
//               <><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /><p className="text-sm text-zinc-400">Generating PDF…</p></>
//             ) : (
//               <>
//                 <ClipboardList className="w-14 h-14 text-zinc-200" />
//                 <div>
//                   <p className="text-sm font-medium text-zinc-400">No preview yet</p>
//                   <p className="text-xs text-zinc-400 mt-0.5">
//                     {canPreview ? 'Click Preview PDF to generate' : 'Select a single document to preview'}
//                   </p>
//                 </div>
//                 {canPreview && isReady && (
//                   <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}>
//                     <Eye className="mr-1.5 h-3 w-3" />Preview PDF
//                   </Button>
//                 )}
//               </>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // MAIN COMPONENT
// // ═════════════════════════════════════════════════════════════════════════════

// const UnifiedReportsPage: React.FC = () => {

//   const [budgetPlans,   setBudgetPlans]   = useState<BudgetPlan[]>([]);
//   const [departments,   setDepartments]   = useState<Department[]>([]);
//   const [filterOptions, setFilterOptions] = useState<FilterOption[]>([
//     { value: 'all',          label: 'All (General Fund + Special Accounts)' },
//     { value: 'general-fund', label: 'General Fund only' },
//   ]);
//   const [loadingInit, setLoadingInit] = useState(true);
//   const [activeTab,   setActiveTab]   = useState<'abp' | 'lep'>('abp');

//   useEffect(() => {
//     (async () => {
//       try {
//         const [plansRes, deptsRes, sourcesRes] = await Promise.all([
//           API.get('/budget-plans'),
//           API.get('/departments'),
//           API.get('/reports/unified/sources').catch(() => null),
//         ]);
//         const plans: BudgetPlan[] = (plansRes.data.data ?? []).sort(
//           (a: BudgetPlan, b: BudgetPlan) => b.year - a.year
//         );
//         setBudgetPlans(plans);
//         setDepartments(deptsRes.data.data ?? []);
//         if (sourcesRes?.data?.data) setFilterOptions(sourcesRes.data.data);
//       } catch {
//         toast.error('Failed to load data');
//       } finally {
//         setLoadingInit(false);
//       }
//     })();
//   }, []);

//   return (
//     <div className="h-screen flex flex-col overflow-hidden bg-white">
//       {/* ── Top bar ── */}
//       <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-100">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Budget Reports</p>
//           <h1 className="text-lg font-bold text-zinc-900 leading-tight">LBP Forms</h1>
//           <p className="text-[11px] text-zinc-400">Unified report generator — preview or download as PDF / ZIP</p>
//         </div>
//       </div>

//       {/* ── Main Tabs ── */}
//       <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
//         <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'abp' | 'lep')}
//           className="flex flex-col flex-1 min-h-0 overflow-hidden">

//           <div className="flex-shrink-0 border-b border-zinc-200 px-4 bg-white">
//             <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 rounded-none">
//               <TabsTrigger value="abp"
//                 className="h-9 px-4 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-zinc-900 text-zinc-500 hover:text-zinc-700 gap-1.5">
//                 <BookOpen className="h-3.5 w-3.5" />
//                 Annual Budget Proposal
//               </TabsTrigger>
//               <TabsTrigger value="lep"
//                 className="h-9 px-4 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-zinc-900 text-zinc-500 hover:text-zinc-700 gap-1.5">
//                 <ClipboardList className="h-3.5 w-3.5" />
//                 Local Expenditure Program
//               </TabsTrigger>
//             </TabsList>
//           </div>

//           <TabsContent value="abp" className="flex-1 min-h-0 overflow-hidden mt-0">
//             <AbpPanel
//               budgetPlans={budgetPlans}
//               departments={departments}
//               filterOptions={filterOptions}
//               loadingInit={loadingInit}
//             />
//           </TabsContent>

//           <TabsContent value="lep" className="flex-1 min-h-0 overflow-hidden mt-0">
//             <LepPanel
//               budgetPlans={budgetPlans}
//               loadingInit={loadingInit}
//             />
//           </TabsContent>
//         </Tabs>
//       </div>
//     </div>
//   );
// };

// export default UnifiedReportsPage;


// import React, { useState, useEffect, useCallback } from 'react';
// import { toast } from 'sonner';
// import { Button }   from '@/src/components/ui/button';
// import { Input }    from '@/src/components/ui/input';
// import { Textarea } from '@/src/components/ui/textarea';
// import { Label }    from '@/src/components/ui/label';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
// import { Checkbox } from '@/src/components/ui/checkbox';
// import { Badge }    from '@/src/components/ui/badge';
// import { Separator }from '@/src/components/ui/separator';
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
// import {
//   Download, Eye, FileText, Loader2, RefreshCw, Package,
//   ChevronDown, ChevronRight, BookOpen, ClipboardList,
//   Settings2, Save, RotateCcw,
// } from 'lucide-react';
// import API from '@/src/services/api';

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface BudgetPlan  { budget_plan_id: number; year: number; is_active: boolean; }
// interface Department  { dept_id: number; dept_name: string; dept_abbreviation: string; }
// interface FilterOption { value: string; label: string; }

// // ─── ABP Form definitions ─────────────────────────────────────────────────────

// const FORM_DEFS = [
//   { id: 'form1',       label: 'LBP Form No. 1',        desc: 'Budget of Expenditures & Sources of Financing (B.E.S.F.)', orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
//   { id: 'summary',     label: 'Summary of Expenditures',desc: 'Summary of Expenditures by Office (General Fund)',         orientation: 'portrait'  as const, needsScope: false, needsDept: false },
//   { id: 'form5',       label: 'LBP Form No. 5',        desc: 'Statement of Indebtedness',                                orientation: 'landscape' as const, needsScope: false, needsDept: false },
//   { id: 'form6',       label: 'LBP Form No. 6',        desc: 'Statement of Statutory and Contractual Obligations',       orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
//   { id: 'form7',       label: 'LBP Form No. 7',        desc: 'Statement of Fund Allocation by Sector',                  orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
//   { id: 'pscomputation',label: 'PS Computation',        desc: 'Personnel Services Computation (GF)',                     orientation: 'portrait'  as const, needsScope: false, needsDept: false },
//   { id: 'mdf20',       label: '20% MDF Report',         desc: '20% Municipal Development Fund',                          orientation: 'portrait'  as const, needsScope: false, needsDept: false },
//   { id: 'calamity5',   label: '5% Calamity Fund',       desc: 'LDRRMF Investment Plan (General Fund & Special Accounts)',orientation: 'landscape' as const, needsScope: true,  needsDept: false },
//   { id: 'form2',       label: 'LBP Form No. 2',        desc: 'Programmed Appropriation by Object of Expenditures',      orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
//   { id: 'form3',       label: 'LBP Form No. 3',        desc: 'Plantilla of Personnel',                                  orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
//   { id: 'form4',       label: 'LBP Form No. 4',        desc: 'Annual Investment Program (Special Programs)',             orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
// ] as const;

// type FormId = typeof FORM_DEFS[number]['id'];

// // ─── LEP Form definitions ─────────────────────────────────────────────────────

// type LepFormId = 'consolidated_plantilla';

// const LEP_FORM_DEFS: ReadonlyArray<{
//   id: LepFormId; label: string; desc: string;
//   orientation: 'portrait' | 'landscape'; endpoint: string;
// }> = [
//   {
//     id: 'consolidated_plantilla',
//     label: 'Consolidated Plantilla of Personnel',
//     desc: 'All departments — General Fund + Special Accounts',
//     orientation: 'portrait',
//     endpoint: '/reports/lep/consolidated-plantilla',
//   },
// ];

// // ─── LEP Header fields ────────────────────────────────────────────────────────

// interface LepHeaderFields {
//   province: string; municipality: string; office_name: string; office_subtitle: string;
//   ordinance_session: string; session_date_text: string;
//   ordinance_number: string; ordinance_title: string; introduced_by: string;
// }

// // ─── ABP endpoint resolver ────────────────────────────────────────────────────

// function endpointFor(forms: FormId[]): string {
//   if (forms.includes('form1')         && forms.length === 1) return '/reports/unified/form1';
//   if (forms.includes('form5')         && forms.length === 1) return '/reports/unified/form5';
//   if (forms.includes('summary')       && forms.length === 1) return '/reports/unified/summary';
//   if (forms.includes('form6')         && forms.length === 1) return '/reports/unified/form6pdf';
//   if (forms.includes('form7')         && forms.length === 1) return '/reports/unified/form7pdf';
//   if (forms.includes('pscomputation') && forms.length === 1) return '/reports/unified/pscomputationpdf';
//   if (forms.includes('mdf20')         && forms.length === 1) return '/reports/unified/mdf20pdf';
//   if (forms.includes('calamity5')     && forms.length === 1) return '/reports/unified/calamity5pdf';
//   const deptForms = forms.filter(f => ['form2','form3','form4'].includes(f));
//   if (deptForms.length === forms.length) return '/reports/unified/dept';
//   return '';
// }

// // ═════════════════════════════════════════════════════════════════════════════
// // LEP HEADER EDITOR
// // ═════════════════════════════════════════════════════════════════════════════

// const LepHeaderEditor: React.FC<{
//   budgetPlanId: string;
//   onSaved?: () => void;
// }> = ({ budgetPlanId, onSaved }) => {

//   const EMPTY: LepHeaderFields = {
//     province: '', municipality: '', office_name: '', office_subtitle: '',
//     ordinance_session: '', session_date_text: '',
//     ordinance_number: '', ordinance_title: '', introduced_by: '',
//   };

//   const [fields,   setFields]   = useState<LepHeaderFields>(EMPTY);
//   const [original, setOriginal] = useState<LepHeaderFields>(EMPTY);
//   const [loading,  setLoading]  = useState(false);
//   const [saving,   setSaving]   = useState(false);
//   const [dirty,    setDirty]    = useState(false);

//   const load = useCallback(async () => {
//     if (!budgetPlanId) return;
//     setLoading(true);
//     try {
//       const res = await API.get(`/reports/lep/header-settings/${budgetPlanId}`);
//       const d   = res.data.data ?? {};
//       const f: LepHeaderFields = {
//         province:          d.province          ?? '',
//         municipality:      d.municipality      ?? '',
//         office_name:       d.office_name       ?? '',
//         office_subtitle:   d.office_subtitle   ?? '',
//         ordinance_session: d.ordinance_session ?? '',
//         session_date_text: d.session_date_text ?? '',
//         ordinance_number:  d.ordinance_number  ?? '',
//         ordinance_title:   d.ordinance_title   ?? '',
//         introduced_by:     d.introduced_by     ?? '',
//       };
//       setFields(f);
//       setOriginal(f);
//       setDirty(false);
//     } catch {
//       toast.error('Failed to load header settings');
//     } finally {
//       setLoading(false);
//     }
//   }, [budgetPlanId]);

//   useEffect(() => { load(); }, [load]);

//   const set = (key: keyof LepHeaderFields) =>
//     (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//       setFields(prev => ({ ...prev, [key]: e.target.value }));
//       setDirty(true);
//     };

//   const handleReset = () => { setFields(original); setDirty(false); };

//   const handleSave = async () => {
//     if (!budgetPlanId || saving) return;
//     setSaving(true);
//     try {
//       await API.put(`/reports/lep/header-settings/${budgetPlanId}`, fields);
//       setOriginal(fields);
//       setDirty(false);
//       toast.success('Header settings saved');
//       onSaved?.();
//     } catch (err: any) {
//       toast.error(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to save');
//     } finally {
//       setSaving(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="flex-1 flex items-center justify-center">
//         <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
//       </div>
//     );
//   }

//   type FieldCfg = { key: keyof LepHeaderFields; label: string; hint?: string; multiline?: boolean; rows?: number; };

//   const SECTIONS: { title: string; fields: FieldCfg[] }[] = [
//     {
//       title: 'Letterhead',
//       fields: [
//         { key: 'province',        label: 'Province' },
//         { key: 'municipality',    label: 'Municipality' },
//         { key: 'office_name',     label: 'Office Name' },
//         { key: 'office_subtitle', label: 'Office Subtitle' },
//       ],
//     },
//     {
//       title: 'Ordinance Header',
//       fields: [
//         { key: 'ordinance_session',  label: 'Session',           hint: 'e.g. 2ND SPECIAL SESSION' },
//         { key: 'session_date_text',  label: 'Session Date Text', multiline: true, rows: 3 },
//         { key: 'ordinance_number',   label: 'Ordinance Number',  hint: 'e.g. APPROPRIATION ORDINANCE NO. 2025 - ___' },
//         { key: 'ordinance_title',    label: 'Ordinance Title',   multiline: true, rows: 3 },
//         { key: 'introduced_by',      label: 'Introduced By',     hint: 'Name of SB member(s)' },
//       ],
//     },
//   ];

//   return (
//     <div className="flex-1 overflow-y-auto p-5 space-y-6">
//       {/* Sticky save bar */}
//       <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
//                       border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
//         <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
//           LEP Ordinance Header Settings
//         </p>
//         <div className="flex gap-2">
//           {dirty && (
//             <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
//               <RotateCcw className="h-3 w-3" />Reset
//             </Button>
//           )}
//           <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty || saving}>
//             {saving
//               ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
//               : <><Save className="h-3 w-3" />Save Changes</>}
//           </Button>
//         </div>
//       </div>

//       {SECTIONS.map(sec => (
//         <section key={sec.title}>
//           <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{sec.title}</h3>
//           <div className="space-y-3">
//             {sec.fields.map(cfg => (
//               <div key={cfg.key}>
//                 <Label htmlFor={`lep-hdr-${cfg.key}`} className="text-xs font-semibold text-zinc-700 mb-1 block">
//                   {cfg.label}
//                 </Label>
//                 {cfg.hint && <p className="text-[10px] text-zinc-400 mb-1">{cfg.hint}</p>}
//                 {cfg.multiline
//                   ? <Textarea id={`lep-hdr-${cfg.key}`} value={fields[cfg.key]} onChange={set(cfg.key)} rows={cfg.rows ?? 2} className="text-xs resize-y" />
//                   : <Input    id={`lep-hdr-${cfg.key}`} value={fields[cfg.key]} onChange={set(cfg.key)} className="h-8 text-xs" />}
//               </div>
//             ))}
//           </div>
//         </section>
//       ))}
//       <div className="h-8" />
//     </div>
//   );
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // ABP PANEL
// // ═════════════════════════════════════════════════════════════════════════════

// const AbpPanel: React.FC<{
//   budgetPlans: BudgetPlan[];
//   departments: Department[];
//   filterOptions: FilterOption[];
//   loadingInit: boolean;
// }> = ({ budgetPlans, departments, filterOptions, loadingInit }) => {

//   const [selectedPlanId, setSelectedPlanId] = useState<string>('');
//   const [selectedDept,   setSelectedDept]   = useState<string>('all');
//   const [selectedFilter, setSelectedFilter] = useState<string>('all');
//   const [selectedForms,  setSelectedForms]  = useState<Set<FormId>>(new Set(['form1']));
//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [loadingDl,      setLoadingDl]      = useState(false);
//   const [loadingAll,     setLoadingAll]     = useState(false);
//   const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
//   const [showInfo,       setShowInfo]       = useState(false);

//   useEffect(() => {
//     const active = budgetPlans.find(p => p.is_active);
//     if (active) setSelectedPlanId(String(active.budget_plan_id));
//   }, [budgetPlans]);

//   useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

//   const allFormIds  = FORM_DEFS.map(f => f.id) as FormId[];
//   const allSelected = allFormIds.every(id => selectedForms.has(id));
//   const someSelected= allFormIds.some(id  => selectedForms.has(id)) && !allSelected;

//   const toggleSelectAll = () => {
//     setSelectedForms(allSelected ? new Set([allFormIds[0]]) : new Set(allFormIds));
//     setPreviewUrl(null);
//   };
//   const toggleForm = (id: FormId) => {
//     setSelectedForms(prev => {
//       const next = new Set(prev);
//       if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); } else next.add(id);
//       return next;
//     });
//     setPreviewUrl(null);
//   };

//   const forms        = Array.from(selectedForms) as FormId[];
//   const isReady      = Boolean(selectedPlanId) && forms.length > 0;
//   const hasDeptForms = forms.some(f => ['form2','form3','form4'].includes(f));
//   const hasForm1     = forms.includes('form1');
//   const hasForm6     = forms.includes('form6');
//   const hasForm7     = forms.includes('form7');
//   const hasCalamity5 = forms.includes('calamity5');
//   const hasScopeForm = hasForm1 || hasForm6 || hasForm7 || hasCalamity5;
//   const hasForm5     = forms.includes('form5');

//   const scopeLabel = (() => {
//     const sf = [hasForm1 && '1', hasForm6 && '6', hasForm7 && '7'].filter(Boolean);
//     if (sf.length > 1) return `Form ${sf.join(' & ')} Scope`;
//     if (hasForm7) return 'Form 7 Scope';
//     if (hasForm6) return 'Form 6 Scope';
//     return 'Form 1 Scope';
//   })();

//   const singleEndpoint = endpointFor(forms);
//   const canPreview     = isReady && Boolean(singleEndpoint);

//   const buildParams = useCallback((download: boolean): Record<string, unknown> => {
//     const p: Record<string, unknown> = { budget_plan_id: selectedPlanId, _: Date.now() };
//     if (download) p.download = true;
//     if (forms.includes('form1') || forms.includes('form6') || forms.includes('form7')) p.filter = selectedFilter;
//     if (forms.some(f => ['form2','form3','form4'].includes(f))) {
//       p.department = selectedDept;
//       p['forms[]'] = forms.filter(f => ['form2','form3','form4'].includes(f));
//     }
//     return p;
//   }, [selectedPlanId, selectedFilter, selectedDept, forms]);

//   const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
//     const endpoint = endpointFor(forms);
//     if (!endpoint) throw new Error('Mixed forms — use Generate All to download as ZIP.');
//     const response = await API.post(endpoint, null, {
//       params: buildParams(download), responseType: 'blob',
//       headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
//     });
//     if (!response.headers['content-type']?.includes('application/pdf')) {
//       const text = await (response.data as Blob).text();
//       let msg = 'Server error';
//       try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
//       throw new Error(msg);
//     }
//     if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
//     return response.data as Blob;
//   }, [forms, buildParams]);

//   const handlePreview = async () => {
//     if (!canPreview || loadingPreview) return;
//     setLoadingPreview(true);
//     if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
//     try { setPreviewUrl(URL.createObjectURL(await fetchPdf(false))); }
//     catch (err: any) { toast.error(err.message ?? 'Failed to generate preview'); }
//     finally { setLoadingPreview(false); }
//   };

//   const handleDownload = async () => {
//     if (!canPreview || loadingDl) return;
//     setLoadingDl(true);
//     try {
//       const blob = await fetchPdf(true);
//       const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const url   = URL.createObjectURL(blob);
//       const a     = Object.assign(document.createElement('a'), { href: url, download: `LBP_${forms.map(f => f.toUpperCase()).join('-')}_FY${plan?.year ?? ''}.pdf` });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('PDF downloaded');
//     } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
//     finally { setLoadingDl(false); }
//   };

//   const handleGenerateAll = async () => {
//     if (!isReady || loadingAll) return;
//     setLoadingAll(true);
//     try {
//       const plan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const response = await API.post('/reports/unified/generate-all', null, {
//         params: { budget_plan_id: selectedPlanId, 'forms[]': forms, _: Date.now() },
//         responseType: 'blob',
//         headers: { Accept: 'application/zip', 'X-Requested-With': 'XMLHttpRequest' },
//       });
//       if ((response.data as Blob).size === 0) throw new Error('Empty ZIP received');
//       const url = URL.createObjectURL(response.data as Blob);
//       const a   = Object.assign(document.createElement('a'), { href: url, download: `LBP_AllForms_FY${plan?.year ?? ''}.zip` });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('ZIP downloaded — check your downloads folder');
//     } catch (err: any) { toast.error(err.message ?? 'Failed to generate ZIP'); }
//     finally { setLoadingAll(false); }
//   };

//   const selectedPlan     = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//   const selectedDeptName = selectedDept === 'all'
//     ? 'All Departments'
//     : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';
//   const isBusy = loadingPreview || loadingDl || loadingAll;

//   const zipContents = () => {
//     const lines: string[] = ['📁 01_GeneralFund/'];
//     if (hasForm1)                        lines.push('  • Form1_GeneralFund_FY***.pdf');
//     if (hasDeptForms)                    lines.push('  • Forms_[2-3-4]_[Dept]_FY***.pdf  (each dept)');
//     if (hasForm5)                        lines.push('  • Form5_Indebtedness_FY***.pdf');
//     if (hasForm6)                        lines.push('  • Form6_StatutoryObligations_GF_FY***.pdf');
//     if (hasForm7)                        lines.push('  • Form7_FundAllocationBySector_GF_FY***.pdf');
//     if (forms.includes('summary'))       lines.push('  • SummaryOfExpenditures_FY***.pdf');
//     if (forms.includes('pscomputation')) lines.push('  • PS_Computation_FY***.pdf');
//     if (forms.includes('mdf20'))         lines.push('  • 20MDF_FY***.pdf');
//     if (forms.includes('calamity5'))     lines.push('  • 5pct_CalamityFund_GF_FY***.pdf');
//     lines.push('📁 02_SA_[ABBR]/  (per Special Account dept)');
//     if (hasForm1)                        lines.push('  • Form1_[ABBR]_FY***.pdf');
//     if (hasDeptForms)                    lines.push('  • Forms_[2-3-4]_[ABBR]_FY***.pdf');
//     if (hasForm6)                        lines.push('  • Form6_[ABBR]_FY***.pdf');
//     if (hasForm7)                        lines.push('  • Form7_FundAllocationBySector_[ABBR]_FY***.pdf');
//     if (forms.includes('calamity5'))     lines.push('  • 5pct_CalamityFund_[ABBR]_FY***.pdf');
//     return lines.join('\n');
//   };

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">
//       {/* Left sidebar */}
//       <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

//         <div>
//           <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
//           <Select value={selectedPlanId} onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }} disabled={loadingInit}>
//             <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} /></SelectTrigger>
//             <SelectContent>
//               {budgetPlans.map(p => (
//                 <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
//                   <span className="flex items-center gap-1.5">FY {p.year}{p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}</span>
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         <div>
//           <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Forms to Include</p>
//           <label htmlFor="chk-select-all" className="flex items-center gap-2 cursor-pointer group mb-2 pb-2 border-b border-zinc-200">
//             <Checkbox id="chk-select-all" checked={allSelected} className={`mt-0 flex-shrink-0 ${someSelected ? 'opacity-70' : ''}`} onCheckedChange={toggleSelectAll} />
//             <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">{allSelected ? 'Deselect All' : 'Select All'}</span>
//           </label>
//           <div className="space-y-2">
//             {FORM_DEFS.map(form => (
//               <label key={form.id} htmlFor={`chk-${form.id}`} className="flex items-start gap-2 cursor-pointer group">
//                 <Checkbox id={`chk-${form.id}`} checked={selectedForms.has(form.id)} onCheckedChange={() => toggleForm(form.id)} className="mt-0.5 flex-shrink-0" />
//                 <div>
//                   <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
//                     {form.label}
//                     {form.orientation === 'landscape' && <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>}
//                   </div>
//                   <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
//                 </div>
//               </label>
//             ))}
//           </div>
//         </div>

//         {hasScopeForm && (
//           <div>
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">{scopeLabel}</p>
//             <Select value={selectedFilter} onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }} disabled={loadingInit}>
//               <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
//               <SelectContent>{filterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
//             </Select>
//           </div>
//         )}

//         {hasDeptForms && (
//           <div>
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Department</p>
//             <Select value={selectedDept} onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }} disabled={loadingInit}>
//               <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Departments</SelectItem>
//                 {departments.map(d => <SelectItem key={d.dept_id} value={String(d.dept_id)}>{d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}</SelectItem>)}
//               </SelectContent>
//             </Select>
//           </div>
//         )}

//         {selectedPlan && (
//           <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
//             <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
//             {hasScopeForm && <p>{scopeLabel}: {filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</p>}
//             {hasDeptForms && <p>Depts: {selectedDeptName}</p>}
//             <p>Forms: {forms.map(f => f.toUpperCase()).join(', ')}</p>
//           </div>
//         )}

//         <Separator />

//         <div className="flex flex-col gap-1.5">
//           {canPreview ? (
//             <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-7 text-xs">
//               {loadingPreview ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</> : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
//             </Button>
//           ) : (
//             <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">Mixed forms — use<br />"Generate All ZIP" below</div>
//           )}
//           {canPreview && (
//             <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-7 text-xs">
//               {loadingDl ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</> : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
//             </Button>
//           )}
//           <div className="mt-1">
//             <div className="flex items-center gap-1 mb-1 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600" onClick={() => setShowInfo(v => !v)}>
//               {showInfo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}ZIP structure
//             </div>
//             {showInfo && <pre className="rounded bg-zinc-100 p-1.5 text-[9px] text-zinc-500 whitespace-pre-wrap leading-relaxed mb-1.5">{zipContents()}</pre>}
//             <Button onClick={handleGenerateAll} disabled={!isReady || isBusy} size="sm" className="w-full h-8 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
//               {loadingAll ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Building ZIP…</> : <><Package className="mr-1.5 h-3.5 w-3.5" />Generate All — Download ZIP</>}
//             </Button>
//             <p className="text-[9px] text-zinc-400 mt-1 text-center leading-tight">General Fund first, then each Special Account dept</p>
//           </div>
//         </div>
//       </div>

//       {/* Right: iframe preview */}
//       <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">
//         {previewUrl && (
//           <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
//             <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
//             <div className="flex-1" />
//             <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}><RefreshCw className="h-3 w-3" />Refresh</Button>
//             <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy || !canPreview}><Download className="h-3 w-3" />Save PDF</Button>
//           </div>
//         )}
//         {previewUrl ? (
//           <iframe key={previewUrl} src={`${previewUrl}#toolbar=1&navpanes=0`} className="flex-1 w-full border-0 block" style={{ height: '100%' }} title="PDF Preview" />
//         ) : (
//           <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
//             {loadingPreview ? (
//               <><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /><p className="text-sm text-zinc-400">Generating PDF…</p></>
//             ) : loadingAll ? (
//               <><Package className="w-10 h-10 text-zinc-300" /><p className="text-sm text-zinc-400">Building ZIP — this may take a moment…</p></>
//             ) : (
//               <>
//                 <FileText className="w-14 h-14 text-zinc-200" />
//                 <div>
//                   <p className="text-sm font-medium text-zinc-400">No preview yet</p>
//                   <p className="text-xs text-zinc-400 mt-0.5">{canPreview ? 'Select options and click Preview PDF' : 'Select forms and click Generate All to download ZIP'}</p>
//                 </div>
//                 {canPreview && isReady && <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}><Eye className="mr-1.5 h-3 w-3" />Preview PDF</Button>}
//                 {isReady && !canPreview && <Button size="sm" className="mt-1 text-xs h-7 bg-zinc-900 hover:bg-zinc-700 text-white" onClick={handleGenerateAll} disabled={isBusy}><Package className="mr-1.5 h-3 w-3" />Generate All — Download ZIP</Button>}
//               </>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // LEP PANEL  (with Generate / Header sub-tabs)
// // ═════════════════════════════════════════════════════════════════════════════

// const LepPanel: React.FC<{
//   budgetPlans: BudgetPlan[];
//   loadingInit: boolean;
// }> = ({ budgetPlans, loadingInit }) => {

//   const [selectedPlanId, setSelectedPlanId] = useState<string>('');
//   const [selectedForms,  setSelectedForms]  = useState<Set<LepFormId>>(new Set(['consolidated_plantilla']));
//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [loadingDl,      setLoadingDl]      = useState(false);
//   const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
//   const [innerTab,       setInnerTab]       = useState<'generate' | 'settings'>('generate');

//   useEffect(() => {
//     const active = budgetPlans.find(p => p.is_active);
//     if (active) setSelectedPlanId(String(active.budget_plan_id));
//   }, [budgetPlans]);

//   useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

//   const allLepIds = LEP_FORM_DEFS.map(f => f.id) as LepFormId[];

//   const toggleForm = (id: LepFormId) => {
//     setSelectedForms(prev => {
//       const next = new Set(prev);
//       if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); } else next.add(id);
//       return next;
//     });
//     setPreviewUrl(null);
//   };

//   const isReady = Boolean(selectedPlanId) && selectedForms.size > 0;
//   const isBusy  = loadingPreview || loadingDl;

//   const currentEndpoint = selectedForms.size === 1
//     ? LEP_FORM_DEFS.find(f => selectedForms.has(f.id))?.endpoint ?? '' : '';
//   const canPreview = isReady && Boolean(currentEndpoint);

//   const fetchLepPdf = useCallback(async (download: boolean): Promise<Blob> => {
//     if (!currentEndpoint) throw new Error('Select a single LEP form to preview.');
//     const response = await API.post(currentEndpoint, null, {
//       params: { budget_plan_id: selectedPlanId, download: download ? 1 : undefined, _: Date.now() },
//       responseType: 'blob',
//       headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
//     });
//     if (!response.headers['content-type']?.includes('application/pdf')) {
//       const text = await (response.data as Blob).text();
//       let msg = 'Server error';
//       try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
//       throw new Error(msg);
//     }
//     if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
//     return response.data as Blob;
//   }, [currentEndpoint, selectedPlanId]);

//   const handlePreview = async () => {
//     if (!canPreview || loadingPreview) return;
//     setLoadingPreview(true);
//     if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
//     try { setPreviewUrl(URL.createObjectURL(await fetchLepPdf(false))); }
//     catch (err: any) { toast.error(err.message ?? 'Failed to generate preview'); }
//     finally { setLoadingPreview(false); }
//   };

//   const handleDownload = async () => {
//     if (!canPreview || loadingDl) return;
//     setLoadingDl(true);
//     try {
//       const blob = await fetchLepPdf(true);
//       const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const label = Array.from(selectedForms).map(f => f.toUpperCase()).join('-');
//       const url   = URL.createObjectURL(blob);
//       const a     = Object.assign(document.createElement('a'), { href: url, download: `LEP_${label}_FY${plan?.year ?? ''}.pdf` });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('PDF downloaded');
//     } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
//     finally { setLoadingDl(false); }
//   };

//   const selectedPlan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);

//   return (
//     <div className="flex flex-1 min-h-0 overflow-hidden">

//       {/* Left sidebar */}
//       <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

//         {/* Budget plan */}
//         <div>
//           <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
//           <Select value={selectedPlanId} onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }} disabled={loadingInit}>
//             <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} /></SelectTrigger>
//             <SelectContent>
//               {budgetPlans.map(p => (
//                 <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
//                   <span className="flex items-center gap-1.5">FY {p.year}{p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}</span>
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Generate / Header toggle */}
//         <div className="flex rounded-md border border-zinc-200 overflow-hidden bg-white">
//           {(['generate', 'settings'] as const).map(tab => (
//             <button key={tab} onClick={() => setInnerTab(tab)}
//               className={`flex-1 py-1.5 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors
//                 ${innerTab === tab ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'}`}>
//               {tab === 'generate' ? <><ClipboardList className="h-3 w-3" />Generate</> : <><Settings2 className="h-3 w-3" />Header</>}
//             </button>
//           ))}
//         </div>

//         {/* Generate sub-panel */}
//         {innerTab === 'generate' && (
//           <>
//             <div>
//               <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">LEP Documents</p>
//               <div className="space-y-2">
//                 {LEP_FORM_DEFS.map(form => (
//                   <label key={form.id} htmlFor={`lep-chk-${form.id}`} className="flex items-start gap-2 cursor-pointer group">
//                     <Checkbox id={`lep-chk-${form.id}`} checked={selectedForms.has(form.id)} onCheckedChange={() => toggleForm(form.id)} className="mt-0.5 flex-shrink-0" />
//                     <div>
//                       <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
//                         {form.label}
//                         {form.orientation === 'landscape' && <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>}
//                       </div>
//                       <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
//                     </div>
//                   </label>
//                 ))}
//                 {/* Coming soon */}
//                 <div className="opacity-40 cursor-not-allowed flex items-start gap-2">
//                   <Checkbox disabled className="mt-0.5 flex-shrink-0" />
//                   <div>
//                     <div className="text-xs font-semibold text-zinc-500 leading-tight">Receipt Program</div>
//                     <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">General Fund & Special Accounts income — coming soon</div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {selectedPlan && (
//               <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
//                 <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
//                 <p>Docs: {Array.from(selectedForms).join(', ')}</p>
//               </div>
//             )}

//             <Separator />

//             <div className="flex flex-col gap-1.5">
//               {canPreview ? (
//                 <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-7 text-xs">
//                   {loadingPreview ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</> : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
//                 </Button>
//               ) : (
//                 <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">Select a single document to preview</div>
//               )}
//               {canPreview && (
//                 <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-7 text-xs">
//                   {loadingDl ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</> : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
//                 </Button>
//               )}
//             </div>
//           </>
//         )}

//         {/* Settings sub-panel description */}
//         {innerTab === 'settings' && (
//           <div className="rounded-lg bg-zinc-100 px-2.5 py-2 text-[10px] text-zinc-400 leading-relaxed">
//             Edit the ordinance letterhead, session text, and ordinance number/title that appear on the first page of the LEP report.
//             {!selectedPlanId && <p className="mt-1.5 font-semibold text-amber-600">Select a budget plan above first.</p>}
//           </div>
//         )}
//       </div>

//       {/* Right panel */}
//       <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">

//         {/* Generate: iframe */}
//         {innerTab === 'generate' && (
//           <>
//             {previewUrl && (
//               <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
//                 <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
//                 <div className="flex-1" />
//                 <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}><RefreshCw className="h-3 w-3" />Refresh</Button>
//                 <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy}><Download className="h-3 w-3" />Save PDF</Button>
//               </div>
//             )}
//             {previewUrl ? (
//               <iframe key={previewUrl} src={`${previewUrl}#toolbar=1&navpanes=0`} className="flex-1 w-full border-0 block" style={{ height: '100%' }} title="LEP PDF Preview" />
//             ) : (
//               <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
//                 {loadingPreview
//                   ? <><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /><p className="text-sm text-zinc-400">Generating PDF…</p></>
//                   : <>
//                       <ClipboardList className="w-14 h-14 text-zinc-200" />
//                       <div>
//                         <p className="text-sm font-medium text-zinc-400">No preview yet</p>
//                         <p className="text-xs text-zinc-400 mt-0.5">{canPreview ? 'Click Preview PDF to generate' : 'Select a single document to preview'}</p>
//                       </div>
//                       {canPreview && isReady && <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}><Eye className="mr-1.5 h-3 w-3" />Preview PDF</Button>}
//                     </>}
//               </div>
//             )}
//           </>
//         )}

//         {/* Settings: header editor */}
//         {innerTab === 'settings' && (
//           <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
//             {selectedPlanId
//               ? <LepHeaderEditor budgetPlanId={selectedPlanId} onSaved={() => { if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }} />
//               : <div className="flex-1 flex items-center justify-center"><p className="text-sm text-zinc-400">Select a budget plan to edit its header settings.</p></div>}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// // ═════════════════════════════════════════════════════════════════════════════
// // MAIN PAGE
// // ═════════════════════════════════════════════════════════════════════════════

// const UnifiedReportsPage: React.FC = () => {

//   const [budgetPlans,   setBudgetPlans]   = useState<BudgetPlan[]>([]);
//   const [departments,   setDepartments]   = useState<Department[]>([]);
//   const [filterOptions, setFilterOptions] = useState<FilterOption[]>([
//     { value: 'all',          label: 'All (General Fund + Special Accounts)' },
//     { value: 'general-fund', label: 'General Fund only' },
//   ]);
//   const [loadingInit, setLoadingInit] = useState(true);
//   const [activeTab,   setActiveTab]   = useState<'abp' | 'lep'>('abp');

//   useEffect(() => {
//     (async () => {
//       try {
//         const [plansRes, deptsRes, sourcesRes] = await Promise.all([
//           API.get('/budget-plans'),
//           API.get('/departments'),
//           API.get('/reports/unified/sources').catch(() => null),
//         ]);
//         setBudgetPlans((plansRes.data.data ?? []).sort((a: BudgetPlan, b: BudgetPlan) => b.year - a.year));
//         setDepartments(deptsRes.data.data ?? []);
//         if (sourcesRes?.data?.data) setFilterOptions(sourcesRes.data.data);
//       } catch {
//         toast.error('Failed to load data');
//       } finally {
//         setLoadingInit(false);
//       }
//     })();
//   }, []);

//   return (
//     <div className="h-screen flex flex-col overflow-hidden bg-white">
//       <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-100">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Budget Reports</p>
//           <h1 className="text-lg font-bold text-zinc-900 leading-tight">LBP Forms</h1>
//           <p className="text-[11px] text-zinc-400">Unified report generator — preview or download as PDF / ZIP</p>
//         </div>
//       </div>

//       <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
//         <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'abp' | 'lep')} className="flex flex-col flex-1 min-h-0 overflow-hidden">

//           <div className="flex-shrink-0 border-b border-zinc-200 px-4 bg-white">
//             <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 rounded-none">
//               <TabsTrigger value="abp" className="h-9 px-4 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-zinc-900 text-zinc-500 hover:text-zinc-700 gap-1.5">
//                 <BookOpen className="h-3.5 w-3.5" />Annual Budget Proposal
//               </TabsTrigger>
//               <TabsTrigger value="lep" className="h-9 px-4 text-xs font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-zinc-900 text-zinc-500 hover:text-zinc-700 gap-1.5">
//                 <ClipboardList className="h-3.5 w-3.5" />Local Expenditure Program
//               </TabsTrigger>
//             </TabsList>
//           </div>

//           <TabsContent value="abp" className="flex-1 min-h-0 overflow-hidden mt-0">
//             <AbpPanel budgetPlans={budgetPlans} departments={departments} filterOptions={filterOptions} loadingInit={loadingInit} />
//           </TabsContent>

//           <TabsContent value="lep" className="flex-1 min-h-0 overflow-hidden mt-0">
//             <LepPanel budgetPlans={budgetPlans} loadingInit={loadingInit} />
//           </TabsContent>

//         </Tabs>
//       </div>
//     </div>
//   );
// };

// export default UnifiedReportsPage;


import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Button }   from '@/src/components/ui/button';
import { Input }    from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label }    from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Badge }    from '@/src/components/ui/badge';
import { Separator }from '@/src/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import {
  Download, Eye, FileText, Loader2, RefreshCw, Package,
  ChevronDown, ChevronRight, BookOpen, ClipboardList,
  Settings2, Save, RotateCcw,
} from 'lucide-react';
import API from '@/src/services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetPlan  { budget_plan_id: number; year: number; is_active: boolean; }
interface Department  { dept_id: number; dept_name: string; dept_abbreviation: string; }
interface FilterOption { value: string; label: string; }

// ─── ABP Form definitions ─────────────────────────────────────────────────────

const FORM_DEFS = [
  { id: 'form1',       label: 'LBP Form No. 1',        desc: 'Budget of Expenditures & Sources of Financing (B.E.S.F.)', orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
  { id: 'summary',     label: 'Summary of Expenditures',desc: 'Summary of Expenditures by Office (General Fund)',         orientation: 'portrait'  as const, needsScope: false, needsDept: false },
  { id: 'form5',       label: 'LBP Form No. 5',        desc: 'Statement of Indebtedness',                                orientation: 'landscape' as const, needsScope: false, needsDept: false },
  { id: 'form6',       label: 'LBP Form No. 6',        desc: 'Statement of Statutory and Contractual Obligations',       orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
  { id: 'form7',       label: 'LBP Form No. 7',        desc: 'Statement of Fund Allocation by Sector',                  orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
  { id: 'pscomputation',label: 'PS Computation',        desc: 'Personnel Services Computation (GF)',                     orientation: 'portrait'  as const, needsScope: false, needsDept: false },
  { id: 'mdf20',       label: '20% MDF Report',         desc: '20% Municipal Development Fund',                          orientation: 'portrait'  as const, needsScope: false, needsDept: false },
  { id: 'calamity5',   label: '5% Calamity Fund',       desc: 'LDRRMF Investment Plan (General Fund & Special Accounts)',orientation: 'landscape' as const, needsScope: true,  needsDept: false },
  { id: 'form2',       label: 'LBP Form No. 2',        desc: 'Programmed Appropriation by Object of Expenditures',      orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
  { id: 'form3',       label: 'LBP Form No. 3',        desc: 'Plantilla of Personnel',                                  orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
  { id: 'form4',       label: 'LBP Form No. 4',        desc: 'Annual Investment Program (Special Programs)',             orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
] as const;

type FormId = typeof FORM_DEFS[number]['id'];

// ─── LEP Form definitions ─────────────────────────────────────────────────────

// type LepFormId = 'consolidated_plantilla';
type LepFormId = 'consolidated_plantilla' | 'receipts_program' | 'lep_form2' | 'lep_form7';


const LEP_FORM_DEFS: ReadonlyArray<{
  id: LepFormId; label: string; desc: string;
  orientation: 'portrait' | 'landscape'; endpoint: string;
  needsDept: boolean;   // ← new flag
}> = [
  {
    id: 'consolidated_plantilla',
    label: 'Consolidated Plantilla of Personnel',
    desc: 'All departments — General Fund + Special Accounts',
    orientation: 'portrait',
    endpoint: '/reports/lep/consolidated-plantilla',
    needsDept: false,
  },
  {
    id: 'receipts_program',
    label: 'Receipts Program',
    desc: 'Part II — General Fund & Special Accounts income',
    orientation: 'portrait',
    endpoint: '/reports/lep/receipts-program',
    needsDept: false,
  },
  {
    id: 'lep_form2',
    label: 'Appropriations by Office',
    desc: 'Part III — Programmed Appropriation & Obligation by Object of Expenditures',
    orientation: 'portrait',
    endpoint: '/reports/lep/form2',
    needsDept: true,   // ← shows department selector
  },
  {
    id: 'lep_form7',
    label: 'Summary of Appropriations by Sector',
    desc: 'Part IV — New Appropriations by Object of Expenditures and by Sector',
    orientation: 'portrait' as const,
    endpoint: '/reports/lep/form7',
    needsDept: false,
  },
];

// ─── LEP Header fields ────────────────────────────────────────────────────────

interface LepHeaderFields {
  province: string; municipality: string; office_name: string; office_subtitle: string;
  ordinance_session: string; session_date_text: string;
  ordinance_number: string; ordinance_title: string; introduced_by: string;
}

// ─── ABP endpoint resolver ────────────────────────────────────────────────────

function endpointFor(forms: FormId[]): string {
  if (forms.includes('form1')         && forms.length === 1) return '/reports/unified/form1';
  if (forms.includes('form5')         && forms.length === 1) return '/reports/unified/form5';
  if (forms.includes('summary')       && forms.length === 1) return '/reports/unified/summary';
  if (forms.includes('form6')         && forms.length === 1) return '/reports/unified/form6pdf';
  if (forms.includes('form7')         && forms.length === 1) return '/reports/unified/form7pdf';
  if (forms.includes('pscomputation') && forms.length === 1) return '/reports/unified/pscomputationpdf';
  if (forms.includes('mdf20')         && forms.length === 1) return '/reports/unified/mdf20pdf';
  if (forms.includes('calamity5')     && forms.length === 1) return '/reports/unified/calamity5pdf';
  const deptForms = forms.filter(f => ['form2','form3','form4'].includes(f));
  if (deptForms.length === forms.length) return '/reports/unified/dept';
  return '';
}

// ═════════════════════════════════════════════════════════════════════════════
// LEP HEADER EDITOR
// ═════════════════════════════════════════════════════════════════════════════

const LepHeaderEditor: React.FC<{
  budgetPlanId: string;
  onSaved?: () => void;
}> = ({ budgetPlanId, onSaved }) => {

  const EMPTY: LepHeaderFields = {
    province: '', municipality: '', office_name: '', office_subtitle: '',
    ordinance_session: '', session_date_text: '',
    ordinance_number: '', ordinance_title: '', introduced_by: '',
  };

  const [fields,   setFields]   = useState<LepHeaderFields>(EMPTY);
  const [original, setOriginal] = useState<LepHeaderFields>(EMPTY);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  const load = useCallback(async () => {
    if (!budgetPlanId) return;
    setLoading(true);
    try {
      const res = await API.get(`/reports/lep/header-settings/${budgetPlanId}`);
      const d   = res.data.data ?? {};
      const f: LepHeaderFields = {
        province:          d.province          ?? '',
        municipality:      d.municipality      ?? '',
        office_name:       d.office_name       ?? '',
        office_subtitle:   d.office_subtitle   ?? '',
        ordinance_session: d.ordinance_session ?? '',
        session_date_text: d.session_date_text ?? '',
        ordinance_number:  d.ordinance_number  ?? '',
        ordinance_title:   d.ordinance_title   ?? '',
        introduced_by:     d.introduced_by     ?? '',
      };
      setFields(f);
      setOriginal(f);
      setDirty(false);
    } catch {
      toast.error('Failed to load header settings');
    } finally {
      setLoading(false);
    }
  }, [budgetPlanId]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof LepHeaderFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields(prev => ({ ...prev, [key]: e.target.value }));
      setDirty(true);
    };

  const handleReset = () => { setFields(original); setDirty(false); };

  const handleSave = async () => {
    if (!budgetPlanId || saving) return;
    setSaving(true);
    try {
      await API.put(`/reports/lep/header-settings/${budgetPlanId}`, fields);
      setOriginal(fields);
      setDirty(false);
      toast.success('Header settings saved');
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  type FieldCfg = { key: keyof LepHeaderFields; label: string; hint?: string; multiline?: boolean; rows?: number; };

  const SECTIONS: { title: string; fields: FieldCfg[] }[] = [
    {
      title: 'Letterhead',
      fields: [
        { key: 'province',        label: 'Province' },
        { key: 'municipality',    label: 'Municipality' },
        { key: 'office_name',     label: 'Office Name' },
        { key: 'office_subtitle', label: 'Office Subtitle' },
      ],
    },
    {
      title: 'Ordinance Header',
      fields: [
        { key: 'ordinance_session',  label: 'Session',           hint: 'e.g. 2ND SPECIAL SESSION' },
        { key: 'session_date_text',  label: 'Session Date Text', multiline: true, rows: 3 },
        { key: 'ordinance_number',   label: 'Ordinance Number',  hint: 'e.g. APPROPRIATION ORDINANCE NO. 2025 - ___' },
        { key: 'ordinance_title',    label: 'Ordinance Title',   multiline: true, rows: 3 },
        { key: 'introduced_by',      label: 'Introduced By',     hint: 'Name of SB member(s)' },
      ],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-6">
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          LEP Ordinance Header Settings
        </p>
        <div className="flex gap-2">
          {dirty && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />Reset
            </Button>
          )}
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty || saving}>
            {saving
              ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
              : <><Save className="h-3 w-3" />Save Changes</>}
          </Button>
        </div>
      </div>

      {SECTIONS.map(sec => (
        <section key={sec.title}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{sec.title}</h3>
          <div className="space-y-3">
            {sec.fields.map(cfg => (
              <div key={cfg.key}>
                <Label htmlFor={`lep-hdr-${cfg.key}`} className="text-xs font-semibold text-zinc-700 mb-1 block">
                  {cfg.label}
                </Label>
                {cfg.hint && <p className="text-[10px] text-zinc-400 mb-1">{cfg.hint}</p>}
                {cfg.multiline
                  ? <Textarea id={`lep-hdr-${cfg.key}`} value={fields[cfg.key]} onChange={set(cfg.key)} rows={cfg.rows ?? 2} className="text-xs resize-y" />
                  : <Input    id={`lep-hdr-${cfg.key}`} value={fields[cfg.key]} onChange={set(cfg.key)} className="h-8 text-xs" />}
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="h-8" />
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ABP PANEL
// ═════════════════════════════════════════════════════════════════════════════

const AbpPanel: React.FC<{
  budgetPlans: BudgetPlan[];
  departments: Department[];
  filterOptions: FilterOption[];
  loadingInit: boolean;
}> = ({ budgetPlans, departments, filterOptions, loadingInit }) => {

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedDept,   setSelectedDept]   = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedForms,  setSelectedForms]  = useState<Set<FormId>>(new Set(['form1']));
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl,      setLoadingDl]      = useState(false);
  const [loadingAll,     setLoadingAll]     = useState(false);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [showInfo,       setShowInfo]       = useState(false);

  useEffect(() => {
    const active = budgetPlans.find(p => p.is_active);
    if (active) setSelectedPlanId(String(active.budget_plan_id));
  }, [budgetPlans]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const allFormIds  = FORM_DEFS.map(f => f.id) as FormId[];
  const allSelected = allFormIds.every(id => selectedForms.has(id));
  const someSelected= allFormIds.some(id  => selectedForms.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    setSelectedForms(allSelected ? new Set([allFormIds[0]]) : new Set(allFormIds));
    setPreviewUrl(null);
  };
  const toggleForm = (id: FormId) => {
    setSelectedForms(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); } else next.add(id);
      return next;
    });
    setPreviewUrl(null);
  };

  const forms        = Array.from(selectedForms) as FormId[];
  const isReady      = Boolean(selectedPlanId) && forms.length > 0;
  const hasDeptForms = forms.some(f => ['form2','form3','form4'].includes(f));
  const hasForm1     = forms.includes('form1');
  const hasForm6     = forms.includes('form6');
  const hasForm7     = forms.includes('form7');
  const hasCalamity5 = forms.includes('calamity5');
  const hasScopeForm = hasForm1 || hasForm6 || hasForm7 || hasCalamity5;
  const hasForm5     = forms.includes('form5');

  const scopeLabel = (() => {
    const sf = [hasForm1 && '1', hasForm6 && '6', hasForm7 && '7'].filter(Boolean);
    if (sf.length > 1) return `Form ${sf.join(' & ')} Scope`;
    if (hasForm7) return 'Form 7 Scope';
    if (hasForm6) return 'Form 6 Scope';
    return 'Form 1 Scope';
  })();

  const singleEndpoint = endpointFor(forms);
  const canPreview     = isReady && Boolean(singleEndpoint);

  const buildParams = useCallback((download: boolean): Record<string, unknown> => {
    const p: Record<string, unknown> = { budget_plan_id: selectedPlanId, _: Date.now() };
    if (download) p.download = true;
    if (forms.includes('form1') || forms.includes('form6') || forms.includes('form7')) p.filter = selectedFilter;
    if (forms.some(f => ['form2','form3','form4'].includes(f))) {
      p.department = selectedDept;
      p['forms[]'] = forms.filter(f => ['form2','form3','form4'].includes(f));
    }
    return p;
  }, [selectedPlanId, selectedFilter, selectedDept, forms]);

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const endpoint = endpointFor(forms);
    if (!endpoint) throw new Error('Mixed forms — use Generate All to download as ZIP.');
    const response = await API.post(endpoint, null, {
      params: buildParams(download), responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
    return response.data as Blob;
  }, [forms, buildParams]);

  const handlePreview = async () => {
    if (!canPreview || loadingPreview) return;
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try { setPreviewUrl(URL.createObjectURL(await fetchPdf(false))); }
    catch (err: any) { toast.error(err.message ?? 'Failed to generate preview'); }
    finally { setLoadingPreview(false); }
  };

  const handleDownload = async () => {
    if (!canPreview || loadingDl) return;
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
      const url   = URL.createObjectURL(blob);
      const a     = Object.assign(document.createElement('a'), { href: url, download: `LBP_${forms.map(f => f.toUpperCase()).join('-')}_FY${plan?.year ?? ''}.pdf` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
    finally { setLoadingDl(false); }
  };

  const handleGenerateAll = async () => {
    if (!isReady || loadingAll) return;
    setLoadingAll(true);
    try {
      const plan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
      const response = await API.post('/reports/unified/generate-all', null, {
        params: { budget_plan_id: selectedPlanId, 'forms[]': forms, _: Date.now() },
        responseType: 'blob',
        headers: { Accept: 'application/zip', 'X-Requested-With': 'XMLHttpRequest' },
      });
      if ((response.data as Blob).size === 0) throw new Error('Empty ZIP received');
      const url = URL.createObjectURL(response.data as Blob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: `LBP_AllForms_FY${plan?.year ?? ''}.zip` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('ZIP downloaded — check your downloads folder');
    } catch (err: any) { toast.error(err.message ?? 'Failed to generate ZIP'); }
    finally { setLoadingAll(false); }
  };

  const selectedPlan     = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
  const selectedDeptName = selectedDept === 'all'
    ? 'All Departments'
    : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';
  const isBusy = loadingPreview || loadingDl || loadingAll;

  const zipContents = () => {
    const lines: string[] = ['📁 01_GeneralFund/'];
    if (hasForm1)                        lines.push('  • Form1_GeneralFund_FY***.pdf');
    if (hasDeptForms)                    lines.push('  • Forms_[2-3-4]_[Dept]_FY***.pdf  (each dept)');
    if (hasForm5)                        lines.push('  • Form5_Indebtedness_FY***.pdf');
    if (hasForm6)                        lines.push('  • Form6_StatutoryObligations_GF_FY***.pdf');
    if (hasForm7)                        lines.push('  • Form7_FundAllocationBySector_GF_FY***.pdf');
    if (forms.includes('summary'))       lines.push('  • SummaryOfExpenditures_FY***.pdf');
    if (forms.includes('pscomputation')) lines.push('  • PS_Computation_FY***.pdf');
    if (forms.includes('mdf20'))         lines.push('  • 20MDF_FY***.pdf');
    if (forms.includes('calamity5'))     lines.push('  • 5pct_CalamityFund_GF_FY***.pdf');
    lines.push('📁 02_SA_[ABBR]/  (per Special Account dept)');
    if (hasForm1)                        lines.push('  • Form1_[ABBR]_FY***.pdf');
    if (hasDeptForms)                    lines.push('  • Forms_[2-3-4]_[ABBR]_FY***.pdf');
    if (hasForm6)                        lines.push('  • Form6_[ABBR]_FY***.pdf');
    if (hasForm7)                        lines.push('  • Form7_FundAllocationBySector_[ABBR]_FY***.pdf');
    if (forms.includes('calamity5'))     lines.push('  • 5pct_CalamityFund_[ABBR]_FY***.pdf');
    return lines.join('\n');
  };

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
          <Select value={selectedPlanId} onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }} disabled={loadingInit}>
            <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} /></SelectTrigger>
            <SelectContent>
              {budgetPlans.map(p => (
                <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
                  <span className="flex items-center gap-1.5">FY {p.year}{p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Forms to Include</p>
          <label htmlFor="chk-select-all" className="flex items-center gap-2 cursor-pointer group mb-2 pb-2 border-b border-zinc-200">
            <Checkbox id="chk-select-all" checked={allSelected} className={`mt-0 flex-shrink-0 ${someSelected ? 'opacity-70' : ''}`} onCheckedChange={toggleSelectAll} />
            <span className="text-xs font-bold text-zinc-700 group-hover:text-zinc-900">{allSelected ? 'Deselect All' : 'Select All'}</span>
          </label>
          <div className="space-y-2">
            {FORM_DEFS.map(form => (
              <label key={form.id} htmlFor={`chk-${form.id}`} className="flex items-start gap-2 cursor-pointer group">
                <Checkbox id={`chk-${form.id}`} checked={selectedForms.has(form.id)} onCheckedChange={() => toggleForm(form.id)} className="mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
                    {form.label}
                    {form.orientation === 'landscape' && <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>}
                  </div>
                  <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {hasScopeForm && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">{scopeLabel}</p>
            <Select value={selectedFilter} onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }} disabled={loadingInit}>
              <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{filterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {hasDeptForms && (
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Department</p>
            <Select value={selectedDept} onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }} disabled={loadingInit}>
              <SelectTrigger className="w-full h-7 text-xs bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d.dept_id} value={String(d.dept_id)}>{d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {selectedPlan && (
          <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
            <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
            {hasScopeForm && <p>{scopeLabel}: {filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</p>}
            {hasDeptForms && <p>Depts: {selectedDeptName}</p>}
            <p>Forms: {forms.map(f => f.toUpperCase()).join(', ')}</p>
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-1.5">
          {canPreview ? (
            <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-7 text-xs">
              {loadingPreview ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</> : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
            </Button>
          ) : (
            <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">Mixed forms — use<br />"Generate All ZIP" below</div>
          )}
          {canPreview && (
            <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-7 text-xs">
              {loadingDl ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</> : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
            </Button>
          )}
          <div className="mt-1">
            <div className="flex items-center gap-1 mb-1 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600" onClick={() => setShowInfo(v => !v)}>
              {showInfo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}ZIP structure
            </div>
            {showInfo && <pre className="rounded bg-zinc-100 p-1.5 text-[9px] text-zinc-500 whitespace-pre-wrap leading-relaxed mb-1.5">{zipContents()}</pre>}
            <Button onClick={handleGenerateAll} disabled={!isReady || isBusy} size="sm" className="w-full h-8 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
              {loadingAll ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Building ZIP…</> : <><Package className="mr-1.5 h-3.5 w-3.5" />Generate All — Download ZIP</>}
            </Button>
            <p className="text-[9px] text-zinc-400 mt-1 text-center leading-tight">General Fund first, then each Special Account dept</p>
          </div>
        </div>
      </div>

      {/* Right: iframe preview */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">
        {previewUrl && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
            <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}><RefreshCw className="h-3 w-3" />Refresh</Button>
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy || !canPreview}><Download className="h-3 w-3" />Save PDF</Button>
          </div>
        )}
        {previewUrl ? (
          <iframe key={previewUrl} src={`${previewUrl}#toolbar=1&navpanes=0`} className="flex-1 w-full border-0 block" style={{ height: '100%' }} title="PDF Preview" />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            {loadingPreview ? (
              <><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /><p className="text-sm text-zinc-400">Generating PDF…</p></>
            ) : loadingAll ? (
              <><Package className="w-10 h-10 text-zinc-300" /><p className="text-sm text-zinc-400">Building ZIP — this may take a moment…</p></>
            ) : (
              <>
                <FileText className="w-14 h-14 text-zinc-200" />
                <div>
                  <p className="text-sm font-medium text-zinc-400">No preview yet</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{canPreview ? 'Select options and click Preview PDF' : 'Select forms and click Generate All to download ZIP'}</p>
                </div>
                {canPreview && isReady && <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}><Eye className="mr-1.5 h-3 w-3" />Preview PDF</Button>}
                {isReady && !canPreview && <Button size="sm" className="mt-1 text-xs h-7 bg-zinc-900 hover:bg-zinc-700 text-white" onClick={handleGenerateAll} disabled={isBusy}><Package className="mr-1.5 h-3 w-3" />Generate All — Download ZIP</Button>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// LEP PANEL  — full-screen layout matching ABP panel
// ═════════════════════════════════════════════════════════════════════════════

const LepPanel: React.FC<{
  budgetPlans: BudgetPlan[];
  departments: Department[];   // ← add this prop
  loadingInit: boolean;
}> = ({ budgetPlans, departments, loadingInit }) => {

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedForms,  setSelectedForms]  = useState<Set<LepFormId>>(new Set(['consolidated_plantilla']));
  const [selectedDept,   setSelectedDept]   = useState<string>('all');   // ← new
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl,      setLoadingDl]      = useState(false);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [innerTab,       setInnerTab]       = useState<'generate' | 'settings'>('generate');

  useEffect(() => {
    const active = budgetPlans.find(p => p.is_active);
    if (active) setSelectedPlanId(String(active.budget_plan_id));
  }, [budgetPlans]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const toggleForm = (id: LepFormId) => {
    setSelectedForms(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); } else next.add(id);
      return next;
    });
    setPreviewUrl(null);
    // Reset dept when switching away from lep_form2
    if (id !== 'lep_form2') setSelectedDept('all');
  };

  const isReady = Boolean(selectedPlanId) && selectedForms.size > 0;
  const isBusy  = loadingPreview || loadingDl;

  // Dept selector is shown only when lep_form2 is the (single) selected form
  const needsDept = selectedForms.size === 1 && selectedForms.has('lep_form2');

  const currentEndpoint = selectedForms.size === 1
    ? LEP_FORM_DEFS.find(f => selectedForms.has(f.id))?.endpoint ?? '' : '';
  const canPreview = isReady && Boolean(currentEndpoint);

  const fetchLepPdf = useCallback(async (download: boolean): Promise<Blob> => {
    if (!currentEndpoint) throw new Error('Select a single LEP form to preview.');
    const params: Record<string, unknown> = {
      budget_plan_id: selectedPlanId,
      download: download ? 1 : undefined,
      _: Date.now(),
    };
    // Only pass department param when lep_form2 is selected
    if (needsDept) params.department = selectedDept;

    const response = await API.post(currentEndpoint, null, {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
    return response.data as Blob;
  }, [currentEndpoint, selectedPlanId, needsDept, selectedDept]);

  const handlePreview = async () => {
    if (!canPreview || loadingPreview) return;
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try { setPreviewUrl(URL.createObjectURL(await fetchLepPdf(false))); }
    catch (err: any) { toast.error(err.message ?? 'Failed to generate preview'); }
    finally { setLoadingPreview(false); }
  };

  const handleDownload = async () => {
    if (!canPreview || loadingDl) return;
    setLoadingDl(true);
    try {
      const blob  = await fetchLepPdf(true);
      const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
      const label = Array.from(selectedForms).map(f => f.toUpperCase()).join('-');
      const url   = URL.createObjectURL(blob);
      const a     = Object.assign(document.createElement('a'), {
        href: url,
        download: `LEP_${label}_FY${plan?.year ?? ''}.pdf`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
    finally { setLoadingDl(false); }
  };

  const selectedPlan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
  const selectedDeptName = selectedDept === 'all'
    ? 'All Offices'
    : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';

  // ── Sidebar JSX ────────────────────────────────────────────────────────────
  const Sidebar = (
    <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

      {/* Budget plan */}
      <div>
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Budget Plan</p>
        <Select value={selectedPlanId} onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }} disabled={loadingInit}>
          <SelectTrigger className="w-full h-7 text-xs bg-white">
            <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
          </SelectTrigger>
          <SelectContent>
            {budgetPlans.map(p => (
              <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
                <span className="flex items-center gap-1.5">
                  Budget Year {p.year}
                  {p.is_active && <Badge variant="secondary" className="text-[9px] px-1 h-3.5">Active</Badge>}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate / Header toggle */}
      <div className="flex rounded-md border border-zinc-200 overflow-hidden bg-white">
        {(['generate', 'settings'] as const).map(tab => (
          <button key={tab} onClick={() => setInnerTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors
              ${innerTab === tab ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'}`}>
            {tab === 'generate'
              ? <><ClipboardList className="h-3 w-3" />Generate</>
              : <><Settings2 className="h-3 w-3" />Header</>}
          </button>
        ))}
      </div>

      {/* Generate sub-panel */}
      {innerTab === 'generate' && (
        <>
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">LEP Documents</p>
            <div className="space-y-2">
              {LEP_FORM_DEFS.map(form => (
                <label key={form.id} htmlFor={`lep-chk-${form.id}`} className="flex items-start gap-2 cursor-pointer group">
                  <Checkbox
                    id={`lep-chk-${form.id}`}
                    checked={selectedForms.has(form.id)}
                    onCheckedChange={() => toggleForm(form.id)}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-zinc-800 leading-tight group-hover:text-zinc-900">
                      {form.label}
                      {form.orientation === 'landscape' && (
                        <span className="ml-1 text-[9px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1">landscape</span>
                      )}
                    </div>
                    <div className="text-[9px] text-zinc-400 leading-tight mt-0.5">{form.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Department selector — only visible when lep_form2 is the selected form */}
          {needsDept && (
            <div>
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">Office / Department</p>
              <Select
                value={selectedDept}
                onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }}
                disabled={loadingInit}
              >
                <SelectTrigger className="w-full h-7 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Offices</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.dept_id} value={String(d.dept_id)}>
                      {d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Summary card */}
          {selectedPlan && (
            <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
              <p className="font-semibold text-zinc-700">Budget Year {selectedPlan.year}</p>
              {needsDept && <p>Office: {selectedDeptName}</p>}
              <p>Docs: {Array.from(selectedForms).join(', ')}</p>
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-1.5">
            {canPreview ? (
              <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-7 text-xs">
                {loadingPreview
                  ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</>
                  : <><Eye className="mr-1 h-3 w-3" />Preview PDF</>}
              </Button>
            ) : (
              <div className="rounded-lg bg-zinc-100 px-2 py-1.5 text-[10px] text-zinc-400 text-center leading-tight">
                Select a single document to preview
              </div>
            )}
            {canPreview && (
              <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-7 text-xs">
                {loadingDl
                  ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Downloading…</>
                  : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Settings sub-panel description */}
      {innerTab === 'settings' && (
        <div className="rounded-lg bg-zinc-100 px-2.5 py-2 text-[10px] text-zinc-400 leading-relaxed">
          Edit the ordinance letterhead, session text, and ordinance number/title that appear on the first page of the LEP report.
          {!selectedPlanId && <p className="mt-1.5 font-semibold text-amber-600">Select a budget plan above first.</p>}
        </div>
      )}
    </div>
  );

  // ── Right panel (unchanged) ─────────────────────────────────────────────────
  return (
    <div className="flex flex-1 min-h-full overflow-hidden">
      {Sidebar}
      <div className="flex-1 min-w-0 min-h-full flex flex-col bg-zinc-100">

        {innerTab === 'generate' && (
          <>
            {previewUrl && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <span className="text-xs text-zinc-400">{selectedPlan ? `Budget Year ${selectedPlan.year}` : ''}</span>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}>
                  <RefreshCw className="h-3 w-3" />Refresh
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy}>
                  <Download className="h-3 w-3" />Save PDF
                </Button>
              </div>
            )}
            {previewUrl ? (
              <iframe
                key={previewUrl}
                src={`${previewUrl}#toolbar=1&navpanes=0`}
                className="flex-1 w-full border-0 block"
                style={{ height: '100%' }}
                title="LEP PDF Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                {loadingPreview
                  ? <><Loader2 className="w-10 h-10 text-zinc-300 animate-spin" /><p className="text-sm text-zinc-400">Generating PDF…</p></>
                  : <>
                      <ClipboardList className="w-14 h-14 text-zinc-200" />
                      <div>
                        <p className="text-sm font-medium text-zinc-400">No preview yet</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {canPreview ? 'Click Preview PDF to generate' : 'Select a single document to preview'}
                        </p>
                      </div>
                      {canPreview && isReady && (
                        <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}>
                          <Eye className="mr-1.5 h-3 w-3" />Preview PDF
                        </Button>
                      )}
                    </>}
              </div>
            )}
          </>
        )}

        {innerTab === 'settings' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {selectedPlanId
              ? <LepHeaderEditor
                  budgetPlanId={selectedPlanId}
                  onSaved={() => { if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}
                />
              : <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-zinc-400">Select a budget plan to edit its header settings.</p>
                </div>
            }
          </div>
        )}

      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

const UnifiedReportsPage: React.FC = () => {

  const [budgetPlans,   setBudgetPlans]   = useState<BudgetPlan[]>([]);
  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([
    { value: 'all',          label: 'All (General Fund + Special Accounts)' },
    { value: 'general-fund', label: 'General Fund only' },
  ]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [activeTab,   setActiveTab]   = useState<'abp' | 'lep'>('abp');

  useEffect(() => {
    (async () => {
      try {
        const [plansRes, deptsRes, sourcesRes] = await Promise.all([
          API.get('/budget-plans'),
          API.get('/departments'),
          API.get('/reports/unified/sources').catch(() => null),
        ]);
        setBudgetPlans((plansRes.data.data ?? []).sort((a: BudgetPlan, b: BudgetPlan) => b.year - a.year));
        setDepartments(deptsRes.data.data ?? []);
        if (sourcesRes?.data?.data) setFilterOptions(sourcesRes.data.data);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white">
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-100">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Budget Reports</p>
          <h1 className="text-lg font-bold text-zinc-900 leading-tight">LBP Forms</h1>
          <p className="text-[11px] text-zinc-400">Unified report generator — preview or download as PDF / ZIP</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <Tabs
    value={activeTab}
    onValueChange={v => setActiveTab(v as 'abp' | 'lep')}
    className="flex flex-col flex-1 min-h-0 overflow-hidden"
  >
    <div className="flex-shrink-0 border-b border-zinc-200 px-4 bg-white">
      <TabsList className="h-9 bg-transparent border-0 p-0 gap-0 rounded-none">
        <TabsTrigger
          value="abp"
          className="h-9 px-4 text-xs font-semibold rounded-none border-b-2 border-transparent
                     data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent
                     data-[state=active]:shadow-none data-[state=active]:text-zinc-900
                     text-zinc-500 hover:text-zinc-700 gap-1.5"
        >
          <BookOpen className="h-3.5 w-3.5" />Annual Budget Proposal
        </TabsTrigger>
        <TabsTrigger
          value="lep"
          className="h-9 px-4 text-xs font-semibold rounded-none border-b-2 border-transparent
                     data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent
                     data-[state=active]:shadow-none data-[state=active]:text-zinc-900
                     text-zinc-500 hover:text-zinc-700 gap-1.5"
        >
          <ClipboardList className="h-3.5 w-3.5" />Local Expenditure Program
        </TabsTrigger>
      </TabsList>
    </div>

    <TabsContent value="abp" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
      <AbpPanel
        budgetPlans={budgetPlans}
        departments={departments}
        filterOptions={filterOptions}
        loadingInit={loadingInit}
      />
    </TabsContent>

    <TabsContent value="lep" className="flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden">
      <LepPanel budgetPlans={budgetPlans} departments={departments} loadingInit={loadingInit} />
    </TabsContent>
  </Tabs>
      </div>
    </div>
  );
};

export default UnifiedReportsPage;
