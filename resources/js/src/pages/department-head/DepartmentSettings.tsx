import React, { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import API from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { Department } from "../../types/api";
import { LoadingState } from "../common/LoadingState";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { BuildingOffice2Icon, PhotoIcon, LockClosedIcon } from "@heroicons/react/24/outline";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (dept: Department): string => {
  if (dept.dept_abbreviation) return dept.dept_abbreviation.slice(0, 3).toUpperCase();
  return dept.dept_name.slice(0, 2).toUpperCase();
};

// ─── Read-only field ──────────────────────────────────────────────────────────

const ReadOnlyField: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5">
      <Label className="text-xs font-semibold text-gray-500">{label}</Label>
      <LockClosedIcon className="w-3 h-3 text-gray-300" />
    </div>
    <div className="h-9 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-400 select-none">
      {value ?? <span className="text-gray-300 italic text-xs">Not set</span>}
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

const DepartmentSettings: React.FC = () => {
  const { user } = useAuth();

  const [dept, setDept]       = useState<Department | null>(null);
  const [loading, setLoading] = useState(true);

  const [mandate, setMandate]                     = useState("");
  const [specialProvisions, setSpecialProvisions] = useState("");
  const [logoPreview, setLogoPreview]             = useState<string | null>(null);
  const logoFileRef                               = useRef<File | null>(null);
  const fileInputRef                              = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting]               = useState(false);
  const [dirty, setDirty]                         = useState(false);

  useEffect(() => {
    const deptId = (user as any)?.dept_id;
    if (!deptId) { setLoading(false); return; }
    fetchDepartment(Number(deptId));
  }, [user]);

  const fetchDepartment = async (id: number) => {
    setLoading(true);
    try {
      const res   = await API.get("/departments");
      const list: Department[] = Array.isArray(res.data?.data) ? res.data.data : [];
      const found = list.find((d) => d.dept_id === id) ?? null;
      setDept(found);
      setMandate(found?.mandate ?? "");
      setSpecialProvisions(found?.special_provisions ?? "");
      setLogoPreview(found?.logo ? `/storage/${found.logo}` : null);
    } catch {
      toast.error("Failed to load department details.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    logoFileRef.current = file;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setLogoPreview(reader.result as string); setDirty(true); };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!dept) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("_method",            "PUT");
      fd.append("dept_name",          dept.dept_name);
      fd.append("dept_category_id",   dept.dept_category_id?.toString() ?? "");
      fd.append("mandate",            mandate);
      fd.append("special_provisions", specialProvisions);
      if (logoFileRef.current) fd.append("logo", logoFileRef.current);

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/departments/${dept.dept_id}`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body:    fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Update failed");
      }

      toast.success("Department updated successfully.");
      logoFileRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
      setDirty(false);
      fetchDepartment(dept.dept_id);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update department.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;

  if (!dept) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-32 text-center text-gray-400">
        <BuildingOffice2Icon className="w-10 h-10 mb-3 text-gray-300" />
        <p className="text-sm">No department linked to your account.</p>
        <p className="text-xs mt-1 text-gray-300">Contact an administrator.</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full">

      {/* ── Page Header ── */}
      <div className="mb-6 flex-shrink-0">
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
          Department
        </span>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
          Department Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Update your department's mandate, special provisions, and logo. Other fields are managed by administrators.
        </p>
      </div>

      {/* ── Card ── */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-0">

        {/* Hero */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-5 flex-shrink-0">
          <Avatar className="h-14 w-14 rounded-full border border-gray-200 shadow-sm flex-shrink-0">
            <AvatarImage src={logoPreview ?? undefined} alt={dept.dept_name} />
            <AvatarFallback className="rounded-full bg-gray-100 text-gray-600 text-sm font-semibold">
              {getInitials(dept)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[16px] font-semibold text-gray-900 leading-tight">{dept.dept_name}</p>
            {dept.dept_abbreviation && (
              <p className="text-xs font-mono text-gray-400 mt-0.5">{dept.dept_abbreviation}</p>
            )}
            {dept.category && (
              <span className="mt-1.5 inline-block text-[10px] font-medium text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-0.5">
                {dept.category.dept_category_name}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* ── Col 1: read-only info ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Department Info</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>
              <ReadOnlyField label="Department Name" value={dept.dept_name} />
              <ReadOnlyField label="Abbreviation"    value={dept.dept_abbreviation} />
              <ReadOnlyField label="Category"        value={dept.category?.dept_category_name} />
              <p className="text-[10px] text-gray-300 leading-relaxed pt-1">
                These fields are controlled by system administrators and cannot be edited here.
              </p>
            </div>

            {/* ── Col 2+3: editable fields ── */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Editable Fields</span>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              {/* Mandate */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Mandate</Label>
                <Textarea
                  value={mandate}
                  onChange={(e) => { setMandate(e.target.value); setDirty(true); }}
                  placeholder="Describe your department's mandate, purpose, and key responsibilities…"
                  className="text-sm resize-none min-h-[120px]"
                  rows={5}
                />
                <p className="text-[10px] text-gray-400">Visible in official department listings and reports.</p>
              </div>

              {/* Special Provisions */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Special Provisions</Label>
                <Textarea
                  value={specialProvisions}
                  onChange={(e) => { setSpecialProvisions(e.target.value); setDirty(true); }}
                  placeholder="Enter any special provisions applicable to this department…"
                  className="text-sm resize-none min-h-[120px]"
                  rows={5}
                />
                <p className="text-[10px] text-gray-400">Used in budget reports and formal department documents.</p>
              </div>

              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-600">Logo</Label>
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 rounded-full border border-gray-200 flex-shrink-0">
                    <AvatarImage src={logoPreview ?? undefined} alt="Logo preview" />
                    <AvatarFallback className="rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                      {getInitials(dept)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1.5">
                    <label className="flex items-center gap-2.5 h-9 px-3 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors cursor-pointer text-xs text-gray-500 w-full">
                      <PhotoIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{logoFileRef.current?.name ?? "Choose image…"}</span>
                      <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="text-[10px] text-gray-400">JPEG, PNG, SVG or GIF · max 5 MB</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Card footer */}
        <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-end gap-2.5 flex-shrink-0">
          {dirty && <span className="text-[11px] text-amber-500">Unsaved changes</span>}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
            onClick={handleSubmit}
            disabled={submitting || !dirty}
          >
            {submitting ? (
              <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            ) : "Save Changes"}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default DepartmentSettings;