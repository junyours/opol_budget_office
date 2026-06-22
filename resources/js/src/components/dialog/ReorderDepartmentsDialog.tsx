import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import API from "../../services/api";
import { Department, DepartmentCategory } from "../../types/api";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { cn } from "@/src/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  categories: DepartmentCategory[];
  onSaved: () => void;
}

const SortableRow: React.FC<{ dept: Department }> = ({ dept }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: dept.dept_id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2 bg-white border border-gray-200 rounded-lg mb-1.5",
        isDragging && "shadow-lg border-gray-400 z-10"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 shrink-0"
        type="button"
      >
        <Bars3Icon className="w-4 h-4" />
      </button>
      <span className="text-sm font-medium text-gray-800 truncate">{dept.dept_name}</span>
      {dept.dept_abbreviation && (
        <span className="text-[11px] font-mono text-gray-400">{dept.dept_abbreviation}</span>
      )}
    </div>
  );
};

const ReorderDepartmentsDialog: React.FC<Props> = ({
  open, onOpenChange, departments, categories, onSaved,
}) => {
  const [grouped, setGrouped] = useState<Record<number, Department[]>>({});
  const [changed, setChanged] = useState(false);
  const [saving, setSaving]   = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    if (!open) return;
    const map: Record<number, Department[]> = {};
    categories.forEach((c) => { map[c.dept_category_id] = []; });
    [...departments]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .forEach((d) => {
        if (!map[d.dept_category_id]) map[d.dept_category_id] = [];
        map[d.dept_category_id].push(d);
      });
    setGrouped(map);
    setChanged(false);
  }, [open, departments, categories]);

  const handleDragEnd = (catId: number) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setGrouped((prev) => {
      const list = prev[catId] ?? [];
      const oldIndex = list.findIndex((d) => d.dept_id === active.id);
      const newIndex = list.findIndex((d) => d.dept_id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return { ...prev, [catId]: arrayMove(list, oldIndex, newIndex) };
    });
    setChanged(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: { dept_id: number; sort_order: number }[] = [];
      Object.values(grouped).forEach((list) => {
        list.forEach((d, idx) => payload.push({ dept_id: d.dept_id, sort_order: idx }));
      });
      await API.post("/departments/reorder", { departments: payload });
      toast.success("Department order updated.");
      setChanged(false);
      onSaved();
      onOpenChange(false);
    } catch {
      toast.error("Failed to update order.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">
            Reorder Departments
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 mt-0.5">
            Drag rows within a category to set the display order.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {categories.map((cat) => {
            const list = grouped[cat.dept_category_id] ?? [];
            if (list.length === 0) return null;
            return (
              <div key={cat.dept_category_id} className="mb-5 last:mb-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  {cat.dept_category_name}
                </p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd(cat.dept_category_id)}
                >
                  <SortableContext
                    items={list.map((d) => d.dept_id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {list.map((d) => <SortableRow key={d.dept_id} dept={d} />)}
                  </SortableContext>
                </DndContext>
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2 shrink-0">
          <Button
            variant="outline" size="sm" className="h-8 text-xs border-gray-200"
            onClick={() => onOpenChange(false)} disabled={saving}
          >
            Close
          </Button>
          <Button
            size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
            onClick={handleSave} disabled={!changed || saving}
          >
            {saving ? "Saving…" : "Save New Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReorderDepartmentsDialog;
