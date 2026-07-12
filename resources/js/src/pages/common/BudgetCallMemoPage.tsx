import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '@/src/services/api';
import { PdfFlipViewer, BudgetCallMemoFile } from '@/src/components/budget-call-memo/PdfFlipViewer';

const BudgetCallMemoPage: React.FC = () => {
  const [expanded, setExpanded] = useState(false);

  const { data: files = [], isLoading } = useQuery<BudgetCallMemoFile[]>({
    queryKey: ['budget-call-memos-current'],
    queryFn: () => API.get('/budget-call-memos/current').then(r => r.data?.data ?? []),
    staleTime: 5 * 60 * 1000,
  });

  return (
    // h-12 in MainLayout's <header> = 3rem, subtract it so this page exactly
    // fills the rest of the viewport instead of being centered/narrow.
    <div className="p-4 sm:p-6 flex flex-col h-[calc(100dvh-3rem)]">
      <div className="mb-3 sm:mb-4 flex-shrink-0">
        <span className="text-eyebrow">Budget Call</span>
        <h1 className="text-page-title">Budget Call Memorandum</h1>
        <p className="text-subtitle mt-1">Swipe or use the arrows to flip through the memorandum pages.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-16 justify-center">
          <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
          Loading memorandum…
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <PdfFlipViewer files={files} onExpand={() => setExpanded(true)} />
        </div>
      )}

      {expanded && (
        <PdfFlipViewer files={files} expanded onClose={() => setExpanded(false)} />
      )}
    </div>
  );
};

export default BudgetCallMemoPage;
