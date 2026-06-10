import React, { useEffect, useState } from "react";

// ── keyframes & shared styles ────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes bagFromTop {
    from { opacity: 0; transform: translateY(-40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bagFromLeft {
    from { opacity: 0; transform: translateX(-60px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes bagFromBottom {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

type Direction = "top" | "left" | "bottom";

const anim = (dir: Direction, delayMs: number): React.CSSProperties => {
  const name =
    dir === "top"    ? "bagFromTop"    :
    dir === "left"   ? "bagFromLeft"   :
                       "bagFromBottom";
  return {
    opacity: 0,
    animation: `${name} 0.85s cubic-bezier(0.22,1,0.36,1) forwards`,
    animationDelay: `${delayMs}ms`,
  };
};

// ── Hover image ──────────────────────────────────────────────────────────────
interface HoverImgProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}

const HoverImg: React.FC<HoverImgProps> = ({ src, alt, className = "w-full", style, eager = false }) => (
  <img
    src={src}
    alt={alt}
    loading={eager ? "eager" : "lazy"}
    className={className}
    style={{
      display: "block",
      transition: "transform 0.45s cubic-bezier(0.22,1,0.36,1), filter 0.45s ease",
      willChange: "transform",
      ...style,
    }}
    onMouseEnter={(e) => {
      const el = e.currentTarget as HTMLImageElement;
      el.style.transform = "scale(1.04)";
      el.style.filter = "brightness(1.07)";
    }}
    onMouseLeave={(e) => {
      const el = e.currentTarget as HTMLImageElement;
      el.style.transform = "scale(1)";
      el.style.filter = "brightness(1)";
    }}
  />
);

// ── Main page ────────────────────────────────────────────────────────────────
const BagOngOpol: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div className="p-5 pb-12 max-w-5xl mx-auto" style={{ transform: "scale(0.95)", transformOrigin: "top center" }}>

        {/* Header — falls from top */}
        <div style={anim("top", 0)} className="mb-4">
          <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", year: "numeric",
              month: "long", day: "numeric",
            })}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Bag-ong Opol
          </h1>
        </div>

        <div className="space-y-1">

          {/* Row 1 — roof, falls from top | eager: above the fold */}
          <div style={anim("top", 150)}>
            <HoverImg src="/images/1.png" alt="Bag-ong Opol" eager />
          </div>

          {/* Row 2 — smart services banner, falls from top | eager: above the fold */}
          <div style={anim("top", 400)}>
            <HoverImg src="/images/2.png" alt="Smart Services" eager />
          </div>

          {/* Row 3 — pillars, slide in from left | eager: above the fold */}
          <div className="flex gap-1" style={anim("left", 750)}>
            {[3, 4, 5, 6, 7].map((n, i) => (
              <div key={i} className="flex-1 min-w-0">
                <HoverImg src={`/images/${n}.png`} alt={`Pillar ${i + 1}`} eager />
              </div>
            ))}
          </div>

          {/* Row 4 — core values, rises from bottom | lazy: below fold */}
          <div style={anim("bottom", 1100)}>
            <HoverImg src="/images/8.png" alt="Core Values" />
          </div>

          {/* Row 5 — financial sustainability, rises from bottom | lazy: below fold */}
          <div style={anim("bottom", 1350)}>
            <HoverImg src="/images/9.png" alt="Financial Sustainability" />
          </div>

        </div>
      </div>
    </>
  );
};

export default BagOngOpol;
