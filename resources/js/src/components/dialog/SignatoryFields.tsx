import React, { useEffect, useState } from "react";
import API from "@/src/services/api";
import { useDebounce } from "@/src/hooks/useDebounce";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/src/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/src/components/ui/command";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import { MagnifyingGlassIcon, CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "@/src/lib/utils";

const ALL_DEPTS = "__all__";

interface DeptOption {
  dept_id: number;
  dept_name: string;
  dept_abbreviation: string | null;
}

interface PersonnelResult {
  personnel_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  plantilla_assignments?: {
    plantilla_position?: {
      department?: { dept_id: number; dept_name: string; dept_abbreviation: string | null } | null;
    } | null;
  }[];
}

const fullName = (p: PersonnelResult) =>
  [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(" ");

// ─── Signatory Name ─────────────────────────────────────────────────────────
// Free-text input + optional search across personnel, scoped to any
// department (or "all"), since a personnel can be borrowed as signatory
// for a department they aren't assigned to.

export function SignatoryNameField({
  value, onChange, departments, defaultDeptId,
}: {
  value: string;
  onChange: (v: string) => void;
  departments: DeptOption[];
  defaultDeptId: string | null; // department currently being edited, if any
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [scopeDeptId, setScopeDeptId] = useState<string>(defaultDeptId ?? ALL_DEPTS);
  const [results, setResults] = useState<PersonnelResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setScopeDeptId(defaultDeptId ?? ALL_DEPTS);
  }, [defaultDeptId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSearching(true);
    const params = new URLSearchParams();
    if (scopeDeptId !== ALL_DEPTS) params.set("dept_id", scopeDeptId);
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    API.get(`/personnels/search-signatory?${params.toString()}`)
      .then((res) => { if (!cancelled) setResults(Array.isArray(res.data?.data) ? res.data.data : []); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [open, debouncedQuery, scopeDeptId]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">Signatory Name</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a name, or search →"
          className="h-9 text-sm flex-1"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 flex-shrink-0"
              title="Search personnel"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-0" align="end">
            <div className="p-2 border-b border-gray-100">
              <Select value={scopeDeptId} onValueChange={setScopeDeptId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_DEPTS} className="text-xs">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.dept_id} value={d.dept_id.toString()} className="text-xs">
                      {d.dept_abbreviation ?? d.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Command shouldFilter={false}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search personnel by name…"
                className="h-9 text-sm"
              />
              <CommandList>
                <CommandEmpty className="py-6 text-center text-xs text-gray-400">
                  {searching ? "Searching…" : "No personnel found."}
                </CommandEmpty>
                <CommandGroup>
                  {results.map((p) => {
                    const name = fullName(p);
                    const depts = (p.plantilla_assignments ?? [])
                      .map((a) => a.plantilla_position?.department?.dept_abbreviation
                        ?? a.plantilla_position?.department?.dept_name)
                      .filter(Boolean);
                    return (
                      <CommandItem
                        key={p.personnel_id}
                        value={`${p.personnel_id}-${name}`}
                        onSelect={() => { onChange(name); setOpen(false); }}
                        className="text-sm"
                      >
                        <CheckIcon className={cn("mr-2 h-3.5 w-3.5 flex-shrink-0", value === name ? "opacity-100" : "opacity-0")} />
                        <div className="min-w-0">
                          <p className="truncate text-gray-800">{name}</p>
                          {depts.length > 0 && (
                            <p className="text-[10px] text-gray-400 truncate">{depts.join(", ")}</p>
                          )}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[10.5px] text-gray-400">Type freely, or use search to pick from personnel records.</p>
    </div>
  );
}

// ─── Signatory Title ────────────────────────────────────────────────────────
// Free-text input + optional search, always scoped to the department
// being edited (a title should reflect a real plantilla position in
// THIS department, not a borrowed one).

export function SignatoryTitleField({
  value, onChange, deptId,
}: {
  value: string;
  onChange: (v: string) => void;
  deptId: string | null; // department being edited; null while creating
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open || !deptId) return;
    let cancelled = false;
    setSearching(true);
    const params = new URLSearchParams();
    params.set("dept_id", deptId);
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    API.get(`/plantilla-positions/search-title?${params.toString()}`)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setResults(rows.map((r: any) => r.position_title).filter(Boolean));
      })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [open, debouncedQuery, deptId]);

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">Signatory Title</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type a title, or search →"
          className="h-9 text-sm flex-1"
        />
        <Popover open={open} onOpenChange={(o) => deptId && setOpen(o)}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!deptId}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              title={deptId ? "Search this department's plantilla positions" : "Save the department first to search its plantilla"}
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <Command shouldFilter={false}>
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder="Search plantilla titles…"
                className="h-9 text-sm"
              />
              <CommandList>
                <CommandEmpty className="py-6 text-center text-xs text-gray-400">
                  {searching ? "Searching…" : "No matching titles."}
                </CommandEmpty>
                <CommandGroup>
                  {results.map((title) => (
                    <CommandItem
                      key={title}
                      value={title}
                      onSelect={() => { onChange(title); setOpen(false); }}
                      className="text-sm"
                    >
                      <CheckIcon className={cn("mr-2 h-3.5 w-3.5 flex-shrink-0", value === title ? "opacity-100" : "opacity-0")} />
                      {title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-[10.5px] text-gray-400">
        {deptId
          ? "Restricted to this department's plantilla — or type any title manually."
          : "Save the department once first to search its plantilla positions."}
      </p>
    </div>
  );
}
