import { create } from 'zustand';

interface LBPFormsListState {
  search: string;
  statusFilter: string;
  categoryFilter: string;
  scrollTop: number;
  setSearch: (v: string) => void;
  setStatusFilter: (v: string) => void;
  setCategoryFilter: (v: string) => void;
  setScrollTop: (v: number) => void;
}

export const useLBPFormsListStore = create<LBPFormsListState>((set) => ({
  search: '',
  statusFilter: 'all',
  categoryFilter: 'all',
  scrollTop: 0,
  setSearch: (v) => set({ search: v }),
  setStatusFilter: (v) => set({ statusFilter: v }),
  setCategoryFilter: (v) => set({ categoryFilter: v }),
  setScrollTop: (v) => set({ scrollTop: v }),
}));
