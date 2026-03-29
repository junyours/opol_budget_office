import React from 'react';
import { cn } from '@/src/lib/utils';

interface DeptDotsProps {
  departments: { dept_id: number }[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export const DeptDots: React.FC<DeptDotsProps> = ({ departments, activeId, onSelect }) => {
  if (departments.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {departments.map((d) => (
        <button
          key={d.dept_id}
          onClick={() => onSelect(d.dept_id)}
          className={cn(
            'rounded-full transition-all duration-300',
            d.dept_id === activeId
              ? 'w-3 h-1.5 bg-zinc-600'
              : 'w-1.5 h-1.5 bg-zinc-200 hover:bg-zinc-400'
          )}
        />
      ))}
    </div>
  );
};