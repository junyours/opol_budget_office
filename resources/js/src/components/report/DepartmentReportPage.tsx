// /**
//  * components/department-head/DepartmentReportsPage.tsx
//  *
//  * Report page for department-head users.
//  * Reuses the same PDF generation pipeline as UnifiedReportsPage but:
//  *   - Only shows Forms 2, 3, 4
//  *   - Department is locked to the logged-in user's department
//  *   - No scope/filter selector (not needed for dept forms)
//  *   - No "Generate All ZIP" (dept heads only need their own dept)
//  */

// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import { toast } from 'sonner';
// import { Button }   from '@/src/components/ui/button';
// import { Checkbox } from '@/src/components/ui/checkbox';
// import { Badge }    from '@/src/components/ui/badge';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
// import { Label } from '@/src/components/ui/label';
// import { Separator } from '@/src/components/ui/separator';
// import { cn } from '@/src/lib/utils';
// import {
//   Download, Eye, FileText, Loader2, RefreshCw,
// } from 'lucide-react';
// import API         from '@/src/services/api';
// import { useAuth } from '@/src/hooks/useAuth';
// import { PdfGenerationLoader } from '@/src/components/report/PdfGenerationLoader';

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface BudgetPlan { budget_plan_id: number; year: number; is_active: boolean; }

// // ─── Form definitions (only 2, 3, 4 for dept heads) ──────────────────────────

// const DEPT_FORM_DEFS = [
//   {
//     id:    'form2' as const,
//     label: 'LBP Form No. 2',
//     desc:  'Programmed Appropriation by Object of Expenditures',
//   },
//   {
//     id:    'form3' as const,
//     label: 'LBP Form No. 3',
//     desc:  'Plantilla of Personnel',
//   },
//   {
//     id:    'form4' as const,
//     label: 'LBP Form No. 4',
//     desc:  'Annual Investment Program (Special Programs)',
//   },
// ];

// type DeptFormId = 'form2' | 'form3' | 'form4';

// // ═════════════════════════════════════════════════════════════════════════════
// // COMPONENT
// // ═════════════════════════════════════════════════════════════════════════════

// const DepartmentReportsPage: React.FC = () => {
//   const { user } = useAuth();

//   // ── State ──────────────────────────────────────────────────────────────────
//   const [budgetPlans,    setBudgetPlans]    = useState<BudgetPlan[]>([]);
//   const [selectedPlanId, setSelectedPlanId] = useState<string>('');
//   const [selectedForms,  setSelectedForms]  = useState<Set<DeptFormId>>(
//     new Set(['form2', 'form3', 'form4'])
//   );

//   const [loadingInit,    setLoadingInit]    = useState(true);
//   const [loadingPreview, setLoadingPreview] = useState(false);
//   const [loadingDl,      setLoadingDl]      = useState(false);
//   const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);

//   // ── Department from auth context ───────────────────────────────────────────
//   const deptId   = (user as any)?.dept_id   ?? null;
//   const deptName = (user as any)?.department?.dept_name ?? 'Your Department';

//   // ── Load budget plans on mount ─────────────────────────────────────────────
//   useEffect(() => {
//     (async () => {
//       try {
//         const res    = await API.get('/budget-plans');
//         const plans: BudgetPlan[] = (res.data.data ?? []).sort(
//           (a: BudgetPlan, b: BudgetPlan) => b.year - a.year
//         );
//         setBudgetPlans(plans);
//         const active = plans.find(p => p.is_active);
//         if (active) setSelectedPlanId(String(active.budget_plan_id));
//       } catch {
//         toast.error('Failed to load budget plans');
//       } finally {
//         setLoadingInit(false);
//       }
//     })();
//   }, []);

//   // ── Cleanup blob URL ───────────────────────────────────────────────────────
//   useEffect(
//     () => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); },
//     [previewUrl]
//   );

//   // ── Helpers ────────────────────────────────────────────────────────────────
//   const toggleForm = (id: DeptFormId) => {
//     setSelectedForms(prev => {
//       const next = new Set(prev);
//       if (next.has(id)) {
//         if (next.size === 1) return prev; // keep at least one selected
//         next.delete(id);
//       } else {
//         next.add(id);
//       }
//       return next;
//     });
//     setPreviewUrl(null);
//   };

//   const isReady = Boolean(selectedPlanId) && selectedForms.size > 0 && Boolean(deptId);
//   const forms   = Array.from(selectedForms) as DeptFormId[];

//   // ── Build request params ───────────────────────────────────────────────────
//   const buildParams = useCallback(
//     (download: boolean): Record<string, unknown> => ({
//       budget_plan_id: selectedPlanId,
//       department:     String(deptId),
//       'forms[]':      forms,
//       ...(download ? { download: true } : {}),
//       _:              Date.now(),
//     }),
//     [selectedPlanId, deptId, forms]
//   );

//   // ── Fetch PDF blob ─────────────────────────────────────────────────────────
//   const fetchPdf = useCallback(
//     async (download: boolean): Promise<Blob> => {
//       const response = await API.post('/reports/unified/dept', null, {
//         params:       buildParams(download),
//         responseType: 'blob',
//         headers:      { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
//       });

//       if (!response.headers['content-type']?.includes('application/pdf')) {
//         const text = await (response.data as Blob).text();
//         let msg = 'Server error';
//         try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
//         throw new Error(msg);
//       }
//       if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
//       return response.data as Blob;
//     },
//     [buildParams]
//   );

//   // ── Preview ────────────────────────────────────────────────────────────────
//   const [previewReady, setPreviewReady] = useState(false);
//   const pendingBlobRef = useRef<Blob | null>(null);

//   const handlePreview = async () => {
//     if (!isReady || loadingPreview) return;
//     setLoadingPreview(true);
//     setPreviewReady(false);
//     if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
//     try {
//       pendingBlobRef.current = await fetchPdf(false);
//       setPreviewReady(true);
//     } catch (err: any) {
//       toast.error(err.message ?? 'Failed to generate preview');
//       setLoadingPreview(false);
//     }
//   };

//   const handlePreviewLoaderFinished = () => {
//     if (pendingBlobRef.current) setPreviewUrl(URL.createObjectURL(pendingBlobRef.current));
//     pendingBlobRef.current = null;
//     setLoadingPreview(false);
//     setPreviewReady(false);
//   };

//   // ── Download ───────────────────────────────────────────────────────────────
//   const handleDownload = async () => {
//     if (!isReady || loadingDl) return;
//     setLoadingDl(true);
//     try {
//       const blob  = await fetchPdf(true);
//       const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
//       const label = forms.map(f => f.toUpperCase()).join('-');
//       const abbr  = (user as any)?.department?.dept_abbreviation ?? 'DEPT';
//       const url   = URL.createObjectURL(blob);
//       const a     = Object.assign(document.createElement('a'), {
//         href:     url,
//         download: `LBP_${label}_${abbr}_FY${plan?.year ?? ''}.pdf`,
//       });
//       document.body.appendChild(a); a.click(); document.body.removeChild(a);
//       URL.revokeObjectURL(url);
//       toast.success('PDF downloaded');
//     } catch (err: any) {
//       toast.error(err.message ?? 'Failed to download');
//     } finally {
//       setLoadingDl(false);
//     }
//   };

//   const isBusy       = loadingPreview || loadingDl;
//   const selectedPlan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);

//   const selectedDeptFormDefs = DEPT_FORM_DEFS.filter(f => selectedForms.has(f.id));
//   const previewStages = [
//     'Sending request',
//     ...selectedDeptFormDefs.map(f => `Compiling ${f.label}`),
//     'Rendering layout',
//     'Loading preview',
//   ];

//   // ── Guard: no department assigned ─────────────────────────────────────────
//   if (!loadingInit && !deptId) {
//     return (
//       <div className="w-full px-6 py-8">
//         <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-center max-w-md mx-auto">
//           <p className="text-sm font-semibold text-red-700">No department assigned</p>
//           <p className="text-xs text-red-500 mt-1">
//             Your account is not linked to a department. Please contact your administrator.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // ════════════════════════════════════════════════════════════════════════════
//   // RENDER
//   // ════════════════════════════════════════════════════════════════════════════

//   return (
//     <div className="h-screen flex flex-col overflow-hidden bg-white">

//       {/* ── Top bar ── */}
//       <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-100">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
//             Department Reports
//           </p>
//           <h1 className="text-lg font-bold text-zinc-900 leading-tight">LBP Forms</h1>
//           <p className="text-[11px] text-zinc-400">
//             Generate and preview budget forms for{' '}
//             <span className="font-semibold text-zinc-600">{deptName}</span>
//           </p>
//         </div>

//         {previewUrl && (
//           <div className="flex items-center gap-2">
//             <span className="text-xs text-zinc-400">
//               {selectedPlan ? `FY ${selectedPlan.year}` : ''}
//             </span>
//             <Button
//               size="sm" variant="ghost" className="h-7 text-xs gap-1"
//               onClick={handlePreview} disabled={isBusy}
//             >
//               <RefreshCw className="h-3 w-3" /> Refresh
//             </Button>
//             <Button
//               size="sm" variant="outline" className="h-7 text-xs gap-1"
//               onClick={handleDownload} disabled={isBusy}
//             >
//               <Download className="h-3 w-3" /> Save PDF
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* ── Body ── */}
//       <div className="flex flex-1 min-h-0 overflow-hidden">

//         {/* ── Left sidebar ── */}
//         <div className="w-60 flex-shrink-0 flex flex-col gap-3 p-3 border-r border-zinc-200 bg-zinc-50 overflow-y-auto">

//           {/* Department info — read only */}
//           <div>
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
//               Department
//             </p>
//             <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2">
//               <p className="text-xs font-semibold text-zinc-800 leading-snug">{deptName}</p>
//               <p className="text-[10px] text-zinc-400 mt-0.5">
//                 {(user as any)?.department?.dept_abbreviation ?? ''}
//               </p>
//             </div>
//             <p className="text-[9px] text-zinc-400 mt-1">
//               Reports are generated for your department only.
//             </p>
//           </div>

//           {/* Budget Plan */}
//           <div>
//             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide mb-1">
//               Budget Plan
//             </p>
//             <Select
//               value={selectedPlanId}
//               onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }}
//               disabled={loadingInit}
//             >
//               <SelectTrigger className="w-full h-7 text-xs bg-white">
//                 <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
//               </SelectTrigger>
//               <SelectContent>
//                 {budgetPlans.map(p => (
//                   <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
//                     <span className="flex items-center gap-1.5">
//                       FY {p.year}
//                       {p.is_active && (
//                         <Badge variant="secondary" className="text-[9px] px-1 h-3.5">
//                           Active
//                         </Badge>
//                       )}
//                     </span>
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>

//           {/* Forms */}
//           <div>
//             <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
//               Forms to Include
//             </Label>
//             <div className="space-y-1.5">
//               {DEPT_FORM_DEFS.map(form => {
//                 const checked = selectedForms.has(form.id);
//                 return (
//                   <Label
//                     key={form.id}
//                     htmlFor={`chk-${form.id}`}
//                     className={cn(
//                       'flex items-start gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all',
//                       checked
//                         ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
//                         : 'border-border bg-card hover:bg-accent',
//                     )}
//                   >
//                     <Checkbox
//                       id={`chk-${form.id}`}
//                       checked={checked}
//                       onCheckedChange={() => toggleForm(form.id)}
//                       className="mt-0.5"
//                     />
//                     <div className="space-y-0.5">
//                       <div className={cn(
//                         'text-xs font-semibold leading-tight',
//                         checked ? 'text-primary' : 'text-foreground',
//                       )}>
//                         {form.label}
//                       </div>
//                       <p className="text-[11px] text-muted-foreground leading-snug">
//                         {form.desc}
//                       </p>
//                     </div>
//                   </Label>
//                 );
//               })}
//             </div>
//           </div>

//           {/* Summary card */}
//           {selectedPlan && (
//             <div className="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-[10px] text-zinc-500 space-y-0.5">
//               <p className="font-semibold text-zinc-700">FY {selectedPlan.year}</p>
//               <p>Dept: {(user as any)?.department?.dept_abbreviation ?? deptName}</p>
//               <p>Forms: {forms.map(f => f.toUpperCase()).join(', ')}</p>
//             </div>
//           )}

//           <Separator />

//           {/* Actions */}
//           <div className="flex flex-col gap-1.5">
//             <Button
//               onClick={handlePreview}
//               disabled={!isReady || isBusy}
//               variant="outline" size="sm" className="w-full h-7 text-xs"
//             >
//               {loadingPreview
//                 ? <><Loader2 className="mr-1 h-3 w-3 animate-spin" />Generating…</>
//                 : <><Eye      className="mr-1 h-3 w-3" />Preview PDF</>}
//             </Button>

//             <Button
//               onClick={handleDownload}
//               disabled={!isReady || isBusy}
//               size="sm" className="w-full h-7 text-xs"
//             >
//               {loadingDl
//                 ? <><Loader2  className="mr-1 h-3 w-3 animate-spin" />Downloading…</>
//                 : <><Download className="mr-1 h-3 w-3" />Download PDF</>}
//             </Button>
//           </div>

//           {/* Info note */}
//           <p className="text-[9px] text-zinc-400 leading-relaxed text-center">
//             Only Forms 2, 3 &amp; 4 are available for department-level reports.
//           </p>
//         </div>

//         {/* ── Right panel: PDF preview ── */}
//         <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-zinc-100">
//           {previewUrl ? (
//             <iframe
//               key={previewUrl}
//               src={`${previewUrl}#toolbar=1&navpanes=0`}
//               className="flex-1 w-full border-0 block"
//               style={{ height: '100%' }}
//               title="PDF Preview"
//             />
//           ) : (
//             <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
//               {loadingPreview ? (
//                 <PdfGenerationLoader
//                   active
//                   ready={previewReady}
//                   stages={previewStages}
//                   onFinished={handlePreviewLoaderFinished}
//                 />
//               ) : (
//                 <>
//                   <FileText className="w-14 h-14 text-zinc-200" />
//                   <div>
//                     <p className="text-sm font-medium text-zinc-400">No preview yet</p>
//                     <p className="text-xs text-zinc-400 mt-0.5">
//                       Select a budget plan and click Preview PDF
//                     </p>
//                   </div>
//                   {isReady && (
//                     <Button
//                       size="sm" variant="outline" className="mt-1 text-xs h-7"
//                       onClick={handlePreview} disabled={isBusy}
//                     >
//                       <Eye className="mr-1.5 h-3 w-3" /> Preview PDF
//                     </Button>
//                   )}
//                 </>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default DepartmentReportsPage;
