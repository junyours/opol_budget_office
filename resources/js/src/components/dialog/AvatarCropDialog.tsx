import { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

const CROP_SIZE   = 280; // on-screen canvas size (px)
const OUTPUT_SIZE = 512; // exported image size (px)

interface AvatarCropDialogProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
}

export default function AvatarCropDialog({ file, open, onClose, onCropped }: AvatarCropDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom]     = useState(1);
  const [pos, setPos]       = useState({ x: 0, y: 0 }); // top-left of image in canvas space
  const [baseScale, setBaseScale] = useState(1);
  const [dragging, setDragging]   = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  // Load image whenever a new file comes in
  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const scale = Math.max(CROP_SIZE / img.width, CROP_SIZE / img.height);
      setBaseScale(scale);
      setZoom(1);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      setPos({ x: (CROP_SIZE - drawW) / 2, y: (CROP_SIZE - drawH) / 2 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  const clamp = useCallback((x: number, y: number, z: number) => {
    const img = imgRef.current;
    if (!img) return { x, y };
    const drawW = img.width * baseScale * z;
    const drawH = img.height * baseScale * z;
    const minX = Math.min(0, CROP_SIZE - drawW);
    const minY = Math.min(0, CROP_SIZE - drawH);
    return {
      x: Math.min(0, Math.max(minX, x)),
      y: Math.min(0, Math.max(minY, y)),
    };
  }, [baseScale]);

  // Redraw canvas whenever pos/zoom changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    const drawW = img.width * baseScale * zoom;
    const drawH = img.height * baseScale * zoom;
    ctx.drawImage(img, pos.x, pos.y, drawW, drawH);

    // Dim everything outside the circular crop area
    ctx.save();
    ctx.globalCompositeOperation = "destination-in";
    ctx.beginPath();
    ctx.arc(CROP_SIZE / 2, CROP_SIZE / 2, CROP_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, [pos, zoom, baseScale]);

  const handleZoomChange = (newZoom: number) => {
    const img = imgRef.current;
    if (!img) { setZoom(newZoom); return; }
    // keep the crop centered on the same focal point when zoom changes
    const oldDrawW = img.width * baseScale * zoom;
    const oldDrawH = img.height * baseScale * zoom;
    const newDrawW = img.width * baseScale * newZoom;
    const newDrawH = img.height * baseScale * newZoom;
    const cx = pos.x + oldDrawW / 2;
    const cy = pos.y + oldDrawH / 2;
    const newPos = clamp(cx - newDrawW / 2, cy - newDrawH / 2, newZoom);
    setZoom(newZoom);
    setPos(newPos);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPos(clamp(dragStart.current.posX + dx, dragStart.current.posY + dy, zoom));
  };
  const handlePointerUp = () => setDragging(false);

  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    const factor = OUTPUT_SIZE / CROP_SIZE;
    const drawW = img.width * baseScale * zoom * factor;
    const drawH = img.height * baseScale * zoom * factor;
    ctx.drawImage(img, pos.x * factor, pos.y * factor, drawW, drawH);

    out.toBlob(
      (blob) => { if (blob) onCropped(blob); },
      "image/jpeg",
      0.92
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-zinc-900">Adjust your photo</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 mt-2">
          <div
            className="rounded-full overflow-hidden ring-2 ring-zinc-200 bg-zinc-100 touch-none cursor-grab active:cursor-grabbing"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
          >
            <canvas
              ref={canvasRef}
              width={CROP_SIZE}
              height={CROP_SIZE}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>

          <div className="w-full flex items-center gap-3 px-2">
            <ZoomOut className="w-4 h-4 text-zinc-400 flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="w-full accent-zinc-900"
            />
            <ZoomIn className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          </div>

          <p className="text-xs text-zinc-400 text-center">Drag to reposition, use the slider to zoom.</p>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">Cancel</Button>
          <Button size="sm" onClick={handleConfirm} className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white">
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
