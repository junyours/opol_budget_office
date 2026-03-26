

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Badge } from "@/src/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/src/components/ui/popover";
import { Calendar } from "@/src/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { useSalaryMatrix } from "../../hooks/useSalaryMatrix";
import { ExcelUploadModal } from "../hrmo/ExcelUploadModal";
import { LoadingState } from "../common/LoadingState";
import API from "../../services/api";
import { SalaryStandardVersion, SalaryGradeStep } from "../../types/api";
import { ArrowUpTrayIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VersionWithSteps extends SalaryStandardVersion {
  steps: SalaryGradeStep[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtSalary = (v: number | undefined) =>
  v !== undefined
    ? Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "–";

const toNumber = (value: any): number => {
  if (value === null || value === undefined) return 0;
  const n = Number(String(value).replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
};

const STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// ─── Component ────────────────────────────────────────────────────────────────

const TranchePage: React.FC = () => {
  // refresh() from the hook invalidates both React Query caches so the
  // active version and matrix update everywhere without a page reload.
  const { activeVersion, loading: matrixLoading, refresh } = useSalaryMatrix();

  const [versions, setVersions]             = useState<VersionWithSteps[]>([]);
  const [selectedVersionId, setSelectedId]  = useState<number | null>(null);
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [activating, setActivating]         = useState(false);
  const [uploadOpen, setUploadOpen]         = useState(false);

  const [versionFields, setVF] = useState({
    lbc_reference: "", tranche: "1st Tranche", income_class: "",
    effective_date: new Date(), is_active: false,
  });

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchVersions(); }, []);

  const fetchVersions = async () => {
    setLoadingVersions(true);
    try {
      const res = await API.get("/salary-standard-versions?include=steps");
      const data = (res.data.data || []).sort((a: VersionWithSteps, b: VersionWithSteps) => {
        const dA = a.effective_year ? new Date(a.effective_year).getTime() : 0;
        const dB = b.effective_year ? new Date(b.effective_year).getTime() : 0;
        return dB - dA;
      });
      setVersions(data);
      const active = data.find((v: VersionWithSteps) => v.is_active);
      setSelectedId(active?.salary_standard_version_id ?? data[0]?.salary_standard_version_id ?? null);
    } catch { toast.error("Failed to load versions."); }
    finally { setLoadingVersions(false); }
  };

  const handleActivate = async (versionId: number) => {
    setActivating(true);
    try {
      await API.post(`/salary-standard-versions/${versionId}/activate`);
      // Re-fetch the local version list for this page's table display
      await fetchVersions();
      // Invalidate React Query caches so PersonnelServices and any other
      // component using useSalaryMatrix picks up the newly active version
      refresh();
      toast.success("Version activated successfully.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to activate version.");
    } finally {
      setActivating(false);
    }
  };

  const getMatrix = (version: VersionWithSteps) => {
    const map: Record<number, Record<number, number>> = {};
    (version.steps ?? []).forEach(({ salary_grade, step, salary }) => {
      if (!map[salary_grade]) map[salary_grade] = {};
      map[salary_grade][step] = salary;
    });
    return Object.entries(map)
      .map(([g, steps]) => ({ salary_grade: Number(g), steps }))
      .sort((a, b) => a.salary_grade - b.salary_grade);
  };

  // ── Upload helpers ────────────────────────────────────────────────────────

  const salaryColumns = [
    { key: "salary_grade", label: "Salary Grade" },
    ...STEPS.map(s => ({ key: `step${s}`, label: `Step ${s}` })),
  ];

  const transformSalaryPreview = (data: any[]) =>
    data.map(row => ({
      salary_grade: row.salary_grade,
      ...Object.fromEntries(STEPS.map(s => [`step${s}`, Number(row[`step${s}`]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })])),
    }));

  const parseSalaryRow = (row: any[]) => {
    const [grade, ...salaries] = row;
    return { salary_grade: toNumber(grade), ...Object.fromEntries(STEPS.map((s, i) => [`step${s}`, toNumber(salaries[i])])) };
  };

  const handleSaveMatrix = async (data: any[]) => {
    if (!versionFields.lbc_reference) throw new Error("Please enter LBC Reference");
    const steps = data.flatMap(row => STEPS.map(s => ({ salary_grade: row.salary_grade, step: s, salary: row[`step${s}`] })));
    await API.post("/salary-standard-versions/with-steps", {
      lbc_reference: versionFields.lbc_reference, tranche: versionFields.tranche,
      income_class: versionFields.income_class,
      effective_year: versionFields.effective_date.toISOString().split("T")[0],
      is_active: versionFields.is_active, steps,
    });
    await fetchVersions();
    // Also refresh React Query so salary matrix updates everywhere
    refresh();
  };

  const renderVersionFields = () => (
    <div className="space-y-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">Version Details</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">LBC Reference</label>
          <Input value={versionFields.lbc_reference} onChange={e => setVF(p => ({ ...p, lbc_reference: e.target.value }))} className="h-8 text-xs" placeholder="e.g. LBC No. 111" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Tranche</label>
          <Select value={versionFields.tranche} onValueChange={v => setVF(p => ({ ...p, tranche: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{["1st Tranche","2nd Tranche","3rd Tranche","4th Tranche"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Income Class</label>
          <Select value={versionFields.income_class} onValueChange={v => setVF(p => ({ ...p, income_class: v }))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{["1st Class","2nd Class","3rd Class","4th Class"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600">Effective Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-8 justify-start text-left font-normal text-xs border-gray-200">
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-gray-400" />
                {versionFields.effective_date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={versionFields.effective_date} onSelect={d => d && setVF(p => ({ ...p, effective_date: d }))} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="col-span-2 flex items-center gap-2.5">
          <Checkbox id="is_active" checked={versionFields.is_active} onCheckedChange={c => setVF(p => ({ ...p, is_active: c === true }))} />
          <label htmlFor="is_active" className="text-xs text-gray-600 cursor-pointer">Set as active version immediately</label>
        </div>
      </div>
    </div>
  );

  if (matrixLoading || loadingVersions) return <LoadingState />;

  const selectedVersion = versions.find(v => v.salary_standard_version_id === selectedVersionId);
  const matrix = selectedVersion ? getMatrix(selectedVersion) : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 w-full space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Salary Administration</span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">Salary Grade Tranches</h1>
        </div>
        <Button size="sm" onClick={() => setUploadOpen(true)} className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white">
          <ArrowUpTrayIcon className="w-3.5 h-3.5" />
          Upload Tranche
        </Button>
      </div>

      {/* Version list */}
      {versions.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm shadow-sm">
          No versions uploaded yet.{" "}
          <button onClick={() => setUploadOpen(true)} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Upload the first tranche</button>
        </div>
      ) : (
        <>
          {/* Version selector row */}
          <div className="flex gap-2 flex-wrap">
            {versions.map(v => (
              <button
                key={v.salary_standard_version_id}
                onClick={() => setSelectedId(v.salary_standard_version_id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors",
                  selectedVersionId === v.salary_standard_version_id
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {v.lbc_reference}
                {v.effective_year && (
                  <span className={cn("text-[10px]", selectedVersionId === v.salary_standard_version_id ? "text-gray-300" : "text-gray-400")}>
                    ({new Date(v.effective_year).getFullYear()})
                  </span>
                )}
                {v.is_active && (
                  <span className={cn(
                    "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
                    selectedVersionId === v.salary_standard_version_id
                      ? "bg-white/20 text-white"
                      : "bg-emerald-100 text-emerald-700"
                  )}>
                    Active
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Selected version detail */}
          {selectedVersion && (
            <div className="space-y-3">
              {/* Sub-header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">{selectedVersion.lbc_reference}</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-500">{selectedVersion.tranche}</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-500">{selectedVersion.income_class}</span>
                  {selectedVersion.effective_year && (
                    <>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-xs text-gray-500">
                        Effective {new Date(selectedVersion.effective_year).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                      </span>
                    </>
                  )}
                  {selectedVersion.is_active && (
                    <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 gap-1">
                      <CheckBadgeIcon className="w-3 h-3" /> Active Version
                    </Badge>
                  )}
                </div>
                {!selectedVersion.is_active && (
                  <Button size="sm" variant="outline" onClick={() => handleActivate(selectedVersion.salary_standard_version_id)} disabled={activating} className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
                    {activating ? <><span className="w-3 h-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />Activating…</> : "Set as Active"}
                  </Button>
                )}
              </div>

              {/* Salary matrix table */}
              {matrix.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px] border-collapse min-w-[700px]">
                      <thead>
                        <tr>
                          <th rowSpan={2} className="border-b border-r border-gray-200 bg-white px-4 py-2.5 text-center align-middle font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-28">
                            Grade
                          </th>
                          <th colSpan={8} className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                            Monthly Salary by Step
                          </th>
                        </tr>
                        <tr className="border-b-2 border-gray-200">
                          {STEPS.map(s => (
                            <th key={s} className="border-b border-r last:border-r-0 border-gray-200 bg-gray-50 px-3 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wide w-28">
                              Step {s}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {matrix.map((grade, i) => (
                          <tr key={grade.salary_grade} className={cn("hover:bg-gray-50/60 transition-colors", i % 2 === 1 && "bg-gray-50/30")}>
                            <td className="border-r border-gray-100 px-4 py-2.5 text-center font-semibold text-gray-900 tabular-nums">
                              {grade.salary_grade}
                            </td>
                            {STEPS.map(s => (
                              <td key={s} className="border-r last:border-r-0 border-gray-100 px-3 py-2.5 text-right font-mono text-gray-700 tabular-nums">
                                {fmtSalary(grade.steps[s])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-200 bg-gray-50">
                          <td className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{matrix.length} grades</td>
                          {STEPS.map(s => <td key={s} className="border-r last:border-r-0 border-gray-100" />)}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm shadow-sm">
                  No salary steps found for this version.
                </div>
              )}
            </div>
          )}
        </>
      )}

      <ExcelUploadModal
        isOpen={uploadOpen} onClose={() => setUploadOpen(false)}
        title="Upload Salary Grade Matrix" entityName="salary matrix"
        confirmationDescription="A new salary standard version will be created with the details provided."
        parseRow={parseSalaryRow} requiredColumns={[]} onSave={handleSaveMatrix}
        additionalFields={renderVersionFields()} headerRowsToSkip={2}
        customColumns={salaryColumns} transformPreview={transformSalaryPreview}
      />
    </div>
  );
};

export default TranchePage;
