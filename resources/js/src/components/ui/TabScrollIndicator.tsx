import React from 'react';
import { useScrollProgress } from '@/src/hooks/useScrollProgress';

export function TabScrollIndicator({ scrollId }: { scrollId: string }) {
  const { progress, scrollable } = useScrollProgress(scrollId);
  if (!scrollable) return null;
  return (
    <div className="h-0.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gray-400 rounded-full transition-all duration-150"
        style={{
          width: `${Math.max(8, progress * 100)}%`,
          marginLeft: `${progress * (100 - Math.max(8, progress * 100))}%`,
        }}
      />
    </div>
  );
}