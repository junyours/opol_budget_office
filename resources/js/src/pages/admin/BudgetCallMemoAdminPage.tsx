// import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
// import { useQuery, useQueryClient } from '@tanstack/react-query';
// import API from '@/src/services/api';
// import { toast } from 'sonner';
// import { Button } from '@/src/components/ui/button';
// import { Progress } from '@/src/components/ui/progress';
// // import {
// //   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
// //   AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
// // } from '@/src/components/ui/alert-dialog';
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from '@/src/components/ui/select';
// import { DndProvider, useDrag, useDrop } from 'react-dnd';
// import { HTML5Backend } from 'react-dnd-html5-backend';
// import {
//   TrashIcon, DocumentTextIcon, CloudArrowUpIcon,
//   Bars3Icon, ChevronDownIcon, ChevronRightIcon, FolderOpenIcon,
//   DocumentMagnifyingGlassIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon,
// } from '@heroicons/react/24/outline';
// import { cn } from '@/src/lib/utils';

// interface BudgetPlan { budget_plan_id: number; year: number; is_active: boolean; }
// interface MemoFile {
//   budget_call_memos_id: number; year: number; title: string | null;
//   original_filename: string; file_path: string; sort_order: number;
//   file_size?: number; created_at?: string;
// }

// const ItemTypes = { ROW: 'memo_row' };

// type UploadStatus = 'pending' | 'uploading' | 'done' | 'error';

// interface StagedFile {
//   id: string;
//   file: File;
//   progress: number;
//   status: UploadStatus;
//   error?: string;
//   removing?: boolean;
// }

// const formatBytes = (bytes?: number) => {
//   if (!bytes) return '—';
//   const kb = bytes / 1024;
//   if (kb < 1024) return `${kb.toFixed(0)} KB`;
//   return `${(kb / 1024).toFixed(1)} MB`;
// };

// const formatDate = (iso?: string) => {
//   if (!iso) return '—';
//   return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// };

// // ── Countdown number — ticks down, pauses while its toast is hovered ────────
// const CountdownRing: React.FC<{ durationMs: number }> = ({ durationMs }) => {
//   const totalSeconds = Math.ceil(durationMs / 1000);
//   const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
//   const spanRef = useRef<HTMLSpanElement>(null);
//   const pausedRef = useRef(false);
//   const elapsedRef = useRef(0);
//   const lastTickRef = useRef(Date.now());

//   useEffect(() => {
//     const toastEl = spanRef.current?.closest('[data-sonner-toast]');
//     const onEnter = () => { pausedRef.current = true; };
//     const onLeave = () => { pausedRef.current = false; lastTickRef.current = Date.now(); };
//     toastEl?.addEventListener('mouseenter', onEnter);
//     toastEl?.addEventListener('mouseleave', onLeave);

//     const interval = setInterval(() => {
//       const now = Date.now();
//       const delta = now - lastTickRef.current;
//       lastTickRef.current = now;
//       if (!pausedRef.current) {
//         elapsedRef.current += delta;
//         setSecondsLeft(Math.max(0, totalSeconds - Math.floor(elapsedRef.current / 1000)));
//       }
//     }, 200);

//     return () => {
//       clearInterval(interval);
//       toastEl?.removeEventListener('mouseenter', onEnter);
//       toastEl?.removeEventListener('mouseleave', onLeave);
//     };
//   }, [totalSeconds]);

//   return (
//     <span ref={spanRef} className="flex-shrink-0 w-5 text-center text-lg font-bold tabular-nums leading-none text-red-700">
//       {secondsLeft}
//     </span>
//   );
// };

// // ── Red toast styling, injected globally ─────────────────────────────────────
// if (typeof document !== 'undefined' && !document.getElementById('delete-toast-shine-style')) {
//   const styleTag = document.createElement('style');
//   styleTag.id = 'delete-toast-shine-style';
//   styleTag.textContent = `
//     .delete-toast-red {
//       background: #fef2f2 !important;
//       border: 1px solid #fecaca !important;
//     }
//     @keyframes stagedFileAbsorb {
//       0%   { transform: scale(1); opacity: 1; max-height: 80px; margin-bottom: 8px; }
//       60%  { transform: scale(0.85); opacity: 0.4; }
//       100% { transform: scale(0.4); opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
//     }
//     .staged-file-absorb {
//       animation: stagedFileAbsorb 420ms ease-in forwards;
//       transform-origin: center;
//       overflow: hidden;
//     }
//   `;
//   document.head.appendChild(styleTag);
// }



// // ── Draggable row ─────────────────────────────────────────────────────────────

// interface RowProps {
//   file: MemoFile;
//   index: number;
//   moveRow: (from: number, to: number) => void;
//   onDropped: () => void;
//   onDelete: (file: MemoFile) => void;
//   onSelect: (file: MemoFile) => void;
//   isSelected: boolean;
// }

// const DraggableRow: React.FC<RowProps> = ({ file, index, moveRow, onDropped, onDelete, onSelect, isSelected }) => {
//   const ref = useRef<HTMLDivElement>(null);

//   const [, drop] = useDrop({
//     accept: ItemTypes.ROW,
//     hover(item: { index: number }) {
//       if (!ref.current || item.index === index) return;
//       moveRow(item.index, index);
//       item.index = index;
//     },
//     drop: () => onDropped(),
//   });

//   const [{ isDragging }, drag] = useDrag({
//     type: ItemTypes.ROW,
//     item: { index },
//     collect: (monitor) => ({ isDragging: monitor.isDragging() }),
//   });

//   drag(drop(ref));

//   return (
//     <div
//       ref={ref}
//       onClick={() => onSelect(file)}
//       className={cn(
//         'group grid grid-cols-[20px_32px_minmax(0,1fr)_36px] items-center gap-2.5 px-3 py-2.5 bg-white border-b border-gray-100 last:border-0 transition-colors cursor-pointer',
//         isDragging && 'opacity-30',
//         isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-gray-50/60'
//       )}
//     >
//       <Bars3Icon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />

//       <div className={cn(
//         'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
//         isSelected ? 'bg-indigo-100' : 'bg-rose-50'
//       )}>
//         <DocumentTextIcon className={cn('w-3.5 h-3.5', isSelected ? 'text-indigo-600' : 'text-rose-500')} />
//       </div>

//       <div className="min-w-0">
//         <p className={cn('text-[12.5px] font-medium truncate', isSelected ? 'text-indigo-900' : 'text-gray-800')}>
//           {file.title || file.original_filename}
//         </p>
//         <p className="text-[10.5px] text-gray-400 truncate">
//           {file.original_filename}
//           {file.file_size ? ` · ${formatBytes(file.file_size)}` : ''}
//         </p>
//       </div>

//       <Button
//         variant="ghost" size="sm"
//         onClick={(e) => { e.stopPropagation(); onDelete(file); }}
//         className="h-7 w-7 p-0 text-gray-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
//       >
//         <TrashIcon className="w-3.5 h-3.5" />
//       </Button>
//     </div>
//   );
// };

// // ── Year group (its own local ordered list + drop zone) ────────────────────────

// interface YearGroupProps {
//   year: number;
//   files: MemoFile[];
//   isActiveYear: boolean;
//   onReordered: () => void;
//   onDelete: (file: MemoFile) => void;
//   onSelect: (file: MemoFile) => void;
//   selectedId: number | null;
//   defaultOpen: boolean;
// }

// const YearGroup: React.FC<YearGroupProps> = ({ year, files, isActiveYear, onReordered, onDelete, onSelect, selectedId, defaultOpen }) => {
//   const [open, setOpen] = useState(defaultOpen);
//   const [localOrder, setLocalOrder] = useState<MemoFile[]>(files);

//   useEffect(() => { setLocalOrder(files); }, [files]);

//   const moveRow = useCallback((from: number, to: number) => {
//     setLocalOrder(prev => {
//       const copy = [...prev];
//       const [moved] = copy.splice(from, 1);
//       copy.splice(to, 0, moved);
//       return copy;
//     });
//   }, []);

//   const persistOrder = async () => {
//     const original = files.map(f => f.budget_call_memos_id);
//     const next = localOrder.map(f => f.budget_call_memos_id);
//     if (JSON.stringify(original) === JSON.stringify(next)) return;
//     try {
//       await API.post('/budget-call-memos/reorder', { ordered_ids: next });
//       onReordered();
//     } catch {
//       toast.error('Failed to save new order.');
//       setLocalOrder(files);
//     }
//   };

//   return (
//     <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-3 shadow-sm">
//       <button
//         onClick={() => setOpen(o => !o)}
//         className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50/70 hover:bg-gray-50 transition-colors border-b border-gray-100"
//       >
//         <div className="flex items-center gap-2.5">
//           {open ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />}
//           <FolderOpenIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
//           <span className="text-[13px] font-semibold text-gray-800">FY {year}</span>
//           {isActiveYear && (
//             <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
//               Active
//             </span>
//           )}
//         </div>
//         <span className="text-[10.5px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
//           {files.length} file{files.length !== 1 ? 's' : ''}
//         </span>
//       </button>

//       {open && (
//         <div className={files.length > 10 ? 'max-h-[420px] overflow-y-auto' : ''}>
//           {localOrder.map((f, i) => (
//             <DraggableRow
//               key={f.budget_call_memos_id}
//               file={f}
//               index={i}
//               moveRow={moveRow}
//               onDropped={persistOrder}
//               onDelete={onDelete}
//               onSelect={onSelect}
//               isSelected={selectedId === f.budget_call_memos_id}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// // ── PDF preview panel ───────────────────────────────────────────────────────

// interface PreviewPanelProps {
//   file: MemoFile | null;
//   url: string | null;
//   loading: boolean;
//   error: boolean;
// }

// const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, url, loading, error }) => {
//   if (!file) {
//     return (
//       <div className="h-[calc(100vh-180px)] rounded-xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center text-center p-8">
//         <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mb-3">
//           <DocumentMagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
//         </div>
//         <p className="text-[12.5px] font-medium text-gray-600">No file selected</p>
//         <p className="text-[11px] text-gray-400 mt-1">Click a file on the left to preview it here.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="h-[calc(100vh-180px)] rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col shadow-sm">
//       <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
//         <div className="min-w-0">
//           <p className="text-[12.5px] font-medium text-gray-800 truncate">{file.title || file.original_filename}</p>
//           <p className="text-[10.5px] text-gray-400 truncate">FY {file.year} · {formatDate(file.created_at)}</p>
//         </div>
//       </div>

//       <div className="flex-1 bg-gray-100 relative">
//         {loading && (
//           <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11.5px] text-gray-400">
//             <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
//             Loading preview…
//           </div>
//         )}
//         {!loading && error && (
//           <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
//             <p className="text-[12px] font-medium text-gray-600">Couldn't load this file</p>
//             <p className="text-[11px] text-gray-400 mt-1">Try opening it in a new tab instead.</p>
//           </div>
//         )}
//         {!loading && !error && url && (
//           <iframe
//             title={file.original_filename}
//             src={`${url}#toolbar=0&navpanes=0&statusbar=0`}
//             className="absolute inset-0 w-full h-full border-0"
//           />
//         )}
//       </div>
//     </div>
//   );
// };

// // ── Main page ────────────────────────────────────────────────────────────────

// const BudgetCallMemoAdminPage: React.FC = () => {
//   const qc = useQueryClient();
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const [selectedYear, setSelectedYear] = useState<string>('');
//   const [uploading, setUploading] = useState(false);
//   const [dragOver, setDragOver] = useState(false);
//   const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
//   const [rateLimitInfo, setRateLimitInfo] = useState<{
//     attempt: number; maxRetries: number; retryInSeconds: number;
//   } | null>(null);
//   const [rateLimitSecondsLeft, setRateLimitSecondsLeft] = useState(0);

//   // ── preview state ──
//   const [selectedFile, setSelectedFile] = useState<MemoFile | null>(null);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [previewError, setPreviewError] = useState(false);
//   const pdfCacheRef = useRef<Map<number, string>>(new Map()); // id -> blob object URL, so we only ever fetch a file once
//   const [, forceRerender] = useState(0);

//   useEffect(() => {
//     const onRateLimited = (e: Event) => {
//       const detail = (e as CustomEvent).detail;
//       setRateLimitInfo(detail);
//       setRateLimitSecondsLeft(Math.ceil(detail.retryInSeconds));
//     };
//     const onCleared = () => setRateLimitInfo(null);

//     window.addEventListener('api:rate-limited', onRateLimited);
//     window.addEventListener('api:rate-limit-cleared', onCleared);
//     return () => {
//       window.removeEventListener('api:rate-limited', onRateLimited);
//       window.removeEventListener('api:rate-limit-cleared', onCleared);
//     };
//   }, []);

//   // tick the countdown down once a second while a rate-limit wait is active
//   useEffect(() => {
//     if (!rateLimitInfo) return;
//     const interval = setInterval(() => {
//       setRateLimitSecondsLeft(s => Math.max(0, s - 1));
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [rateLimitInfo]);

//   useEffect(() => {
//     // revoke cached blob URLs on unmount to avoid leaking memory
//     const cache = pdfCacheRef.current;
//     return () => { cache.forEach(url => URL.revokeObjectURL(url)); };
//   }, []);

//   const handleSelectFile = async (file: MemoFile) => {
//     setSelectedFile(file);
//     setPreviewError(false);

//     if (pdfCacheRef.current.has(file.budget_call_memos_id)) {
//       // already fetched this file before — reuse it, no network call
//       return;
//     }

//     setPreviewLoading(true);
//     try {
//       const res = await API.get(`/budget-call-memos/${file.budget_call_memos_id}/download`, {
//         responseType: 'blob',
//       });
//       const blobUrl = URL.createObjectURL(res.data);
//       pdfCacheRef.current.set(file.budget_call_memos_id, blobUrl);
//       forceRerender(n => n + 1);
//     } catch {
//       setPreviewError(true);
//       toast.error('Failed to load file preview.');
//     } finally {
//       setPreviewLoading(false);
//     }
//   };

//   const { data: budgetPlans = [] } = useQuery<BudgetPlan[]>({
//     queryKey: ['budget-plans-all-for-memo'],
//     queryFn: () => API.get('/budget-plans').then(r => r.data?.data ?? []),
//   });

//   const { data: files = [], isLoading } = useQuery<MemoFile[]>({
//     queryKey: ['budget-call-memos-all'],
//     queryFn: () => API.get('/budget-call-memos').then(r => r.data?.data ?? []),
//   });

//   useEffect(() => {
//     if (!selectedYear && budgetPlans.length > 0) {
//       const active = budgetPlans.find(p => p.is_active) ?? budgetPlans[0];
//       setSelectedYear(String(active.year));
//     }
//   }, [budgetPlans, selectedYear]);

//   const activeYear = useMemo(
//     () => budgetPlans.find(p => p.is_active)?.year,
//     [budgetPlans]
//   );

//   const groupedByYear = useMemo(() => {
//     const map = new Map<number, MemoFile[]>();
//     files.forEach(f => {
//       if (!map.has(f.year)) map.set(f.year, []);
//       map.get(f.year)!.push(f);
//     });
//     return Array.from(map.entries())
//       .sort((a, b) => b[0] - a[0])
//       .map(([year, list]) => ({ year, list: list.sort((a, b) => a.sort_order - b.sort_order) }));
//   }, [files]);

//   const totalSize = useMemo(
//     () => files.reduce((sum, f) => sum + (f.file_size ?? 0), 0),
//     [files]
//   );

//   const refresh = () => {
//     qc.invalidateQueries({ queryKey: ['budget-call-memos-all'] });
//     qc.invalidateQueries({ queryKey: ['budget-call-memos-current'] });
//   };

//   const stageFiles = (fileList: FileList | null) => {
//     if (!fileList || fileList.length === 0) return;
//     const pdfsOnly = Array.from(fileList).filter(f => f.type === 'application/pdf');
//     if (pdfsOnly.length < fileList.length) {
//       toast.warning('Only PDF files are allowed — non-PDF files were ignored.');
//     }
//     if (pdfsOnly.length === 0) return;

//     const newlyStaged: StagedFile[] = pdfsOnly.map(file => ({
//       id: `${file.name}-${file.size}-${file.lastModified}`,
//       file,
//       progress: 0,
//       status: 'pending',
//     }));

//     setStagedFiles(prev => {
//       const existingIds = new Set(prev.map(f => f.id));
//       const deduped = newlyStaged.filter(f => !existingIds.has(f.id));
//       return [...prev, ...deduped];
//     });
//   };

//   const removeStagedFile = (id: string) => {
//     setStagedFiles(prev => prev.filter(f => f.id !== id));
//   };

//   const clearStagedFiles = () => setStagedFiles([]);

//   const confirmUpload = async () => {
//     const toUpload = stagedFiles.filter(f => f.status !== 'done');
//     if (toUpload.length === 0) return;
//     if (!selectedYear) {
//       toast.warning('Select a budget year first.');
//       return;
//     }

//     setUploading(true);
//     setStagedFiles(prev => prev.map(f => f.status !== 'done' ? { ...f, status: 'uploading', progress: 0 } : f));

//     const uploadOne = (staged: StagedFile): Promise<'ok' | 'error'> => {
//       const form = new FormData();
//       form.append('year', selectedYear);
//       form.append('files[]', staged.file);

//       return API.post('/budget-call-memos', form, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//         onUploadProgress: (evt: any) => {
//           const total = evt.total ?? staged.file.size;
//           const pct = total ? Math.round((evt.loaded * 100) / total) : 0;
//           setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, progress: pct } : f));
//         },
//       })
//         .then(() => {
//           setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, progress: 100, status: 'done' } : f));
//           // let the 100% state flash briefly, then absorb-shrink this one file out — independent of the rest of the batch
//           setTimeout(() => {
//             setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, removing: true } : f));
//             setTimeout(() => {
//               setStagedFiles(prev => prev.filter(f => f.id !== staged.id));
//             }, 420);
//           }, 350);
//           return 'ok' as const;
//         })
//         .catch((err: any) => {
//           setStagedFiles(prev => prev.map(f => f.id === staged.id
//             ? { ...f, status: 'error', error: err?.response?.data?.message ?? 'Upload failed.' }
//             : f));
//           return 'error' as const;
//         });
//     };

//     const results = await Promise.all(toUpload.map(uploadOne));
//     const succeededCount = results.filter(r => r === 'ok').length;
//     const failedCount = results.length - succeededCount;

//     setUploading(false);
//     refresh();

//     if (succeededCount > 0) {
//       toast.success(`Uploaded ${succeededCount} file${succeededCount > 1 ? 's' : ''} to FY ${selectedYear}.`);
//     }
//     if (failedCount > 0) {
//       toast.error(`${failedCount} file${failedCount > 1 ? 's' : ''} failed to upload.`);
//     }

//     if (fileInputRef.current) fileInputRef.current.value = '';
//   };

//   const undoneDeletesRef = useRef<Set<number>>(new Set());

//   const restoreFileToCache = (file: MemoFile) => {
//     qc.setQueryData<MemoFile[]>(['budget-call-memos-all'], (old) => {
//       const list = old ?? [];
//       return list.some(f => f.budget_call_memos_id === file.budget_call_memos_id) ? list : [...list, file];
//     });
//   };

//   const requestDelete = (file: MemoFile) => {
//     const id = file.budget_call_memos_id;

//     // optimistic removal — gone from the list immediately
//     qc.setQueryData<MemoFile[]>(['budget-call-memos-all'], (old) => (old ?? []).filter(f => f.budget_call_memos_id !== id));

//     if (selectedFile?.budget_call_memos_id === id) {
//       const cached = pdfCacheRef.current.get(id);
//       if (cached) { URL.revokeObjectURL(cached); pdfCacheRef.current.delete(id); }
//       setSelectedFile(null);
//     }

//     undoneDeletesRef.current.delete(id);

//     toast(`"${file.title || file.original_filename}" deleted`, {
//       description: `FY ${file.year} · Cannot be undone`,
//       duration: 8000,
//       icon: <CountdownRing durationMs={8000} />,
//       className: 'delete-toast-red',
//       classNames: {
//         title: '!text-red-900',
//         description: '!text-red-500',
//         actionButton: '!bg-red-600 hover:!bg-red-700 !text-white',
//       },
//       action: {
//         label: 'Undo',
//         onClick: () => {
//           undoneDeletesRef.current.add(id);
//           restoreFileToCache(file);
//         },
//       },
//       // fires only when Sonner's own timer completes — which Sonner already
//       // pauses automatically while the toast is hovered
//       onAutoClose: async () => {
//         if (undoneDeletesRef.current.has(id)) return;
//         try {
//           await API.delete(`/budget-call-memos/${id}`);
//           // Don't invalidate/refetch the main list here — it's already
//           // correct optimistically. Refetching now would pull the server's
//           // list, which may still include other staged-for-delete files
//           // whose timers haven't fired yet, and overwrite the optimistic
//           // cache — making already-deleted rows reappear.
//           qc.invalidateQueries({ queryKey: ['budget-call-memos-current'] });
//         } catch {
//           toast.error('Failed to delete file — restoring it.');
//           restoreFileToCache(file);
//         }
//       },
//     });

//     };

//   const onDrop = (e: React.DragEvent) => {
//     e.preventDefault();
//     setDragOver(false);
//     stageFiles(e.dataTransfer.files);
//   };

//   const activePreviewUrl = selectedFile ? pdfCacheRef.current.get(selectedFile.budget_call_memos_id) ?? null : null;

//   return (
//     <div className="w-full max-w-none">
//       <p className="text-[13px] text-gray-500 mb-6 max-w-2xl">
//         Upload the PDF file(s) for a Budget Call Memorandum. Visible to all users on the "Budget Call Memo" page.
//       </p>



//       <div className="grid grid-cols-1 xl:grid-cols-[300px_360px_minmax(0,1fr)] gap-6 items-start">

//         {/* ── Upload panel ── */}
//         <div className="xl:sticky xl:top-6">
//           <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Upload</p>
//           <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
//             <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Budget Year</label>
//             <Select value={selectedYear} onValueChange={setSelectedYear}>
//               <SelectTrigger className="h-9 text-sm w-full mb-4">
//                 <SelectValue placeholder="Select a budget year" />
//               </SelectTrigger>
//               <SelectContent>
//                 {budgetPlans.map(p => (
//                   <SelectItem key={p.budget_plan_id} value={String(p.year)}>
//                     FY {p.year} {p.is_active && <span className="text-emerald-600 ml-1">· Active</span>}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>

//             <div
//               onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
//               onDragLeave={() => setDragOver(false)}
//               onDrop={uploading ? undefined : onDrop}
//               onClick={() => !uploading && fileInputRef.current?.click()}
//               className={cn(
//                 'rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors',
//                 uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
//                 dragOver ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
//               )}
//             >
//               <div className={cn(
//                 'w-9 h-9 rounded-full flex items-center justify-center mb-2.5 transition-colors',
//                 dragOver ? 'bg-indigo-100' : 'bg-blue-50'
//               )}>
//                 <CloudArrowUpIcon className={cn('w-4.5 h-4.5 transition-colors', dragOver ? 'text-indigo-500' : 'text-blue-500')} />
//               </div>
//               <p className="text-[12px] font-medium text-gray-700">
//                 Click to browse, or drag PDF files here
//               </p>
//               <p className="text-[10.5px] text-gray-400 mt-1">PDF only · up to 20MB · multiple allowed</p>
//               <input
//                 ref={fileInputRef}
//                 type="file"
//                 accept="application/pdf"
//                 multiple
//                 onChange={(e) => stageFiles(e.target.files)}
//                 disabled={uploading}
//                 className="hidden"
//               />
//             </div>

//             {stagedFiles.length > 0 && (
//               <div className="mt-3">
//                 {rateLimitInfo && (
//                   <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
//                     <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />
//                     <p className="text-[11.5px] text-amber-800 leading-snug">
//                       Server is rate limiting uploads — retrying in {rateLimitSecondsLeft}s
//                       {' '}(attempt {rateLimitInfo.attempt}/{rateLimitInfo.maxRetries}).
//                       The file below will resume automatically.
//                     </p>
//                   </div>
//                 )}
//                 <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1">
//                 {stagedFiles.map(sf => (
//                   <div
//                     key={sf.id}
//                     className={cn(
//                       'rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5',
//                       sf.removing && 'staged-file-absorb'
//                     )}
//                   >
//                     <div className="flex items-center gap-2.5">
//                       <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center flex-shrink-0">
//                         <DocumentTextIcon className="w-3.5 h-3.5 text-rose-500" />
//                       </div>
//                       <div className="min-w-0 flex-1">
//                         <p className="text-[12px] font-medium text-gray-800 truncate">{sf.file.name}</p>
//                         <p className="text-[10.5px] text-gray-400">{formatBytes(sf.file.size)}</p>
//                       </div>
//                       {sf.status === 'done' ? (
//                         <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
//                       ) : sf.status === 'error' ? (
//                         <ExclamationCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
//                       ) : sf.status === 'pending' ? (
//                         <Button
//                           variant="ghost" size="sm"
//                           onClick={() => removeStagedFile(sf.id)}
//                           className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
//                         >
//                           <XMarkIcon className="w-3.5 h-3.5" />
//                         </Button>
//                       ) : null}
//                     </div>

//                     {(sf.status === 'uploading' || sf.status === 'done') && (
//                       <div className="flex items-center gap-2 mt-2">
//                         <Progress value={sf.progress} className="h-1.5 flex-1" />
//                         <span className="text-[10px] text-gray-400 w-8 text-right">{sf.progress}%</span>
//                       </div>
//                     )}
//                     {sf.status === 'error' && (
//                       <p className="text-[10.5px] text-red-500 mt-1.5">{sf.error}</p>
//                     )}
//                   </div>
//                 ))}
//                 </div>

//                 <div className="flex items-center gap-2 pt-2">
//                   <Button
//                     size="sm"
//                     onClick={confirmUpload}
//                     disabled={uploading || stagedFiles.every(f => f.status === 'done')}
//                     className="h-8 text-[12px] flex-1"
//                   >
//                     {uploading
//                       ? 'Uploading…'
//                       : `Upload ${stagedFiles.filter(f => f.status !== 'done').length} file${stagedFiles.filter(f => f.status !== 'done').length !== 1 ? 's' : ''} to FY ${selectedYear || '—'}`}
//                   </Button>
//                   <Button
//                     variant="ghost" size="sm"
//                     onClick={clearStagedFiles}
//                     disabled={uploading}
//                     className="h-8 text-[12px] text-gray-500"
//                   >
//                     Cancel
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* ── Summary card ── */}
//           <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4">
//             <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Summary</p>
//             <div className="flex items-center justify-between py-1.5">
//               <span className="text-[12px] text-gray-500">Budget years on file</span>
//               <span className="text-[13px] font-semibold text-gray-800">{groupedByYear.length}</span>
//             </div>
//             <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
//               <span className="text-[12px] text-gray-500">Total files</span>
//               <span className="text-[13px] font-semibold text-gray-800">{files.length}</span>
//             </div>
//             <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
//               <span className="text-[12px] text-gray-500">Total size</span>
//               <span className="text-[13px] font-semibold text-gray-800">{formatBytes(totalSize)}</span>
//             </div>
//           </div>
//         </div>

//         {/* ── File list, grouped by year, drag to reorder within each year ── */}
//         <div className="min-w-0">
//           <div className="flex items-baseline justify-between mb-2">
//             <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Uploaded Files</p>
//           </div>
//           <p className="text-[10.5px] text-gray-400 mb-2">Click a file to preview · drag rows to reorder within a year</p>

//           <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1 -mr-1">
//             {isLoading ? (
//               <div className="rounded-xl border border-gray-200 bg-white p-4 text-[12px] text-gray-400 flex items-center gap-2">
//                 <span className="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
//                 Loading…
//               </div>
//             ) : groupedByYear.length === 0 ? (
//               <div className="p-10 text-center border border-dashed border-gray-200 rounded-xl bg-white">
//                 <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
//                   <FolderOpenIcon className="w-5 h-5 text-gray-400" />
//                 </div>
//                 <p className="text-[12.5px] font-medium text-gray-600">No files uploaded yet</p>
//                 <p className="text-[11px] text-gray-400 mt-1">Files you upload will appear here, grouped by budget year.</p>
//               </div>
//             ) : (
//               <>
//                 <style>{`
//                   @keyframes memoFadeInUp {
//                     from { opacity: 0; transform: translateY(8px); }
//                     to   { opacity: 1; transform: translateY(0); }
//                   }
//                 `}</style>
//                 <DndProvider backend={HTML5Backend}>
//                   {groupedByYear.map((g, i) => (
//                     <div
//                       key={g.year}
//                       className="animate-[memoFadeInUp_0.35s_ease-out_both]"
//                       style={{ animationDelay: `${i * 70}ms` }}
//                     >
//                       <YearGroup
//                         year={g.year}
//                         files={g.list}
//                         isActiveYear={g.year === activeYear}
//                         onReordered={refresh}
//                         onDelete={requestDelete}
//                         onSelect={handleSelectFile}
//                         selectedId={selectedFile?.budget_call_memos_id ?? null}
//                         defaultOpen={i === 0}
//                       />
//                     </div>
//                   ))}
//                 </DndProvider>
//               </>
//             )}
//           </div>
//         </div>

//         {/* ── PDF preview ── */}
//         <div className="min-w-0">
//           <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Preview</p>
//           <PreviewPanel file={selectedFile} url={activePreviewUrl} loading={previewLoading} error={previewError} />
//         </div>
//       </div>

//       </div>
//   );
// };

// export default BudgetCallMemoAdminPage;


import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemoUploadStore, pdfBlobCache, type StagedFile, type RateLimitInfo } from '@/src/store/useMemoUploadStore';
import API from '@/src/services/api';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Progress } from '@/src/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/src/components/ui/select';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  TrashIcon, DocumentTextIcon, CloudArrowUpIcon,
  Bars3Icon, ChevronDownIcon, ChevronRightIcon, FolderOpenIcon,
  DocumentMagnifyingGlassIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';

interface BudgetPlan { budget_plan_id: number; year: number; is_active: boolean; }
interface MemoFile {
  budget_call_memos_id: number; year: number; title: string | null;
  original_filename: string; file_path: string; sort_order: number;
  file_size?: number; created_at?: string;
}

const ItemTypes = { ROW: 'memo_row' };



const formatBytes = (bytes?: number) => {
  if (!bytes) return '—';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};



// ── Countdown number — ticks down, pauses while its toast is hovered ────────
const CountdownRing: React.FC<{ durationMs: number }> = ({ durationMs }) => {
  const totalSeconds = Math.ceil(durationMs / 1000);
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const spanRef = useRef<HTMLSpanElement>(null);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  useEffect(() => {
    const toastEl = spanRef.current?.closest('[data-sonner-toast]');
    const onEnter = () => { pausedRef.current = true; };
    const onLeave = () => { pausedRef.current = false; lastTickRef.current = Date.now(); };
    toastEl?.addEventListener('mouseenter', onEnter);
    toastEl?.addEventListener('mouseleave', onLeave);

    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (!pausedRef.current) {
        elapsedRef.current += delta;
        setSecondsLeft(Math.max(0, totalSeconds - Math.floor(elapsedRef.current / 1000)));
      }
    }, 200);

    return () => {
      clearInterval(interval);
      toastEl?.removeEventListener('mouseenter', onEnter);
      toastEl?.removeEventListener('mouseleave', onLeave);
    };
  }, [totalSeconds]);

  return (
    <span ref={spanRef} className="flex-shrink-0 w-5 text-center text-lg font-bold tabular-nums leading-none text-red-700">
      {secondsLeft}
    </span>
  );
};

// ── Red toast styling, injected globally ─────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('delete-toast-shine-style')) {
  const styleTag = document.createElement('style');
  styleTag.id = 'delete-toast-shine-style';
  styleTag.textContent = `
    .delete-toast-red {
      background: #fef2f2 !important;
      border: 1px solid #fecaca !important;
    }
    @keyframes stagedFileAbsorb {
      0%   { transform: scale(1); opacity: 1; max-height: 80px; margin-bottom: 8px; }
      60%  { transform: scale(0.85); opacity: 0.4; }
      100% { transform: scale(0.4); opacity: 0; max-height: 0; margin-bottom: 0; padding-top: 0; padding-bottom: 0; }
    }
    .staged-file-absorb {
      animation: stagedFileAbsorb 420ms ease-in forwards;
      transform-origin: center;
      overflow: hidden;
    }
  `;
  document.head.appendChild(styleTag);
}

// ── Draggable row ─────────────────────────────────────────────────────────────

interface RowProps {
  file: MemoFile;
  index: number;
  moveRow: (from: number, to: number) => void;
  onDropped: () => void;
  onDelete: (file: MemoFile) => void;
  onSelect: (file: MemoFile) => void;
  isSelected: boolean;
}

const DraggableRow: React.FC<RowProps> = ({ file, index, moveRow, onDropped, onDelete, onSelect, isSelected }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.ROW,
    hover(item: { index: number }) {
      if (!ref.current || item.index === index) return;
      moveRow(item.index, index);
      item.index = index;
    },
    drop: () => onDropped(),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ROW,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onClick={() => onSelect(file)}
      className={cn(
        'group grid grid-cols-[20px_32px_minmax(0,1fr)_36px] items-center gap-2.5 px-3 py-2.5 bg-white border-b border-gray-100 last:border-0 transition-colors cursor-pointer',
        isDragging && 'opacity-30',
        isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-gray-50/60'
      )}
    >
      <Bars3Icon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />

      <div className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
        isSelected ? 'bg-indigo-100' : 'bg-rose-50'
      )}>
        <DocumentTextIcon className={cn('w-3.5 h-3.5', isSelected ? 'text-indigo-600' : 'text-rose-500')} />
      </div>

      <div className="min-w-0">
        <p className={cn('text-[12.5px] font-medium truncate', isSelected ? 'text-indigo-900' : 'text-gray-800')}>
          {file.title || file.original_filename}
        </p>
        <p className="text-[10.5px] text-gray-400 truncate">
          {file.original_filename}
          {file.file_size ? ` · ${formatBytes(file.file_size)}` : ''}
        </p>
      </div>

      <Button
        variant="ghost" size="sm"
        onClick={(e) => { e.stopPropagation(); onDelete(file); }}
        className="h-7 w-7 p-0 text-gray-300 hover:text-red-600 hover:bg-red-50 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <TrashIcon className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
};

// ── Year group (its own local ordered list + drop zone) ────────────────────────

interface YearGroupProps {
  year: number;
  files: MemoFile[];
  isActiveYear: boolean;
  onReordered: () => void;
  onDelete: (file: MemoFile) => void;
  onSelect: (file: MemoFile) => void;
  selectedId: number | null;
  defaultOpen: boolean;
}

const YearGroup: React.FC<YearGroupProps> = ({ year, files, isActiveYear, onReordered, onDelete, onSelect, selectedId, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [localOrder, setLocalOrder] = useState<MemoFile[]>(files);

  useEffect(() => { setLocalOrder(files); }, [files]);

  const moveRow = useCallback((from: number, to: number) => {
    setLocalOrder(prev => {
      const copy = [...prev];
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }, []);

  const persistOrder = async () => {
    const original = files.map(f => f.budget_call_memos_id);
    const next = localOrder.map(f => f.budget_call_memos_id);
    if (JSON.stringify(original) === JSON.stringify(next)) return;
    try {
      await API.post('/budget-call-memos/reorder', { ordered_ids: next });
      onReordered();
    } catch {
      toast.error('Failed to save new order.');
      setLocalOrder(files);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden mb-3 shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3.5 py-3 bg-gray-50/70 hover:bg-gray-50 transition-colors border-b border-gray-100"
      >
        <div className="flex items-center gap-2.5">
          {open ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-400" />}
          <FolderOpenIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-gray-800">FY {year}</span>
          {isActiveYear && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
              Active
            </span>
          )}
        </div>
        <span className="text-[10.5px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
          {files.length} file{files.length !== 1 ? 's' : ''}
        </span>
      </button>

      {open && (
        <div className={files.length > 10 ? 'max-h-[420px] overflow-y-auto' : ''}>
          {localOrder.map((f, i) => (
            <DraggableRow
              key={f.budget_call_memos_id}
              file={f}
              index={i}
              moveRow={moveRow}
              onDropped={persistOrder}
              onDelete={onDelete}
              onSelect={onSelect}
              isSelected={selectedId === f.budget_call_memos_id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── PDF preview panel ───────────────────────────────────────────────────────

interface PreviewPanelProps {
  file: MemoFile | null;
  url: string | null;
  loading: boolean;
  error: boolean;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, url, loading, error }) => {
  if (!file) {
    return (
      <div className="h-[calc(100vh-180px)] rounded-xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <DocumentMagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
        </div>
        <p className="text-[12.5px] font-medium text-gray-600">No file selected</p>
        <p className="text-[11px] text-gray-400 mt-1">Click a file on the left to preview it here.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-180px)] rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col shadow-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50/70">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-gray-800 truncate">{file.title || file.original_filename}</p>
          <p className="text-[10.5px] text-gray-400 truncate">FY {file.year} · {formatDate(file.created_at)}</p>
        </div>
      </div>

      <div className="flex-1 bg-gray-100 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-[11.5px] text-gray-400">
            <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
            Loading preview…
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <p className="text-[12px] font-medium text-gray-600">Couldn't load this file</p>
            <p className="text-[11px] text-gray-400 mt-1">Try opening it in a new tab instead.</p>
          </div>
        )}
        {!loading && !error && url && (
          <iframe
            title={file.original_filename}
            src={`${url}#toolbar=0&navpanes=0&statusbar=0`}
            className="absolute inset-0 w-full h-full border-0"
          />
        )}
      </div>
    </div>
  );
};

// ── Rate-limit banner (own component so its 1s tick only re-renders itself) ──

const RateLimitBanner: React.FC = () => {
  const rateLimitInfo = useMemoUploadStore(s => s.rateLimitInfo);
  const rateLimitSecondsLeft = useMemoUploadStore(s => s.rateLimitSecondsLeft);
  const setRateLimitSecondsLeft = useMemoUploadStore(s => s.setRateLimitSecondsLeft);

  useEffect(() => {
    if (!rateLimitInfo) return;
    const interval = setInterval(() => {
      setRateLimitSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitInfo, setRateLimitSecondsLeft]);

  if (!rateLimitInfo) return null;

  return (
    <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
      <span className="w-3 h-3 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin flex-shrink-0" />
      <p className="text-[11.5px] text-amber-800 leading-snug">
        Server is rate limiting uploads — retrying in {rateLimitSecondsLeft}s
        {' '}(attempt {rateLimitInfo.attempt}/{rateLimitInfo.maxRetries}).
        The file below will resume automatically.
      </p>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────

const BudgetCallMemoAdminPage: React.FC = () => {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [, forceRerender] = useState(0);

  // ── state that must survive leaving/returning to this route ──
  const selectedYear = useMemoUploadStore(s => s.selectedYear);
  const setSelectedYear = useMemoUploadStore(s => s.setSelectedYear);
  const uploading = useMemoUploadStore(s => s.uploading);
  const setUploading = useMemoUploadStore(s => s.setUploading);
  const stagedFiles = useMemoUploadStore(s => s.stagedFiles);
  const setStagedFiles = useMemoUploadStore(s => s.setStagedFiles);
  const setRateLimitInfo = useMemoUploadStore(s => s.setRateLimitInfo);
  const setRateLimitSecondsLeft = useMemoUploadStore(s => s.setRateLimitSecondsLeft);
  const selectedFileId = useMemoUploadStore(s => s.selectedFileId);
  const setSelectedFileId = useMemoUploadStore(s => s.setSelectedFileId);

  const pdfCacheRef = useRef<Map<number, string>>(pdfBlobCache); // module-level cache — survives navigation

  // listen for 429 retry events dispatched from api.ts
  useEffect(() => {
    const onRateLimited = (e: Event) => {
      const detail = (e as CustomEvent).detail as RateLimitInfo;
      setRateLimitInfo(detail);
      setRateLimitSecondsLeft(Math.ceil(detail.retryInSeconds));
    };
    const onCleared = () => setRateLimitInfo(null);

    window.addEventListener('api:rate-limited', onRateLimited);
    window.addEventListener('api:rate-limit-cleared', onCleared);
    return () => {
      window.removeEventListener('api:rate-limited', onRateLimited);
      window.removeEventListener('api:rate-limit-cleared', onCleared);
    };
  }, [setRateLimitInfo, setRateLimitSecondsLeft]);

  const handleSelectFile = async (file: MemoFile) => {
    setSelectedFileId(file.budget_call_memos_id);
    setPreviewError(false);

    if (pdfCacheRef.current.has(file.budget_call_memos_id)) {
      // already fetched this file before — reuse it, no network call
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await API.get(`/budget-call-memos/${file.budget_call_memos_id}/download`, {
        responseType: 'blob',
      });
      const blobUrl = URL.createObjectURL(res.data);
      pdfCacheRef.current.set(file.budget_call_memos_id, blobUrl);
      forceRerender(n => n + 1);
    } catch {
      setPreviewError(true);
      toast.error('Failed to load file preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const { data: budgetPlans = [] } = useQuery<BudgetPlan[]>({
    queryKey: ['budget-plans-all-for-memo'],
    queryFn: () => API.get('/budget-plans').then(r => r.data?.data ?? []),
  });

  const { data: files = [], isLoading } = useQuery<MemoFile[]>({
    queryKey: ['budget-call-memos-all'],
    queryFn: () => API.get('/budget-call-memos').then(r => r.data?.data ?? []),
  });

  const selectedFile = useMemo(
    () => files.find(f => f.budget_call_memos_id === selectedFileId) ?? null,
    [files, selectedFileId]
  );

  useEffect(() => {
    if (!selectedYear && budgetPlans.length > 0) {
      const active = budgetPlans.find(p => p.is_active) ?? budgetPlans[0];
      setSelectedYear(String(active.year));
    }
  }, [budgetPlans, selectedYear, setSelectedYear]);

  const activeYear = useMemo(
    () => budgetPlans.find(p => p.is_active)?.year,
    [budgetPlans]
  );

  const groupedByYear = useMemo(() => {
    const map = new Map<number, MemoFile[]>();
    files.forEach(f => {
      if (!map.has(f.year)) map.set(f.year, []);
      map.get(f.year)!.push(f);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, list]) => ({ year, list: list.sort((a, b) => a.sort_order - b.sort_order) }));
  }, [files]);

  const totalSize = useMemo(
    () => files.reduce((sum, f) => sum + (f.file_size ?? 0), 0),
    [files]
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['budget-call-memos-all'] });
    qc.invalidateQueries({ queryKey: ['budget-call-memos-current'] });
  };

  const stageFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const pdfsOnly = Array.from(fileList).filter(f => f.type === 'application/pdf');
    if (pdfsOnly.length < fileList.length) {
      toast.warning('Only PDF files are allowed — non-PDF files were ignored.');
    }
    if (pdfsOnly.length === 0) return;

    const newlyStaged: StagedFile[] = pdfsOnly.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      file,
      progress: 0,
      status: 'pending',
    }));

    setStagedFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const deduped = newlyStaged.filter(f => !existingIds.has(f.id));
      return [...prev, ...deduped];
    });
  };

  const removeStagedFile = (id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearStagedFiles = () => setStagedFiles([]);

  const confirmUpload = async () => {
    const toUpload = stagedFiles.filter(f => f.status !== 'done');
    if (toUpload.length === 0) return;
    if (!selectedYear) {
      toast.warning('Select a budget year first.');
      return;
    }

    setUploading(true);
    setStagedFiles(prev => prev.map(f => f.status !== 'done' ? { ...f, status: 'uploading', progress: 0 } : f));

    const uploadOne = (staged: StagedFile): Promise<'ok' | 'error'> => {
      const form = new FormData();
      form.append('year', selectedYear);
      form.append('files[]', staged.file);

      return API.post('/budget-call-memos', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt: any) => {
          const total = evt.total ?? staged.file.size;
          const pct = total ? Math.round((evt.loaded * 100) / total) : 0;
          setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, progress: pct } : f));
        },
      })
        .then(() => {
          setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, progress: 100, status: 'done' } : f));
          // let the 100% state flash briefly, then absorb-shrink this one file out — independent of the rest of the batch
          setTimeout(() => {
            setStagedFiles(prev => prev.map(f => f.id === staged.id ? { ...f, removing: true } : f));
            setTimeout(() => {
              setStagedFiles(prev => prev.filter(f => f.id !== staged.id));
            }, 420);
          }, 350);
          return 'ok' as const;
        })
        .catch((err: any) => {
          setStagedFiles(prev => prev.map(f => f.id === staged.id
            ? { ...f, status: 'error', error: err?.response?.data?.message ?? 'Upload failed.' }
            : f));
          return 'error' as const;
        });
    };

    const results = await Promise.all(toUpload.map(uploadOne));
    const succeededCount = results.filter(r => r === 'ok').length;
    const failedCount = results.length - succeededCount;

    setUploading(false);
    refresh();

    if (succeededCount > 0) {
      toast.success(`Uploaded ${succeededCount} file${succeededCount > 1 ? 's' : ''} to FY ${selectedYear}.`);
    }
    if (failedCount > 0) {
      toast.error(`${failedCount} file${failedCount > 1 ? 's' : ''} failed to upload.`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const undoneDeletesRef = useRef<Set<number>>(new Set());

  const restoreFileToCache = (file: MemoFile) => {
    qc.setQueryData<MemoFile[]>(['budget-call-memos-all'], (old) => {
      const list = old ?? [];
      return list.some(f => f.budget_call_memos_id === file.budget_call_memos_id) ? list : [...list, file];
    });
  };

  const requestDelete = (file: MemoFile) => {
    const id = file.budget_call_memos_id;

    // optimistic removal — gone from the list immediately
    qc.setQueryData<MemoFile[]>(['budget-call-memos-all'], (old) => (old ?? []).filter(f => f.budget_call_memos_id !== id));

    if (selectedFileId === id) {
      const cached = pdfCacheRef.current.get(id);
      if (cached) { URL.revokeObjectURL(cached); pdfCacheRef.current.delete(id); }
      setSelectedFileId(null);
    }

    undoneDeletesRef.current.delete(id);

    toast(`"${file.title || file.original_filename}" deleted`, {
      description: `FY ${file.year} · Cannot be undone`,
      duration: 8000,
      icon: <CountdownRing durationMs={8000} />,
      className: 'delete-toast-red',
      classNames: {
        title: '!text-red-900',
        description: '!text-red-500',
        actionButton: '!bg-red-600 hover:!bg-red-700 !text-white',
      },
      action: {
        label: 'Undo',
        onClick: () => {
          undoneDeletesRef.current.add(id);
          restoreFileToCache(file);
        },
      },
      // fires only when Sonner's own timer completes — which Sonner already
      // pauses automatically while the toast is hovered
      onAutoClose: async () => {
        if (undoneDeletesRef.current.has(id)) return;
        try {
          await API.delete(`/budget-call-memos/${id}`);
          // Don't invalidate/refetch the main list here — it's already
          // correct optimistically. Refetching now would pull the server's
          // list, which may still include other staged-for-delete files
          // whose timers haven't fired yet, and overwrite the optimistic
          // cache — making already-deleted rows reappear.
          qc.invalidateQueries({ queryKey: ['budget-call-memos-current'] });
        } catch {
          toast.error('Failed to delete file — restoring it.');
          restoreFileToCache(file);
        }
      },
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    stageFiles(e.dataTransfer.files);
  };

  const activePreviewUrl = selectedFile ? pdfCacheRef.current.get(selectedFile.budget_call_memos_id) ?? null : null;

  return (
    <div className="w-full max-w-none">
      <p className="text-[13px] text-gray-500 mb-6 max-w-2xl">
        Upload the PDF file(s) for a Budget Call Memorandum. Visible to all users on the "Budget Call Memo" page.
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_360px_minmax(0,1fr)] gap-6 items-start">

        {/* ── Upload panel ── */}
        <div className="xl:sticky xl:top-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Upload</p>
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="text-[11px] font-semibold text-gray-500 block mb-1.5">Budget Year</label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="h-9 text-sm w-full mb-4">
                <SelectValue placeholder="Select a budget year" />
              </SelectTrigger>
              <SelectContent>
                {budgetPlans.map(p => (
                  <SelectItem key={p.budget_plan_id} value={String(p.year)}>
                    FY {p.year} {p.is_active && <span className="text-emerald-600 ml-1">· Active</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              onDragOver={(e) => { e.preventDefault(); if (!uploading) setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={uploading ? undefined : onDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={cn(
                'rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-colors',
                uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                dragOver ? 'border-indigo-300 bg-indigo-50/40' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center mb-2.5 transition-colors',
                dragOver ? 'bg-indigo-100' : 'bg-blue-50'
              )}>
                <CloudArrowUpIcon className={cn('w-4.5 h-4.5 transition-colors', dragOver ? 'text-indigo-500' : 'text-blue-500')} />
              </div>
              <p className="text-[12px] font-medium text-gray-700">
                Click to browse, or drag PDF files here
              </p>
              <p className="text-[10.5px] text-gray-400 mt-1">PDF only · up to 20MB · multiple allowed</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => stageFiles(e.target.files)}
                disabled={uploading}
                className="hidden"
              />
            </div>

            {stagedFiles.length > 0 && (
              <div className="mt-3">
                <RateLimitBanner />
                <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 -mr-1">
                {stagedFiles.map(sf => (
                  <div
                    key={sf.id}
                    className={cn(
                      'rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5',
                      sf.removing && 'staged-file-absorb'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <DocumentTextIcon className="w-3.5 h-3.5 text-rose-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-medium text-gray-800 truncate">{sf.file.name}</p>
                        <p className="text-[10.5px] text-gray-400">{formatBytes(sf.file.size)}</p>
                      </div>
                      {sf.status === 'done' ? (
                        <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      ) : sf.status === 'error' ? (
                        <ExclamationCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                      ) : sf.status === 'pending' ? (
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => removeStagedFile(sf.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                        </Button>
                      ) : null}
                    </div>

                    {(sf.status === 'uploading' || sf.status === 'done') && (
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={sf.progress} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-gray-400 w-8 text-right">{sf.progress}%</span>
                      </div>
                    )}
                    {sf.status === 'error' && (
                      <p className="text-[10.5px] text-red-500 mt-1.5">{sf.error}</p>
                    )}
                  </div>
                ))}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={confirmUpload}
                    disabled={uploading || stagedFiles.every(f => f.status === 'done')}
                    className="h-8 text-[12px] flex-1"
                  >
                    {uploading
                      ? 'Uploading…'
                      : `Upload ${stagedFiles.filter(f => f.status !== 'done').length} file${stagedFiles.filter(f => f.status !== 'done').length !== 1 ? 's' : ''} to FY ${selectedYear || '—'}`}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={clearStagedFiles}
                    disabled={uploading}
                    className="h-8 text-[12px] text-gray-500"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Summary card ── */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Summary</p>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12px] text-gray-500">Budget years on file</span>
              <span className="text-[13px] font-semibold text-gray-800">{groupedByYear.length}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
              <span className="text-[12px] text-gray-500">Total files</span>
              <span className="text-[13px] font-semibold text-gray-800">{files.length}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
              <span className="text-[12px] text-gray-500">Total size</span>
              <span className="text-[13px] font-semibold text-gray-800">{formatBytes(totalSize)}</span>
            </div>
          </div>
        </div>

        {/* ── File list, grouped by year, drag to reorder within each year ── */}
        <div className="min-w-0">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Uploaded Files</p>
          </div>
          <p className="text-[10.5px] text-gray-400 mb-2">Click a file to preview · drag rows to reorder within a year</p>

          <div className="max-h-[calc(100vh-260px)] overflow-y-auto pr-1 -mr-1">
            {isLoading ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 text-[12px] text-gray-400 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                Loading…
              </div>
            ) : groupedByYear.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-gray-200 rounded-xl bg-white">
                <div className="w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <FolderOpenIcon className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-[12.5px] font-medium text-gray-600">No files uploaded yet</p>
                <p className="text-[11px] text-gray-400 mt-1">Files you upload will appear here, grouped by budget year.</p>
              </div>
            ) : (
              <>
                <style>{`
                  @keyframes memoFadeInUp {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
                <DndProvider backend={HTML5Backend}>
                  {groupedByYear.map((g, i) => (
                    <div
                      key={g.year}
                      className="animate-[memoFadeInUp_0.35s_ease-out_both]"
                      style={{ animationDelay: `${i * 70}ms` }}
                    >
                      <YearGroup
                        year={g.year}
                        files={g.list}
                        isActiveYear={g.year === activeYear}
                        onReordered={refresh}
                        onDelete={requestDelete}
                        onSelect={handleSelectFile}
                        selectedId={selectedFileId}
                        defaultOpen={i === 0}
                      />
                    </div>
                  ))}
                </DndProvider>
              </>
            )}
          </div>
        </div>

        {/* ── PDF preview ── */}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Preview</p>
          <PreviewPanel file={selectedFile} url={activePreviewUrl} loading={previewLoading} error={previewError} />
        </div>
      </div>
    </div>
  );
};

export default BudgetCallMemoAdminPage;
