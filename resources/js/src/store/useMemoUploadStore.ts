import { create } from 'zustand';

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface StagedFile {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  removing?: boolean;
}

export interface RateLimitInfo {
  attempt: number;
  maxRetries: number;
  retryInSeconds: number;
}

// ── Persistent store (survives route navigation) ────────────────────────────
// BudgetCallMemoAdminPage is lazy-loaded and mounted/unmounted by React
// Router as you navigate between pages. Ordinary useState resets every time
// the component unmounts, so staged uploads, the rate-limit banner, and the
// open preview would all vanish when you left and came back. This Zustand
// store lives in module scope, outside React's tree, so a route unmount
// doesn't touch it — coming back to the page picks up exactly where you left off.
//
// Kept intentionally small: only primitives + a small array live here.
// Consumers should subscribe with per-field selectors
// (e.g. useMemoUploadStore(s => s.stagedFiles)) rather than pulling the whole
// store, so a change to one field doesn't re-render parts of the tree that
// only care about another.

interface MemoUploadStore {
  selectedYear: string;
  stagedFiles: StagedFile[];
  uploading: boolean;
  rateLimitInfo: RateLimitInfo | null;
  rateLimitSecondsLeft: number;
  selectedFileId: number | null;
  setSelectedYear: (year: string) => void;
  setUploading: (v: boolean) => void;
  setStagedFiles: (updater: StagedFile[] | ((prev: StagedFile[]) => StagedFile[])) => void;
  setRateLimitInfo: (v: RateLimitInfo | null) => void;
  setRateLimitSecondsLeft: (updater: number | ((prev: number) => number)) => void;
  setSelectedFileId: (id: number | null) => void;
}

export const useMemoUploadStore = create<MemoUploadStore>((set, get) => ({
  selectedYear: '',
  stagedFiles: [],
  uploading: false,
  rateLimitInfo: null,
  rateLimitSecondsLeft: 0,
  selectedFileId: null,
  setSelectedYear: (year) => set({ selectedYear: year }),
  setUploading: (v) => set({ uploading: v }),
  setStagedFiles: (updater) =>
    set({ stagedFiles: typeof updater === 'function' ? updater(get().stagedFiles) : updater }),
  setRateLimitInfo: (v) => set({ rateLimitInfo: v }),
  setRateLimitSecondsLeft: (updater) =>
    set({ rateLimitSecondsLeft: typeof updater === 'function' ? updater(get().rateLimitSecondsLeft) : updater }),
  setSelectedFileId: (id) => set({ selectedFileId: id }),
}));

// Blob object URLs for previewed PDFs — kept outside React state for the same
// reason: a preview doesn't need to be re-fetched after navigating away and
// back. Plain module-level Map, not tied to any component's lifecycle, so it
// doesn't belong inside the Zustand store itself (no reactive UI reads it directly).
export const pdfBlobCache = new Map<number, string>();
