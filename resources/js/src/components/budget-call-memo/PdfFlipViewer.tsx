import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQueries } from '@tanstack/react-query';
import { Document, Page, pdfjs } from 'react-pdf';
import HTMLFlipBookImpl from 'react-pageflip';
import { Button } from '@/src/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, ArrowsPointingOutIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';

const HTMLFlipBook = HTMLFlipBookImpl as unknown as React.ComponentType<any>;

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export interface BudgetCallMemoFile {
  budget_call_memos_id: number;
  title: string | null;
  original_filename: string;
  file_path: string;
  sort_order: number;
}

const buildUrl = (path: string) => (path.startsWith('http') ? path : `/storage/${path}`);

// 1x1 transparent pixel. Pages inside HTMLFlipBook must ALWAYS render the
// same <img> element — react-pageflip physically relocates each page's DOM
// node for its flip animation, and swapping element types on a page it
// already owns causes "removeChild: not a child of this node" crashes. So
// the src just points here until the real rasterized image is ready; the
// loading spinner is a separate overlay sibling, not a structural swap.
const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';

interface FlatPage { fileIndex: number; pageNumber: number; key: string; }
interface Dims { width: number; height: number; }

// Fit a `aspect` (w/h) box inside a container, "contain" style.
const fitContain = (containerW: number, containerH: number, aspect: number): Dims => {
  let width = containerW;
  let height = width / aspect;
  if (height > containerH) {
    height = containerH;
    width = height * aspect;
  }
  return { width: Math.floor(width), height: Math.floor(height) };
};

// How much sharper than CSS pixels we rasterize the PDF canvas to.
// Retina Macs/iPhones report devicePixelRatio 2-3; without this the
// canvas->img snapshot looks visibly blurry on those screens.
const getRasterScale = () => {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(Math.max(dpr, 1.5), 3);
};

const MOBILE_QUERY = '(max-width: 639px)';
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
};

interface PdfFlipViewerProps {
  files: BudgetCallMemoFile[];
  expanded?: boolean;
  onExpand?: () => void;
  onClose?: () => void;
}

export const PdfFlipViewer: React.FC<PdfFlipViewerProps> = ({ files, expanded = false, onExpand, onClose }) => {
  const isMobile = useIsMobile();
  const [numPagesByFile, setNumPagesByFile] = useState<Record<number, number>>({});
  const [pageAspect, setPageAspect] = useState<number>(8.5 / 11);
  const [aspectKnown, setAspectKnown] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dims, setDims] = useState<Dims>({ width: 320, height: 440 });
  const rasterScale = useMemo(getRasterScale, []);

  const [pageImages, setPageImages] = useState<Record<string, string>>({});
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  // stageRef: the box we size the book into. Its size comes ONLY from CSS
  // classes / viewport (see the JSX below) — never from its own children —
  // so flipping pages can never feed back into a resize -> remount loop.
  const stageRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);

  const handleLoadSuccess = useCallback(
    (fileIndex: number) => (pdf: { numPages: number }) => {
      setNumPagesByFile(prev => ({ ...prev, [fileIndex]: pdf.numPages }));
    },
    []
  );

  const handleFirstPageDims = useCallback((page: any) => {
    if (!aspectKnown && page?.width && page?.height) {
      setPageAspect(page.width / page.height);
      setAspectKnown(true);
    }
  }, [aspectKnown]);

  // Fetch each file's raw PDF bytes exactly once, cached by TanStack Query —
  // both <Document> instances below reuse this instead of each doing their
  // own network fetch (which was doubling every request).
  const pdfByteQueries = useQueries({
    queries: files.map(f => ({
      queryKey: ['pdf-bytes', f.budget_call_memos_id],
      queryFn: async () => {
        const res = await fetch(buildUrl(f.file_path));
        if (!res.ok) throw new Error(`Failed to fetch PDF (${res.status})`);
        return res.arrayBuffer();
      },
      staleTime: Infinity,
      gcTime: 30 * 60 * 1000,
    })),
  });
  const pdfBuffers = pdfByteQueries.map(q => q.data as ArrayBuffer | undefined);

  // react-pdf's <Document> deep-compares its `file` prop with `dequal` to decide
  // whether to reload. If we pass a brand-new { data: ... } object every render,
  // dequal falls through to reading the OLD buffer byte-by-byte — but pdf.js's
  // worker already detached that old buffer after parsing it, so the comparison
  // crashes with "Cannot perform Construct on a detached ArrayBuffer".
  // Fix: build each file's `{ data }` object exactly once and keep the same
  // reference forever, so dequal's `foo === bar` short-circuit always wins.
  // Loader and rasterizer each get their OWN copy since each is an independent
  // pdf.js consumer that can detach its own buffer.
  const loaderFileCacheRef = useRef<Map<number, { data: ArrayBuffer }>>(new Map());
  const rasterFileCacheRef = useRef<Map<number, { data: ArrayBuffer }>>(new Map());

  const getLoaderFile = (fileId: number, buf: ArrayBuffer) => {
    if (!loaderFileCacheRef.current.has(fileId)) {
      loaderFileCacheRef.current.set(fileId, { data: buf.slice(0) });
    }
    return loaderFileCacheRef.current.get(fileId)!;
  };

  const getRasterFile = (fileId: number, buf: ArrayBuffer) => {
    if (!rasterFileCacheRef.current.has(fileId)) {
      rasterFileCacheRef.current.set(fileId, { data: buf.slice(0) });
    }
    return rasterFileCacheRef.current.get(fileId)!;
  };

  // Only the FIRST file needs to have finished loading (numPages known) before
  // we start rasterizing/showing page 1 — waiting on EVERY file's hidden
  // Document to finish parsing (the old behavior) was what made mobile — much
  // slower per-file PDF.js parsing than desktop — take dramatically longer to
  // show anything, even though only file 0 / page 1 is needed for first paint.
  // Other files' pages simply appear in flatPages (and get rasterized) as
  // their own numPages resolves, in the background.
  const filesReady = files.length > 0 && numPagesByFile[0] !== undefined;

  const flatPages: FlatPage[] = useMemo(() => {
    const out: FlatPage[] = [];
    files.forEach((f, fileIndex) => {
      const n = numPagesByFile[fileIndex] ?? 0;
      for (let p = 1; p <= n; p++) {
        out.push({ fileIndex, pageNumber: p, key: `${f.budget_call_memos_id}-${p}` });
      }
    });
    return out;
  }, [files, numPagesByFile]);

  // Two separate gates:
  //  - `ready`: enough to show the book (just page 1) — keeps first paint fast,
  //    especially on mobile where waiting for high-DPI rasterization of EVERY
  //    page up front was the actual cause of the long "Loading pages…" wait.
  //  - `allRasterized`: everything is done — controls when we stop mounting the
  //    hidden rasterizer <Document> instances.
  const allRasterized = flatPages.length > 0 && flatPages.every(p => pageImages[p.key]);
  const ready = filesReady && flatPages.length > 0 && !!pageImages[flatPages[0]?.key];

  const handlePageRenderSuccess = useCallback((key: string) => () => {
    const canvas = canvasRefs.current[key];
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      // Guard against a "successful" render that's actually a blank/near-empty
      // canvas (seen with malformed embedded fonts triggering pdf.js TT warnings) —
      // a real page is never this small as a PNG.
      if (dataUrl.length < 1500) {
        console.warn('[PdfFlipViewer] Suspiciously small capture, possible blank render:', key, dataUrl.length);
      }
      setPageImages(prev => (prev[key] ? prev : { ...prev, [key]: dataUrl }));
    } catch (err) {
      console.error('[PdfFlipViewer] Failed to rasterize page to image:', key, err);
    }
  }, []);

  // ── Measure the stage and compute per-page pixel size ──────────────────────
  // Below `sm` breakpoint we show a single page; above it, a two-page spread
  // (matching how HTMLFlipBook actually renders). Sizing against the wrong
  // one is what made the book look tiny / not fill its box.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    let raf = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    // Mobile Safari's address bar collapsing/expanding while the page settles
    // fires visualViewport 'resize' repeatedly. Each firing used to recompute
    // dims immediately, and because <HTMLFlipBook> below is force-remounted
    // whenever dims changes (it's keyed by `${dims.width}x${dims.height}`
    // since the library doesn't react to width/height prop changes on its
    // own), that meant remounting it several times in a row during load.
    // react-pageflip physically relocates page DOM nodes for its flip
    // animation, so yanking it out mid-relocation is what threw "removeChild:
    // not a child of this node" — which then triggered React's error-boundary
    // retry loop ("Maximum update depth exceeded") right behind it.
    // Debouncing lets the viewport settle to ONE final value before we ever
    // touch dims / remount the book.
    const doRecompute = () => {
      const rect = el.getBoundingClientRect();
      const containerW = rect.width;
      let containerH = rect.height;

      if (isMobile) {
        const vh = window.visualViewport?.height ?? window.innerHeight;
        containerH = Math.max(containerH, vh - rect.top - 16);
      }

      if (containerW < 10 || containerH < 10) return;

      const numVisible = containerW < 640 ? 1 : 2;
      const perPageW = containerW / numVisible;
      const next = fitContain(perPageW, containerH, pageAspect);

      // Wider snap tolerance on mobile absorbs the small back-and-forth
      // jitter from the address bar, so it doesn't read as a "real" size
      // change and force another remount.
      const threshold = isMobile ? 24 : 8;
      setDims(prev => {
        if (Math.abs(prev.width - next.width) < threshold && Math.abs(prev.height - next.height) < threshold) return prev;
        return next;
      });
    };

    const recompute = (immediate = false) => {
      cancelAnimationFrame(raf);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (immediate) {
        raf = requestAnimationFrame(doRecompute);
      } else {
        debounceTimer = setTimeout(() => {
          raf = requestAnimationFrame(doRecompute);
        }, 150);
      }
    };

    recompute(true);
    const onResize = () => recompute(false);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.visualViewport?.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [pageAspect, isMobile]);

  // Lock background scroll while the focus-mode modal is open
  useEffect(() => {
    if (!expanded) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [expanded]);

  const atStart = current === 0;
  const atEnd = current >= flatPages.length - 1;

  const goNext = useCallback(() => { bookRef.current?.pageFlip()?.flipNext(); }, []);
  const goPrev = useCallback(() => { bookRef.current?.pageFlip()?.flipPrev(); }, []);
  const handleFlip = useCallback((e: any) => setCurrent(e.data), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape' && expanded && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose, expanded]);

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl">
        No Budget Call Memorandum uploaded yet.
      </div>
    );
  }

  // Cap the raster width outright. Without this, mobile — which shows a
  // single full-width page (vs desktop's half-width two-page spread) at a
  // typically higher devicePixelRatio (2-3 vs desktop's often-clamped 1.5) —
  // was rasterizing page 1 at several times the pixel count of desktop,
  // directly slowing the canvas render + toDataURL() that gates first paint.
  // 1600px is comfortably sharp on any phone or laptop screen at this UI's
  // page sizes; there's no visible quality loss from capping it here.
  const rasterWidth = Math.min(Math.round(dims.width * rasterScale), 1600);

  const bookNode = (
    <div className="relative w-full h-full flex flex-col items-center">

      {/* Hidden loaders: get numPages + first-page aspect ratio for every file */}
      <div className="hidden">
        {files.map((f, i) => {
          const buf = pdfBuffers[i];
          if (!buf) return null;
          return (
            <Document
              key={f.budget_call_memos_id}
              file={getLoaderFile(f.budget_call_memos_id, buf)}
              onLoadSuccess={handleLoadSuccess(i)}
              onLoadError={(err) => console.error('[hidden loader] Document load error:', f.file_path, err)}
            >
              {i === 0 && (
                <Page
                  pageNumber={1}
                  onLoadSuccess={handleFirstPageDims}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              )}
            </Document>
          );
        })}
      </div>

      {/* Hidden rasterizers: render every page once off-screen at high-DPI, capture to <img> */}
      {filesReady && !allRasterized && dims.width > 0 && (
        <div className="hidden">
          {files.map((f, fileIndex) => {
            const buf = pdfBuffers[fileIndex];
            if (!buf) return null;
            return (
              <Document key={`raster-${f.budget_call_memos_id}`} file={getRasterFile(f.budget_call_memos_id, buf)} loading={null}>
                {flatPages
                  .filter(p => p.fileIndex === fileIndex)
                  .map(p => (
                    <Page
                      key={p.key}
                      pageNumber={p.pageNumber}
                      width={rasterWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      canvasRef={(canvas: HTMLCanvasElement | null) => { canvasRefs.current[p.key] = canvas; }}
                      onRenderSuccess={handlePageRenderSuccess(p.key)}
                      onRenderError={(err: any) => console.error('[rasterizer] Page render error:', p.key, err)}
                    />
                  ))}
              </Document>
            );
          })}
        </div>
      )}

      {/* ── Stage: fixed-by-CSS box the book lives in. Never resizes from content. ── */}
     <div
        ref={stageRef}
        className="relative w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden"
      >
        {!ready ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            Loading pages…
          </div>
        ) : (
          <>
            <HTMLFlipBook
              key={`${dims.width}x${dims.height}`}
              ref={bookRef}
              width={dims.width}
              height={dims.height}
              size="fixed"
              minWidth={200}
              maxWidth={2200}
              minHeight={260}
              maxHeight={2800}
              showCover={false}
              usePortrait
              mobileScrollSupport={false}
              drawShadow
              maxShadowOpacity={0.3}
              flippingTime={550}
              swipeDistance={30}
              clickEventForward={false}
              useMouseEvents
              className="pf-book"
              onFlip={handleFlip}
              style={{}}
            >
              {flatPages.map((p, idx) => (
                <div
                  key={p.key}
                  className="pf-page bg-white"
                  style={{
                    position: 'relative',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    WebkitBackfaceVisibility: 'hidden',
                    backfaceVisibility: 'hidden',
                  }}
                >
                  <img
                    src={pageImages[p.key] || TRANSPARENT_PIXEL}
                    alt={`Page ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'contain',
                      WebkitBackfaceVisibility: 'hidden',
                      backfaceVisibility: 'hidden',
                    }}
                    draggable={false}
                  />
                  {!pageImages[p.key] && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-gray-50"
                      style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden' }}
                    >
                      <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </HTMLFlipBook>

            {/* Prev / Next — anchored to the stage's left/right edges */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goPrev}
              disabled={atStart}
              aria-label="Previous page"
              className={cn(
                'absolute left-1 sm:left-3 top-1/2 -translate-y-1/2 z-10',
                'h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-md',
                'bg-white/90 hover:bg-white backdrop-blur border border-gray-200',
                'disabled:opacity-0 disabled:pointer-events-none transition-opacity'
              )}
            >
              <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={goNext}
              disabled={atEnd}
              aria-label="Next page"
              className={cn(
                'absolute right-1 sm:right-3 top-1/2 -translate-y-1/2 z-10',
                'h-9 w-9 sm:h-10 sm:w-10 rounded-full shadow-md',
                'bg-white/90 hover:bg-white backdrop-blur border border-gray-200',
                'disabled:opacity-0 disabled:pointer-events-none transition-opacity'
              )}
            >
              <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </Button>

            {/* Page indicator pill */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-2.5 py-1 rounded-full bg-gray-900/80 backdrop-blur text-white text-[10.5px] font-medium tabular-nums">
              {current + 1} / {flatPages.length}
            </div>

            {!expanded && onExpand && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={onExpand}
                aria-label="Focus mode"
                className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-white/90 hover:bg-white backdrop-blur border border-gray-200 shadow-sm"
              >
                <ArrowsPointingOutIcon className="w-3.5 h-3.5 text-gray-600" />
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );

  if (!expanded) {
    return (
      <div className="w-full h-full rounded-xl border border-gray-200 bg-white shadow-sm p-3 sm:p-4 flex flex-col overflow-hidden">
        {bookNode}
      </div>
    );
  }

  // Portal to <body> so no ancestor (sidebar, transformed wrapper, sticky
  // header) can trap this in a local stacking context and peek through.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ height: '100dvh', width: '100dvw' }}
      onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 sm:top-5 sm:right-5 z-10 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white"
      >
        <XMarkIcon className="w-5 h-5" />
      </Button>

      <div className="w-[94vw] sm:w-[90vw] h-[88dvh] max-w-[1400px] flex flex-col items-center justify-center gap-4">
        {bookNode}

        {/* <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-[12px] font-medium text-white/70 hover:text-white bg-transparent border-white/20 hover:border-white/40 hover:bg-white/10"
        >
          Close <span className="text-white/40 ml-1">(Esc)</span>
        </Button> */}
      </div>
    </div>,
    document.body
  );
};
