import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { useIsMobile } from "@/src/hooks/use-mobile";
import { Department, BudgetPlan, DepartmentReviewSchedule } from "@/src/types/api";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/src/components/ui/dialog";
import {
  CalendarIcon, MapPinIcon, ClockIcon, ArrowPathIcon, PlusIcon, CheckIcon,
} from "@heroicons/react/24/outline";

// ── Data hooks ───────────────────────────────────────────────────────────────

function useActiveBudgetPlan() {
  return useQuery<BudgetPlan | null>({
    queryKey: ["budget-plan-active"],
    queryFn: () => API.get("/budget-plans/active").then(r => r.data?.data ?? null).catch(() => null),
  });
}

function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => API.get("/departments").then(r => r.data?.data ?? []),
  });
}

function useSchedules(budgetPlanId: number | null) {
  return useQuery<DepartmentReviewSchedule[]>({
    queryKey: ["department-review-schedules", budgetPlanId],
    queryFn: () =>
      API.get("/department-review-schedules", { params: { budget_plan_id: budgetPlanId } })
        .then(r => r.data?.data ?? []),
    enabled: !!budgetPlanId,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

const periodLabel = (p: "morning" | "afternoon") => (p === "morning" ? "Morning" : "Afternoon");

const formatDate = (dateStr: string) => {
  const datePart = dateStr.split("T")[0];
  return new Date(datePart + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
};

const formatTime = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }).replace(" ", "\u00A0");
};

type Tone = { text: string; dot: string; label: string };

const statusTone = (status: DepartmentReviewSchedule["status"]): Tone => {
  const map: Record<string, Tone> = {
    scheduled: { text: "text-amber-700",   dot: "bg-amber-500",   label: "Scheduled" },
    moved:     { text: "text-amber-700",   dot: "bg-amber-500",   label: "Rescheduled" },
    completed: { text: "text-emerald-700", dot: "bg-emerald-500", label: "Completed" },
    cancelled: { text: "text-gray-400",    dot: "bg-gray-300",    label: "Cancelled" },
  };
  return map[status];
};

const statusBg = (status: DepartmentReviewSchedule["status"]) => {
  const map: Record<string, string> = {
    scheduled: "bg-amber-50 border-amber-200",
    moved: "bg-amber-50 border-amber-200",
    completed: "bg-emerald-50 border-emerald-200",
    cancelled: "bg-gray-50 border-gray-200",
  };
  return map[status];
};

const StatusPill: React.FC<{ status: DepartmentReviewSchedule["status"] }> = ({ status }) => {
  const t = statusTone(status);
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium", statusBg(status), t.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", t.dot)} />
      {t.label}
    </span>
  );
};

interface ContextMenuState {
  x: number;
  y: number;
  schedule: DepartmentReviewSchedule;
}

// ── Schedule form dialog (create or reschedule) ───────────────────────────────

interface FormDialogProps {
  mode: "create" | "reschedule" | null;
  dept: Department | null;
  schedule: DepartmentReviewSchedule | null;
  budgetPlanId: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const ScheduleFormDialog: React.FC<FormDialogProps> = ({ mode, dept, schedule, budgetPlanId, onClose, onSaved }) => {
  const [date, setDate]       = useState("");
  const [period, setPeriod]   = useState<"morning" | "afternoon">("morning");
  const [time, setTime]       = useState("");
  const [location, setLocation] = useState("");
  const [reason, setReason]   = useState("");
  const [saving, setSaving]   = useState(false);

  React.useEffect(() => {
    if (mode === "reschedule" && schedule) {
      setDate(schedule.review_date.split("T")[0]);
      setPeriod(schedule.period);
      setTime(schedule.review_time?.slice(0, 5) ?? "");
      setLocation(schedule.location ?? "");
      setReason("");
    } else if (mode === "create") {
      const todayStr = new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd, local time-safe
      setDate(todayStr); setPeriod("morning"); setTime("08:00"); setLocation(""); setReason("");
    }
  }, [mode, schedule]);

  const handleSave = async () => {
    if (!date) { toast.error("Please select a review date."); return; }
    setSaving(true);
    try {
      if (mode === "create" && dept && budgetPlanId) {
        await API.post("/department-review-schedules", {
          dept_id: dept.dept_id,
          budget_plan_id: budgetPlanId,
          review_date: date,
          period,
          review_time: time || null,
          location: location || null,
        });
        toast.success(`Schedule set for ${dept.dept_name}.`);
      } else if (mode === "reschedule" && schedule) {
        await API.patch(`/department-review-schedules/${schedule.dept_review_schedule_id}/reschedule`, {
          review_date: date,
          period,
          review_time: time || null,
          location: location || null,
          reason: reason || null,
        });
        toast.success("Schedule moved.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  const targetDept = dept ?? schedule?.department ?? null;

  return (
    <Dialog open={mode !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg rounded-xl border-gray-200 gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-gray-100">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">
            {mode === "create" ? "Set Review Schedule" : "Reschedule Review"}
          </DialogTitle>
          <DialogDescription className="text-[12px] text-gray-500 mt-0.5">
            {targetDept?.dept_name}
            {mode === "reschedule" && schedule && (
              <> — currently {formatDate(schedule.review_date)}, {periodLabel(schedule.period)}
                {schedule.review_time ? ` at ${formatTime(schedule.review_time)}` : ""}.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-gray-600">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="h-9 text-sm border-gray-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-gray-600">
                Period <span className="text-red-500">*</span>
              </Label>
              <Select value={period} onValueChange={(v) => {
                const next = v as "morning" | "afternoon";
                setPeriod(next);
                setTime(next === "afternoon" ? "13:00" : "08:00");
              }}>
                <SelectTrigger className="h-9 text-sm border-gray-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-gray-600">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="h-9 text-sm border-gray-200" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-gray-600">Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Budget Office, 2nd Flr"
                className="h-9 text-sm border-gray-200" />
            </div>
          </div>

          {mode === "reschedule" && (
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium text-gray-600">Reason for moving</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Moved to next day afternoon due to a delay in the prior department's review."
                rows={3}
                className="text-sm border-gray-200 resize-none"
              />
              <p className="text-[11px] text-gray-400">
                Shown to the department as: "Reason: {reason || "…"}"
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-gray-100 gap-2">
          <Button variant="outline" size="sm"
            className="h-8 text-xs border-gray-200"
            onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm"
            className="h-8 text-xs bg-gray-900 hover:bg-gray-800 text-white"
            onClick={handleSave} disabled={saving}>
            {saving
              ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin mr-1.5" /> Saving…</>
              : mode === "create" ? "Set Schedule" : "Move Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Main page ──────────────────────────────────────────────────────────────

const DepartmentReviewSchedulesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: activePlan }       = useActiveBudgetPlan();
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();

  const [completingId, setCompletingId] = useState<number | null>(null);

  const selectedPlanId = activePlan?.budget_plan_id ?? null;

  const { data: schedules = [], isLoading: schedulesLoading } = useSchedules(selectedPlanId);

  const scheduleByDept = useMemo(() => {
    const m = new Map<number, DepartmentReviewSchedule>();
    schedules.forEach(s => m.set(s.dept_id, s));
    return m;
  }, [schedules]);

  const [formState, setFormState] = useState<{ mode: "create" | "reschedule" | null; dept: Department | null; schedule: DepartmentReviewSchedule | null }>({
    mode: null, dept: null, schedule: null,
  });

  const openCreate = (dept: Department) => setFormState({ mode: "create", dept, schedule: null });
  const openReschedule = (schedule: DepartmentReviewSchedule) => setFormState({ mode: "reschedule", dept: null, schedule });
  const closeForm = () => setFormState({ mode: null, dept: null, schedule: null });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["department-review-schedules", selectedPlanId] });
  };

  const handleMarkComplete = async (schedule: DepartmentReviewSchedule) => {
    setCompletingId(schedule.dept_review_schedule_id);
    try {
      await API.put(`/department-review-schedules/${schedule.dept_review_schedule_id}`, {
        status: "completed",
      });
      toast.success(`Marked ${schedule.department?.dept_name ?? "department"}'s review as completed.`);
      refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to mark as completed.");
    } finally {
      setCompletingId(null);
    }
  };

  // ── Context menu / action sheet ────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const handleRowClick = (e: React.MouseEvent, dept: Department, s: DepartmentReviewSchedule | undefined) => {
    if (!s) { openCreate(dept); return; }
    const canAct = s.status !== "completed" && s.status !== "cancelled";
    if (!canAct) return; // nothing actionable for completed/cancelled rows

    if (isMobile) {
      setCtxMenu({ x: 0, y: 0, schedule: s });
      return;
    }
    const MENU_W = 190, MENU_H = 90;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, schedule: s });
  };

  const loading = deptsLoading || schedulesLoading;

  return (
    <div className="relative">
      {/* Header — matches System tab header proportions */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-0.5">Budget</p>
        <h1 className="text-[18px] font-semibold text-gray-900 mb-1">Department Review Schedules</h1>
        <p className="text-[13px] text-gray-500">
          Set when each department is scheduled for their budget proposal review.
        </p>
      </div>

      {/* Table card — matches other tabs' rounded-xl border-gray-200 bg-white card style */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400 gap-2">
            <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            Loading…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
              <div className="w-[460px] shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Department</div>
              <div className="flex-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Schedule</div>
              <div className="w-[120px] shrink-0 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">Status</div>
            </div>

            <div className="divide-y divide-gray-100">
              {departments.map((dept) => {
                const s = scheduleByDept.get(dept.dept_id);
                const canAct = s && s.status !== "completed" && s.status !== "cancelled";
                const clickable = !s || canAct;

                return (
                  <div
                    key={dept.dept_id}
                    onClick={(e) => handleRowClick(e, dept, s)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3 transition-colors select-none",
                      clickable ? "cursor-pointer hover:bg-gray-50/80" : "cursor-default",
                    )}
                  >

                    {/* Department */}
                    <div className="w-[460px] shrink-0 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800">
                        {dept.dept_abbreviation && (
                          <span className="font-mono text-[10px] font-medium text-gray-400 mr-1.5">
                            {dept.dept_abbreviation}
                          </span>
                        )}
                        {dept.dept_name}
                      </p>
                    </div>

                    {/* Schedule details */}
                    <div className="flex-1 min-w-0">
                      {s ? (
                        <div>
                          <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-gray-800">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.75} />
                            {formatDate(s.review_date)} · {periodLabel(s.period)}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                            {s.review_time && (
                              <span className="flex items-center gap-1 whitespace-nowrap">
                                <ClockIcon className="w-3 h-3" strokeWidth={2} />{formatTime(s.review_time)}
                              </span>
                            )}
                            {s.location && (
                              <span className="flex items-center gap-1">
                                <MapPinIcon className="w-3 h-3" strokeWidth={2} />{s.location}
                              </span>
                            )}
                          </div>
                          {s.status === "moved" && s.previous_date && (
                            <p className="flex items-start gap-1 mt-1.5 text-[10.5px] text-gray-400 leading-snug">
                              <ArrowPathIcon className="w-3 h-3 flex-shrink-0 mt-[1px]" strokeWidth={2} />
                              Moved from {formatDate(s.previous_date)}
                              {s.previous_period ? ` · ${periodLabel(s.previous_period)}` : ""}
                              {s.reschedule_reason ? ` — ${s.reschedule_reason}` : ""}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="pl-5 text-[12.5px] text-gray-300">Not scheduled — click to set</span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="w-[120px] shrink-0 flex justify-center">
                      {s
                        ? <StatusPill status={s.status} />
                        : <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400">
                            <PlusIcon className="w-3 h-3" /> Set
                          </span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Context Menu (desktop) / Action Sheet (mobile) ── */}
      {ctxMenu && (isMobile ? (
        <div className="fixed inset-0 z-[9999] flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCtxMenu(null)} />
          <div ref={ctxRef} className="relative w-full bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
            <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1" />
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[13px] font-semibold text-gray-900 truncate">
                {ctxMenu.schedule.department?.dept_name ?? "Department"}
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {formatDate(ctxMenu.schedule.review_date)} · {periodLabel(ctxMenu.schedule.period)}
              </p>
            </div>
            <button
              disabled={completingId === ctxMenu.schedule.dept_review_schedule_id}
              onClick={() => { handleMarkComplete(ctxMenu.schedule); setCtxMenu(null); }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-[14px] text-emerald-700 active:bg-emerald-50 transition-colors"
            >
              <CheckIcon className="w-4 h-4 text-emerald-500 shrink-0" />
              Mark Complete
            </button>
            <button
              onClick={() => { openReschedule(ctxMenu.schedule); setCtxMenu(null); }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-[14px] text-gray-700 border-t border-gray-100 active:bg-gray-50 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4 text-gray-400 shrink-0" />
              Move Schedule
            </button>
            <button
              onClick={() => setCtxMenu(null)}
              className="w-full px-4 py-3.5 text-[14px] font-medium text-gray-400 border-t border-gray-100 active:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={ctxRef}
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[190px] overflow-hidden"
        >
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[165px]">
              {ctxMenu.schedule.department?.dept_name ?? "Department"}
            </p>
          </div>
          <button
            disabled={completingId === ctxMenu.schedule.dept_review_schedule_id}
            onClick={() => { handleMarkComplete(ctxMenu.schedule); setCtxMenu(null); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <CheckIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            Mark Complete
          </button>
          <button
            onClick={() => { openReschedule(ctxMenu.schedule); setCtxMenu(null); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Move Schedule
          </button>
        </div>
      ))}

      <ScheduleFormDialog
        mode={formState.mode}
        dept={formState.dept}
        schedule={formState.schedule}
        budgetPlanId={selectedPlanId}
        onClose={closeForm}
        onSaved={refresh}
      />
    </div>
  );
};

export default DepartmentReviewSchedulesPage;
