import React, { useEffect, useState } from "react";
import { cn } from "@/src/lib/utils";

// ── animation delay helper ──────────────────────────────────────────────────
const delay = (ms: number): React.CSSProperties => ({
  animationDelay: `${ms}ms`,
  animationFillMode: "both",
});

// ── Image card component ────────────────────────────────────────────────────
interface SectionCardProps {
  imgSrc: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  overlayClassName?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({
  imgSrc,
  children,
  className,
  style,
  overlayClassName = "bg-black/45",
}) => (
  <div
    style={{
      backgroundImage: `url(${imgSrc})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      ...style,
    }}
    className={cn(
      "relative overflow-hidden rounded-2xl shadow-md",
      className
    )}
  >
    {/* overlay */}
    <div className={cn("absolute inset-0", overlayClassName)} />
    {/* content */}
    <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 text-center text-white">
      {children}
    </div>
  </div>
);

// ── Pillar card (3-7) ────────────────────────────────────────────────────────
interface PillarProps {
  img: string;
  sector: string;
  title: string;
  items: string[];
  accentColor: string;
  delayMs: number;
}

const PillarCard: React.FC<PillarProps> = ({
  img,
  sector,
  title,
  items,
  accentColor,
  delayMs,
}) => (
  <div
    className="flex-1 min-w-0 animate-in fade-in slide-in-from-bottom-4 duration-700"
    style={delay(delayMs)}
  >
    {/* sector label */}
    <div
      className="text-[9px] font-bold uppercase tracking-[0.14em] text-center py-1.5 rounded-t-xl mb-0.5"
      style={{ background: accentColor, color: "#fff" }}
    >
      {sector}
    </div>

    {/* image card with title */}
    <SectionCard
      imgSrc={img}
      overlayClassName="bg-black/50"
      className="rounded-none"
      style={{ height: 80 }}
    >
      <p className="text-sm font-black uppercase tracking-wide leading-tight">
        {title}
      </p>
    </SectionCard>

    {/* items list */}
    <div className="bg-white border border-zinc-100 rounded-b-xl px-3 py-3 space-y-2 shadow-sm">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2">
          <span
            className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: accentColor }}
          />
          <p className="text-[10.5px] text-zinc-600 leading-snug font-medium">
            {item}
          </p>
        </div>
      ))}
    </div>
  </div>
);

// ── Main page ────────────────────────────────────────────────────────────────
const BagOngOpol: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const base = "/src/assets/images";

  const pillars: Omit<PillarProps, "delayMs">[] = [
    {
      img: `${base}3.png`,
      sector: "Social",
      title: "Care For All",
      accentColor: "#1e4d7b",
      items: [
        "KABAYA APP (Social Services)",
        "Modernized Command Center",
        "Smart Modernization of Schools and OCC",
        "Primary to Secondary Healthcare Facility",
      ],
    },
    {
      img: `${base}4.png`,
      sector: "Economic",
      title: "Grow Smart",
      accentColor: "#2563a8",
      items: [
        "AGROW Opol (SMART Supply Chain Program)",
        "INVEST Opol: Investment and Tourism Readiness",
        "Local Enterprise Growth and Job Accelerator Program",
      ],
    },
    {
      img: `${base}5.png`,
      sector: "Infrastructure",
      title: "Build Green",
      accentColor: "#1e6fa8",
      items: [
        "Sustainable, Climate-Responsive Infra Development Planning",
        "Smart Eco Building and Public Space Upgrade",
        "Participatory Planning in Barangay Infra Priorities",
      ],
    },
    {
      img: `${base}6.png`,
      sector: "Environment",
      title: "Protect Nature",
      accentColor: "#1a5276",
      items: [
        "Solid Waste Management Program",
        "Comprehensive Land Use Plan",
        "Watershed Protection and Wastewater Facility",
      ],
    },
    {
      img: `${base}7.png`,
      sector: "Institutional",
      title: "Lead Openly",
      accentColor: "#154360",
      items: [
        "Participatory Planning and Budgeting",
        "Open Data and Performance Management Framework",
        "Ethics and Performance in Public Service",
      ],
    },
  ];

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @keyframes roofDrop {
          from { opacity: 0; transform: translateY(-32px) scaleX(0.92); }
          to   { opacity: 1; transform: translateY(0) scaleX(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-roof { animation: roofDrop 0.65s cubic-bezier(.34,1.4,.64,1) both; }
        .anim-fade-up { animation: fadeUp 0.55s ease both; }
      `}</style>

      <div className="p-5 pb-12 space-y-4 max-w-5xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="anim-fade-up" style={delay(0)}>
          <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">
            Bag-ong Opol
          </h1>
        </div>

        {/* ══ HOUSE STRUCTURE ══════════════════════════════════════════════ */}
        <div className="space-y-2">

          {/* 1 ── ROOF ─────────────────────────────────────────────────── */}
          <div className="anim-roof" style={delay(120)}>
            <SectionCard
              imgSrc={`${base}1.png`}
              overlayClassName="bg-gradient-to-b from-[#8b1a1a]/70 to-[#c0392b]/60"
              style={{ height: 130 }}
              className="rounded-2xl"
            >
              {/* Roof / triangle illusion via clip */}
              <div
                className="absolute inset-0 rounded-t-2xl"
                style={{
                  clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
                  background: "rgba(139,26,26,0.35)",
                }}
              />
              <p className="text-xl font-black uppercase tracking-widest drop-shadow-lg">
                BAG-ONG OPOL:
              </p>
              <p className="text-[11px] font-semibold italic tracking-wide mt-1 opacity-90 max-w-md drop-shadow">
                A VIBRANT, INCLUSIVE, SMART, ECO-TOWN WHERE SUSTAINABILITY
                MEETS INNOVATION.
              </p>
            </SectionCard>
          </div>

          {/* 2 ── TAGLINE BANNER ────────────────────────────────────────── */}
          <div className="anim-fade-up" style={delay(250)}>
            <SectionCard
              imgSrc={`${base}2.png`}
              overlayClassName="bg-[#1a3a5c]/80"
              style={{ height: 64 }}
              className="rounded-xl"
            >
              <p className="text-sm font-black uppercase tracking-widest drop-shadow">
                SMART SERVICES WITH A HEART:
              </p>
              <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-90">
                TECHNOLOGY THAT CARES, GOVERNANCE THAT EMPOWERS!
              </p>
            </SectionCard>
          </div>

          {/* 3–7 ── PILLARS ROW ─────────────────────────────────────────── */}
          <div className="flex gap-2">
            {pillars.map((p, i) => (
              <PillarCard key={p.sector} {...p} delayMs={350 + i * 80} />
            ))}
          </div>

          {/* 8 ── CORE VALUES ───────────────────────────────────────────── */}
          <div className="anim-fade-up" style={delay(780)}>
            <SectionCard
              imgSrc={`${base}8.png`}
              overlayClassName="bg-[#7b2424]/75"
              style={{ height: 68 }}
              className="rounded-xl border-2 border-[#c0392b]/30"
            >
              <p className="text-sm font-black uppercase tracking-widest drop-shadow">
                CORE VALUES:
              </p>
              <p className="text-[10.5px] font-semibold tracking-wide mt-0.5 opacity-90">
                PEOPLE-CENTRIC MINDSET, MEANINGFUL INNOVATION, EXCELLENCE IN
                EXECUTION
              </p>
            </SectionCard>
          </div>

          {/* 9 ── FINANCIAL SUSTAINABILITY ──────────────────────────────── */}
          <div className="anim-fade-up" style={delay(900)}>
            <SectionCard
              imgSrc={`${base}9.png`}
              overlayClassName="bg-[#5a1a1a]/70"
              style={{ height: 58 }}
              className="rounded-xl border-2 border-[#c0392b]/20"
            >
              <p className="text-sm font-black uppercase tracking-widest drop-shadow">
                FINANCIAL SUSTAINABILITY
              </p>
              <p className="text-[10px] font-semibold tracking-wide mt-0.5 opacity-90">
                (INTERNAL AND EXTERNAL SOURCES)
              </p>
            </SectionCard>
          </div>

        </div>
        {/* ══ end house ════════════════════════════════════════════════════ */}

      </div>
    </>
  );
};

export default BagOngOpol;
