import { create } from 'zustand';

interface ReviewModeStore {
  reviewMode: boolean;
  setReviewMode: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export const useReviewModeStore = create<ReviewModeStore>((set) => ({
  reviewMode: false,
  setReviewMode: (value) =>
    set((state) => ({
      reviewMode:
        typeof value === 'function'
          ? (value as (prev: boolean) => boolean)(state.reviewMode)
          : value,
    })),
}));
