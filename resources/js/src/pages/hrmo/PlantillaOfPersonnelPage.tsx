import React, { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { CalendarIcon, ChevronsUpDown } from 'lucide-react'
import { ArrowsUpDownIcon as SortIcon } from '@heroicons/react/24/outline'
import { Button } from '@/src/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/src/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem,
} from "@/src/components/ui/command"
import { Calendar } from "@/src/components/ui/calendar"
import { cn } from "@/src/lib/utils"
import { TabScrollIndicator } from '@/src/components/ui/TabScrollIndicator';
import { LoadingState } from '../common/LoadingState'
import API from '../../services/api'
import { Department, PlantillaPosition, Personnel } from '../../types/api'

interface PlantillaWithAssignment extends PlantillaPosition {
  assignments?: any[]
}

interface AssignmentDraft {
  positionId: number
  personnelId: number | null
  assignmentDate: Date | null
}

const PlantillaOfPersonnelPage: React.FC = () => {
  const [departments,        setDepartments]        = useState<Department[]>([])
  const [plantillaPositions, setPlantillaPositions] = useState<PlantillaWithAssignment[]>([])
  const [personnels,         setPersonnels]         = useState<Personnel[]>([])
  const [loading,            setLoading]            = useState(true)
  const [saving,             setSaving]             = useState(false)
  const [sorting,            setSorting]            = useState(false)
  const [activeTab,          setActiveTab]          = useState<number | null>(null)
  const [assignments,        setAssignments]        = useState<AssignmentDraft[]>([])
  const [initialSnapshot,    setInitialSnapshot]    = useState<AssignmentDraft[]>([])
  const [pendingTab,         setPendingTab]         = useState<number | null>(null)
  const [showUnsavedDialog,  setShowUnsavedDialog]  = useState(false)
  const [showSortDialog,     setShowSortDialog]     = useState(false)

  const dbAssignmentMap = useMemo(() => {
    const map = new Map<number, number>()
    plantillaPositions.forEach(pos => {
      const a = pos.assignments?.[0]
      if (a?.personnel_id) map.set(a.personnel_id, pos.plantilla_position_id)
    })
    return map
  }, [plantillaPositions])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [deptRes, plantillaRes, personnelRes] = await Promise.all([
          API.get('/departments'),
          API.get('/plantilla-positions?include=assignments.personnel'),
          API.get('/personnels'),
        ])
        setDepartments(deptRes.data.data || [])
        setPlantillaPositions(plantillaRes.data.data || [])
        setPersonnels(personnelRes.data.data || [])
        if (deptRes.data.data?.length > 0) setActiveTab(deptRes.data.data[0].dept_id)
      } catch {
        toast.error('Failed to load data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const positionsForActiveDept = useMemo(
    () => plantillaPositions
      .filter(p => p.dept_id === activeTab && p.is_active === true)
      .sort((a, b) => {
        const aNum = parseInt(a.new_item_number ?? '0', 10) || 0
        const bNum = parseInt(b.new_item_number ?? '0', 10) || 0
        return aNum - bNum
      }),
    [plantillaPositions, activeTab]
  )

  useEffect(() => {
    if (!activeTab) return
    const initial: AssignmentDraft[] = positionsForActiveDept.map(pos => {
      const ex = pos.assignments?.[0]
      const rawDate = ex?.assignment_date ?? ex?.effective_date ?? null
      return {
        positionId:     pos.plantilla_position_id,
        personnelId:    ex?.personnel_id   || null,
        assignmentDate: rawDate ? new Date(rawDate) : null,
      }
    })
    setAssignments(initial)
    setInitialSnapshot(initial)
  }, [activeTab, positionsForActiveDept])

  const getAssignment = (id: number) => assignments.find(a => a.positionId === id)

  const updateAssignment = (id: number, updates: Partial<AssignmentDraft>) =>
    setAssignments(prev => prev.map(a => a.positionId === id ? { ...a, ...updates } : a))

  const hasUnsavedChanges = useMemo(() => {
    if (assignments.length !== initialSnapshot.length) return true
    return assignments.some((a, i) => {
      const s = initialSnapshot[i]
      return (
        a.personnelId    !== s.personnelId ||
        a.assignmentDate?.getTime() !== s.assignmentDate?.getTime()
      )
    })
  }, [assignments, initialSnapshot])

  const handleTabChange = (deptId: number) => {
    if (hasUnsavedChanges) {
      setPendingTab(deptId)
      setShowUnsavedDialog(true)
    } else {
      setActiveTab(deptId)
    }
  }

  const handleSortAndRenumber = async () => {
  setSorting(true)
  try {
    const allPositions = [...plantillaPositions]
    const deptOrder = departments.map(d => d.dept_id)

    // Build assigned position IDs from the DB-loaded assignments on ALL positions,
    // then override with the current tab's draft state (which may have unsaved changes).
    const assignedPositionIds = new Set<number>()

    allPositions.forEach(pos => {
      // Use the loaded assignments from the API for non-active-tab departments
      const hasDbAssignment = (pos.assignments?.length ?? 0) > 0 &&
        pos.assignments![0]?.personnel_id != null

      if (pos.dept_id !== activeTab) {
        // Not the current tab — trust the DB data
        if (hasDbAssignment) {
          assignedPositionIds.add(pos.plantilla_position_id)
        }
      } else {
        // Current tab — use the live draft state instead
        const draft = assignments.find(a => a.positionId === pos.plantilla_position_id)
        if (draft?.personnelId != null) {
          assignedPositionIds.add(pos.plantilla_position_id)
        }
      }
    })

    const activeNumbered: { pos: PlantillaWithAssignment; newNumber: number }[] = []

    deptOrder.forEach(deptId => {
      const deptPositions = allPositions.filter(p => p.dept_id === deptId)

      // Tier 1: active + assigned → SG desc
      const assigned = deptPositions
        .filter(p => p.is_active && assignedPositionIds.has(p.plantilla_position_id))
        .sort((a, b) => Number(b.salary_grade) - Number(a.salary_grade))

      // Tier 2: active + vacant → SG desc
      const vacant = deptPositions
        .filter(p => p.is_active && !assignedPositionIds.has(p.plantilla_position_id))
        .sort((a, b) => Number(b.salary_grade) - Number(a.salary_grade))

      ;[...assigned, ...vacant].forEach(pos => {
        activeNumbered.push({ pos, newNumber: activeNumbered.length + 1 })
      })
    })

    // Tier 3: inactive → SG desc, globally at the end
    const inactive = allPositions
      .filter(p => !p.is_active)
      .sort((a, b) => Number(b.salary_grade) - Number(a.salary_grade))

    const inactiveNumbered = inactive.map((pos, i) => ({
      pos,
      newNumber: activeNumbered.length + i + 1,
    }))

    const allNumbered = [...activeNumbered, ...inactiveNumbered]

    await API.post('/plantilla-positions/renumber', {
      positions: allNumbered.map(({ pos, newNumber }) => ({
        plantilla_position_id: pos.plantilla_position_id,
        new_item_number:       String(newNumber),
      })),
    })

    // Update local state
    const numberMap = new Map(
      allNumbered.map(({ pos, newNumber }) => [pos.plantilla_position_id, String(newNumber)])
    )
    setPlantillaPositions(prev =>
      prev.map(p => ({
        ...p,
        new_item_number: numberMap.get(p.plantilla_position_id) ?? p.new_item_number,
      }))
    )

    toast.success('Positions sorted and renumbered successfully.')
  } catch (err: any) {
    toast.error(`Failed to renumber: ${err?.response?.data?.message || err?.message || 'Unknown error'}`)
  } finally {
    setSorting(false)
    setShowSortDialog(false)
  }
}

  // ── Personnel combobox ────────────────────────────────────────────────────

  const PersonnelCombobox = ({
    positionId, selectedId, onChange,
  }: { positionId: number; selectedId: number | null; onChange: (id: number | null) => void }) => {
    const [open, setOpen] = useState(false)

    const unavailableIds = useMemo(() => {
      const map = new Map(dbAssignmentMap)
      assignments.forEach(a => {
        for (const [pid, posId] of map.entries()) {
          if (posId === a.positionId) map.delete(pid)
        }
        if (a.personnelId) map.set(a.personnelId, a.positionId)
      })
      const set = new Set<number>()
      for (const [pid, posId] of map.entries()) {
        if (posId !== positionId) set.add(pid)
      }
      return set
    }, [dbAssignmentMap, assignments, positionId])

    const available = useMemo(
      () => personnels.filter(p => !unavailableIds.has(p.personnel_id)),
      [personnels, unavailableIds]
    )
    const selected = personnels.find(p => p.personnel_id === selectedId)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open}
            className="w-full h-8 justify-between text-xs border-gray-200 font-normal">
            <span className={cn('truncate', !selected && 'text-gray-400')}>
              {selected ? `${selected.last_name}, ${selected.first_name}` : 'Vacant'}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0">
          <Command>
            <CommandInput placeholder="Search personnel…" className="h-8 text-xs" />
            <CommandEmpty className="text-xs py-3 text-center text-gray-400">No personnel found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => { onChange(null); setOpen(false) }} className="text-xs">
                <span className="text-gray-400">— Vacant —</span>
              </CommandItem>
              {available.map(p => (
                <CommandItem key={p.personnel_id}
                  onSelect={() => { onChange(p.personnel_id); setOpen(false) }}
                  className="text-xs">
                  {p.last_name}, {p.first_name} {p.middle_name || ''}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }

  // ── Date picker ───────────────────────────────────────────────────────────

  const DatePicker = ({ date, onChange }: { date: Date | null; onChange: (d: Date | null) => void }) => {
    const [month, setMonth] = useState<Date>(date || new Date())
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline"
            className={cn('w-full h-8 justify-start text-left font-normal text-xs border-gray-200', !date && 'text-gray-400')}>
            <CalendarIcon className="mr-1.5 h-3 w-3 text-gray-400" />
            {date ? format(date, 'MMM d, yyyy') : 'Pick date'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date || undefined} onSelect={d => onChange(d || null)}
            month={month} onMonthChange={setMonth} captionLayout="dropdown"
            fromDate={new Date(1900, 0, 1)} toDate={new Date(2100, 11, 31)} required={false} />
        </PopoverContent>
      </Popover>
    )
  }

  // ── Save assignments ──────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = assignments.map(a => ({
        plantilla_position_id: a.positionId,
        personnel_id:          a.personnelId,
        assignment_date:       a.assignmentDate ? format(a.assignmentDate, 'yyyy-MM-dd') : null,
      }))
      await API.post('/plantilla-assignments/bulk', { assignments: payload })
      toast.success('Assignments saved.')
      setPlantillaPositions(prev =>
        prev.map(pos => {
          if (pos.dept_id !== activeTab) return pos
          const saved = assignments.find(a => a.positionId === pos.plantilla_position_id)
          if (!saved) return pos
          return {
            ...pos,
            assignments: saved.personnelId
              ? [{ personnel_id: saved.personnelId, assignment_date: saved.assignmentDate?.toISOString() ?? null, effective_date: saved.assignmentDate?.toISOString() ?? null }]
              : [],
          }
        })
      )
      setInitialSnapshot(assignments)
    } catch {
      toast.error('Failed to save assignments.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingState />

  return (
    <div className="p-6 space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">HR Management</span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">Plantilla of Personnel</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Sort & Renumber button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSortDialog(true)}
            disabled={sorting}
            className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900"
            title="Sort positions by priority and reassign item numbers globally"
          >
            {sorting
              ? <><span className="w-3 h-3 border-2 border-gray-400/30 border-t-gray-600 rounded-full animate-spin" />Sorting…</>
              : <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h10M3 8h6M3 11h3M11 9l2 2 2-2M13 7v4"/></svg>Sort &amp; Renumber</>
            }
          </Button>
          {/* Save assignments button */}
          {activeTab && (
            <Button size="sm" onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={cn('gap-1.5 text-xs h-8', hasUnsavedChanges && 'bg-gray-900 hover:bg-gray-800 text-white')}>
              {saving
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : 'Save Assignments'
              }
            </Button>
          )}
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Unsaved changes
        </div>
      )}

     {/* Department tabs */}
      {departments.length > 0 && (
        <div className="space-y-1">
        <div className="relative flex items-center gap-1">
          <button
            onClick={() => {
              const el = document.getElementById('pop-tabs-scroll');
              if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
            }}
            className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div
            id="pop-tabs-scroll"
            className="flex-1 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex w-max gap-1">
              {departments.map((dept, idx) => (
                <button
                  key={dept.dept_id}
                  onClick={() => {
                    handleTabChange(dept.dept_id);
                    setTimeout(() => {
                      const strip = document.getElementById('pop-tabs-scroll');
                      const btn = strip?.querySelectorAll('button')[idx] as HTMLElement | undefined;
                      if (strip && btn) {
                        const btnLeft = btn.offsetLeft;
                        const btnWidth = btn.offsetWidth;
                        const stripW = strip.offsetWidth;
                        const scrollL = strip.scrollLeft;
                        if (btnLeft < scrollL + 40) {
                          strip.scrollBy({ left: btnLeft - scrollL - 40, behavior: 'smooth' });
                        } else if (btnLeft + btnWidth > scrollL + stripW - 40) {
                          strip.scrollBy({ left: btnLeft + btnWidth - scrollL - stripW + 40, behavior: 'smooth' });
                        }
                      }
                    }, 0);
                  }}
                  className={cn(
                    'flex-shrink-0 h-8 px-3.5 text-xs font-medium rounded-lg border transition-all duration-200 whitespace-nowrap',
                    activeTab === dept.dept_id
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-[1.03]'
                      : 'text-gray-500 border-transparent bg-gray-100 hover:bg-gray-200 hover:text-gray-800 hover:scale-[1.02]'
                  )}
                >
                  {dept.dept_abbreviation || dept.dept_name}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              const el = document.getElementById('pop-tabs-scroll');
              if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
            }}
            className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <TabScrollIndicator scrollId="pop-tabs-scroll" />
        </div>
      )}

      {/* Table */}
      {activeTab && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {positionsForActiveDept.length === 0 ? (
            <div className="text-center py-14 text-gray-400 text-sm">No active positions in this department.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th colSpan={2} className="border-b border-r border-gray-200 bg-white px-4 py-2.5 text-center font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Item Number</th>
                    <th className="border-b border-r border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Position Title</th>
                    <th className="border-b border-r border-gray-200 bg-white px-4 py-2.5 text-center font-semibold text-gray-600 text-[11px] uppercase tracking-wide">SG</th>
                    <th className="border-b border-r border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Incumbent</th>
                    <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Assignment Date</th>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="px-4 py-1.5 text-center text-[10px] text-gray-400 font-medium w-24 border-r border-gray-100">Old</th>
                    <th className="px-4 py-1.5 text-center text-[10px] text-gray-400 font-medium w-24 border-r border-gray-100">New</th>
                    <th className="border-r border-gray-100" /><th className="border-r border-gray-100" /><th className="border-r border-gray-100" /><th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {positionsForActiveDept.map((pos, i) => {
                    const assignment = getAssignment(pos.plantilla_position_id)
                    return (
                      <tr key={pos.plantilla_position_id}
                        className={cn('hover:bg-gray-50/60 transition-colors', i % 2 === 1 && 'bg-gray-50/20')}>
                        <td className="px-4 py-2 text-center font-mono text-gray-500 border-r border-gray-100">{pos.old_item_number || '–'}</td>
                        <td className="px-4 py-2 text-center font-mono text-gray-700 font-medium border-r border-gray-100">{pos.new_item_number || '–'}</td>
                        <td className="px-4 py-2 text-gray-900 border-r border-gray-100">{pos.position_title}</td>
                        <td className="px-4 py-2 text-center font-mono text-gray-700 font-medium border-r border-gray-100">{pos.salary_grade}</td>
                        <td className="px-3 py-1.5 border-r border-gray-100 min-w-[200px]">
                          <PersonnelCombobox positionId={pos.plantilla_position_id}
                            selectedId={assignment?.personnelId || null}
                            onChange={id => updateAssignment(pos.plantilla_position_id, { personnelId: id, assignmentDate: id ? new Date() : null })} />
                        </td>
                        <td className="px-3 py-1.5 min-w-[160px]">
                          <DatePicker date={assignment?.assignmentDate || null}
                            onChange={date => updateAssignment(pos.plantilla_position_id, { assignmentDate: date })} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50">
                    <td colSpan={6} className="px-4 py-2 text-[11px] text-gray-400">
                      <span className="font-medium text-gray-600">{positionsForActiveDept.length}</span> active position{positionsForActiveDept.length !== 1 ? 's' : ''} ·{' '}
                      <span className="font-medium text-gray-600">{assignments.filter(a => a.personnelId !== null).length}</span> assigned
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sort & Renumber confirmation dialog */}
      <AlertDialog open={showSortDialog} onOpenChange={setShowSortDialog}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Sort &amp; Renumber All Positions?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500 space-y-2">
              <p>This will reassign <strong>new item numbers</strong> across all departments in this order:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600">
                <li><span className="text-emerald-700 font-medium">Active + Assigned</span> — highest salary grade first, per department</li>
                <li><span className="text-amber-700 font-medium">Active + Vacant</span> — highest salary grade first, per department</li>
                <li><span className="text-gray-400 font-medium">Inactive</span> — globally at the end, highest salary grade first</li>
              </ol>
              <p className="text-xs text-gray-400 mt-1">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800 text-white"
                onClick={handleSortAndRenumber} disabled={sorting}>
                {sorting ? 'Sorting…' : 'Sort & Renumber'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              You have unsaved assignment changes. Switching departments will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Stay</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => { if (pendingTab !== null) { setActiveTab(pendingTab); setPendingTab(null) } setShowUnsavedDialog(false) }}>
                Discard &amp; Switch
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PlantillaOfPersonnelPage