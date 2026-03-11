import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────
// SWIFTUI ARCHITECTURE REFERENCE (embedded as data)
// ─────────────────────────────────────────────────────────────
const SWIFT_DOCS = {
  persistence: `
// ── SwiftData Model ──────────────────────────────────────────
@Model final class RitualRecord {
    var id: UUID = UUID()
    var date: Date = Date()
    var euphoriaScore: Int          // 0–100
    var dysphoriaScore: Int         // 0–100
    var harmonyScore: Double        // computed on save
    var dominantShift: ShiftType    // .mental | .sensorial | .onirico
    var habitatSelected: HabitatID  // .forest | .mountain | .tundra
    var meditationSeconds: Int      // duración real de la sesión
    var theriotipo: String          // FK → TheriotipoBase.id
    var gearEquipped: [String]      // IDs del gear activo

    // Computed — nunca stored en DB
    var balanceLabel: String {
        switch harmonyScore {
        case 80...: return "Equilibrio Profundo"
        case 60..<80: return "Vínculo Estable"
        case 40..<60: return "Tensión Latente"
        default: return "Disforia Activa"
        }
    }
}

// ── Persistence Controller ────────────────────────────────────
@MainActor final class PersistenceController {
    static let shared = PersistenceController()
    let container: ModelContainer

    init() {
        let schema = Schema([RitualRecord.self])
        // historyLimit: evita que la DB crezca sin control
        let config = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .automatic  // iCloud sync gratis
        )
        container = try! ModelContainer(for: schema, configurations: config)
    }

    // Guardar ritual del día (upsert por fecha)
    func saveRitual(_ ritual: RitualRecord,
                    context: ModelContext) throws {
        let today = Calendar.current.startOfDay(for: .now)
        let pred  = #Predicate<RitualRecord> {
            $0.date >= today
        }
        // Si ya existe un registro hoy → actualizamos
        if let existing = try context.fetch(
            FetchDescriptor(predicate: pred)).first {
            existing.euphoriaScore   = ritual.euphoriaScore
            existing.dysphoriaScore  = ritual.dysphoriaScore
            existing.harmonyScore    = ritual.harmonyScore
            existing.meditationSeconds += ritual.meditationSeconds
        } else {
            context.insert(ritual)
        }
        try context.save()
    }

    // Últimos N días para el gráfico de tendencia
    func fetchWeekly(context: ModelContext) throws -> [RitualRecord] {
        let cutoff = Calendar.current.date(byAdding: .day,
                                           value: -7, to: .now)!
        let pred = #Predicate<RitualRecord> { $0.date >= cutoff }
        var desc = FetchDescriptor(predicate: pred,
                                   sortBy: [SortDescriptor(\\.date)])
        desc.fetchLimit = 7          // ← CRÍTICO: nunca cargar todo
        return try context.fetch(desc)
    }
}`,

  glassmorph: `
// ── Glassmorphism en SwiftUI ──────────────────────────────────
struct GlassCard<Content: View>: View {
    var content: Content
    var tint: Color = .white
    var intensity: Double = 0.12

    var body: some View {
        content
            .background {
                // Capa 1: desenfoque real del contenido detrás
                RoundedRectangle(cornerRadius: 20)
                    .fill(.ultraThinMaterial)         // iOS blur nativo
                    .overlay {
                        // Capa 2: tinte orgánico
                        RoundedRectangle(cornerRadius: 20)
                            .fill(tint.opacity(intensity))
                    }
                    .overlay {
                        // Capa 3: borde luminoso
                        RoundedRectangle(cornerRadius: 20)
                            .strokeBorder(
                                LinearGradient(
                                    colors: [
                                        tint.opacity(0.4),
                                        tint.opacity(0.05)
                                    ],
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                ), lineWidth: 0.8)
                    }
            }
    }
}`,

  animations: `
// ── Animaciones orgánicas ─────────────────────────────────────
// 1. Partículas flotantes (Canvas API — zero UIKit overhead)
struct ParticleCanvas: View {
    @State private var phase: Double = 0

    var body: some View {
        TimelineView(.animation) { tl in
            Canvas { ctx, size in
                let t = tl.date.timeIntervalSinceReferenceDate
                for i in 0..<40 {
                    let x = (sin(Double(i) * 1.3 + t * 0.3) * 0.5 + 0.5) * size.width
                    let y = (cos(Double(i) * 0.9 + t * 0.2) * 0.5 + 0.5) * size.height
                    let r = CGFloat(2 + sin(Double(i) + t) * 1.5)
                    ctx.fill(Path(ellipseIn: CGRect(
                        x: x-r, y: y-r, width: r*2, height: r*2)),
                        with: .color(.white.opacity(0.08)))
                }
            }
        }
        .allowsHitTesting(false)
    }
}

// 2. Breathing ring (SF Symbol + matchedGeometryEffect)
struct BreathRing: View {
    @State private var expanding = false
    let color: Color

    var body: some View {
        Circle()
            .stroke(color.opacity(0.3), lineWidth: 1)
            .scaleEffect(expanding ? 1.4 : 1.0)
            .opacity(expanding ? 0 : 0.6)
            .animation(
                .easeInOut(duration: 2.8).repeatForever(autoreverses: false),
                value: expanding)
            .onAppear { expanding = true }
    }
}

// 3. Transición de hábitat (shader-like con MeshGradient iOS 18)
struct HabitatBackground: View {
    var habitat: HabitatID
    @State private var animate = false

    var colors: [[Color]] {
        switch habitat {
        case .forest:  return [[.green.opacity(0.3), .black], [.brown.opacity(0.2), .black]]
        case .mountain:return [[.blue.opacity(0.2), .black],  [.gray.opacity(0.15), .black]]
        case .tundra:  return [[.cyan.opacity(0.15), .black], [.white.opacity(0.1), .black]]
        }
    }

    var body: some View {
        MeshGradient(width: 2, height: 2, points: [
            [0, 0], [1, 0], [0, 1], [1, 1]
        ], colors: colors.flatMap { $0 })
        .ignoresSafeArea()
        .animation(.easeInOut(duration: 3), value: habitat)
    }
}`
};

// ─────────────────────────────────────────────────────────────
// VISUAL DATA
// ─────────────────────────────────────────────────────────────
const HABITATS = {
  forest:   { name: "Bosque Boreal",    emoji: "🌲", desc: "Pinos centenarios, musgo húmedo, luz de luna filtrada", color: "#3A6A3A", accent: "#7AC87A", particles: "🍃🌿✦" },
  mountain: { name: "Montaña Alpina",   emoji: "⛰️",  desc: "Silencio nevado, viento frío, auroras distantes",     color: "#3A5A7A", accent: "#90C4E8", particles: "❄️✦·" },
  tundra:   { name: "Tundra Lunar",     emoji: "🌕", desc: "Llanura helada, cielo estrellado, niebla baja",        color: "#4A3A6A", accent: "#C8A8E8", particles: "✦·°" },
  river:    { name: "Río de la Taiga",  emoji: "🌊", desc: "Corriente oscura, ramas sobre el agua, croar lejano",  color: "#2A4A5A", accent: "#70B8C8", particles: "💧~·" },
};

const WEEKLY_DATA = [
  { day: "L", harmony: 68, euphoria: 72, dysphoria: 35 },
  { day: "M", harmony: 74, euphoria: 80, dysphoria: 28 },
  { day: "X", harmony: 55, euphoria: 60, dysphoria: 48 },
  { day: "J", harmony: 82, euphoria: 88, dysphoria: 18 },
  { day: "V", harmony: 71, euphoria: 75, dysphoria: 32 },
  { day: "S", harmony: 90, euphoria: 94, dysphoria: 12 },
  { day: "H", harmony: 77, euphoria: 82, dysphoria: 26 },
];

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────
const useAnimatedValue = (target, delay = 0, duration = 1200) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(target * ease));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target]);
  return val;
};

const HarmonyRing = ({ score, color, size = 140 }) => {
  const animated = useAnimatedValue(score, 300);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (animated / 100) * circ;

  const label = score >= 80 ? "Equilibrio Profundo"
    : score >= 60 ? "Vínculo Estable"
    : score >= 40 ? "Tensión Latente"
    : "Disforia Activa";

  const ringColor = score >= 80 ? "#7AC87A"
    : score >= 60 ? color
    : score >= 40 ? "#C8A84A"
    : "#C87A7A";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {/* Pulse rings */}
      {[0,1,2].map(i => (
        <div key={i} style={{
          position: "absolute",
          inset: `${-i * 10}px`,
          borderRadius: "50%",
          border: `1px solid ${ringColor}`,
          opacity: 0.08 - i * 0.02,
          animation: `ritualPulse ${2.5 + i * 0.6}s ease-in-out infinite`,
          animationDelay: `${i * 0.4}s`,
        }}/>
      ))}
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={ringColor} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${ringColor}88)`, transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "28px", color: ringColor,
          textShadow: `0 0 20px ${ringColor}88` }}>{animated}</span>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "2px" }}>ARMONÍA</span>
      </div>
    </div>
  );
};

const MiniBar = ({ val, max, color }) => {
  const [w, setW] = useState(0);
  useEffect(() => { setTimeout(() => setW(val), 500); }, [val]);
  return (
    <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", flex: 1 }}>
      <div style={{
        height: "100%", width: `${(w/max)*100}%`, borderRadius: "2px",
        background: `linear-gradient(90deg, ${color}88, ${color})`,
        boxShadow: `0 0 6px ${color}66`,
        transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
      }}/>
    </div>
  );
};

const WeekChart = ({ data, accent }) => {
  const max = 100;
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "flex-end", height: "60px" }}>
      {data.map((d, i) => {
        const isToday = i === data.length - 1;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{
              width: "100%", borderRadius: "3px 3px 2px 2px",
              height: `${(d.harmony / max) * 48}px`,
              background: isToday
                ? `linear-gradient(180deg, ${accent}, ${accent}88)`
                : "rgba(255,255,255,0.12)",
              boxShadow: isToday ? `0 0 10px ${accent}66` : "none",
              transition: `height 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.07}s`,
            }}/>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px",
              color: isToday ? accent : "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>{d.day}</span>
          </div>
        );
      })}
    </div>
  );
};

const FloatingParticle = ({ char, x, y, delay, duration }) => (
  <div style={{
    position: "absolute", left: `${x}%`, top: `${y}%`,
    fontSize: "10px", opacity: 0.2,
    animation: `floatUp ${duration}s ease-in-out infinite`,
    animationDelay: `${delay}s`,
    pointerEvents: "none",
    userSelect: "none",
  }}>{char}</div>
);

const BreathCircle = ({ phase, habitatColor, habitatAccent }) => {
  const scale = phase === "inhale" ? 1.3 : phase === "hold" ? 1.3 : 1.0;
  const label = phase === "inhale" ? "Inhala..." : phase === "hold" ? "Sostén..." : "Exhala...";
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "160px", height: "160px" }}>
      {[1.6, 1.35, 1.0].map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          width: `${s * 80}px`, height: `${s * 80}px`,
          borderRadius: "50%",
          border: `1px solid ${habitatAccent}`,
          opacity: 0.1 + (i === 2 ? 0.1 : 0),
          transform: `scale(${scale})`,
          transition: "transform 4s ease-in-out, opacity 1s ease",
        }}/>
      ))}
      <div style={{
        width: "80px", height: "80px", borderRadius: "50%",
        background: `radial-gradient(circle at 35% 35%, ${habitatAccent}44, ${habitatColor}88)`,
        border: `1.5px solid ${habitatAccent}66`,
        transform: `scale(${scale})`,
        transition: "transform 4s ease-in-out",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 30px ${habitatColor}66`,
      }}>
        <span style={{ fontSize: "28px" }}>🌙</span>
      </div>
      <div style={{
        position: "absolute", bottom: "-28px",
        fontFamily: "'Cinzel', serif", fontSize: "11px",
        color: habitatAccent, letterSpacing: "0.15em",
        textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
};

const CodeBlock = ({ code, title }) => (
  <div style={{
    borderRadius: "12px",
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.1)",
    overflow: "hidden",
    marginTop: "8px",
  }}>
    <div style={{
      padding: "8px 14px",
      background: "rgba(255,255,255,0.04)",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", gap: "8px",
    }}>
      <div style={{ display: "flex", gap: "5px" }}>
        {["#FF6058","#FEBC2E","#28C840"].map(c => (
          <div key={c} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c }}/>
        ))}
      </div>
      <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{title}</span>
    </div>
    <pre style={{
      padding: "14px",
      fontFamily: "monospace",
      fontSize: "9px",
      color: "rgba(255,255,255,0.65)",
      overflowX: "auto",
      lineHeight: 1.7,
      whiteSpace: "pre-wrap",
      margin: 0,
    }}>{code.trim()}</pre>
  </div>
);

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function NightRitual() {
  const [tab, setTab] = useState("ritual");        // ritual | meditation | architecture
  const [habitat, setHabitat] = useState("forest");
  const [meditating, setMeditating] = useState(false);
  const [breathPhase, setBreathPhase] = useState("exhale");
  const [sessionSecs, setSessionSecs] = useState(0);
  const [archTab, setArchTab] = useState("persistence");

  const h = HABITATS[habitat];
  const euphoriaToday = 82;
  const dysphoriaToday = 24;
  const harmonyScore = Math.round(euphoriaToday * 0.65 + (100 - dysphoriaToday) * 0.35);

  // Breath cycle
  useEffect(() => {
    if (!meditating) return;
    const cycle = [
      { phase: "inhale", dur: 4000 },
      { phase: "hold",   dur: 4000 },
      { phase: "exhale", dur: 6000 },
    ];
    let idx = 0;
    const run = () => {
      setBreathPhase(cycle[idx].phase);
      return setTimeout(() => { idx = (idx + 1) % cycle.length; run(); }, cycle[idx].dur);
    };
    const t = run();
    return () => clearTimeout(t);
  }, [meditating]);

  // Timer
  useEffect(() => {
    if (!meditating) return;
    const t = setInterval(() => setSessionSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [meditating]);

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  // Particles
  const particles = Array.from({ length: 16 }, (_, i) => ({
    char: (h.particles + h.particles)[i % h.particles.length],
    x: (i * 23 + 7) % 90 + 5,
    y: (i * 17 + 11) % 85 + 5,
    delay: (i * 0.4) % 4,
    duration: 3 + (i % 3),
  }));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');
        @keyframes ritualPulse { 0%,100%{transform:scale(1);opacity:0.12} 50%{transform:scale(1.05);opacity:0.22} }
        @keyframes floatUp { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(8deg)} }
        @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }
        @keyframes starFloat { 0%,100%{opacity:0.06} 50%{opacity:0.18} }
        @keyframes moonrise { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes tabIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar { display:none; }
        pre { tab-size:2; }
      `}</style>

      <div style={{
        width: "390px", minHeight: "844px",
        backgroundImage: `
          radial-gradient(ellipse at 20% 5%, ${h.color}44 0%, transparent 50%),
          radial-gradient(ellipse at 80% 95%, ${h.color}28 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, #1A1428 0%, #0A0810 100%)
        `,
        fontFamily: "'Crimson Pro', serif",
        color: "rgba(255,255,255,0.88)",
        position: "relative", margin: "0 auto",
        overflow: "hidden",
        transition: "background-image 2s ease",
        paddingBottom: "80px",
      }}>

        {/* Star field */}
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {Array.from({length: 40}).map((_, i) => (
            <div key={i} style={{
              position: "absolute",
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 23 + 7) % 60}%`,
              width: `${1 + (i%3) * 0.5}px`, height: `${1 + (i%3) * 0.5}px`,
              borderRadius: "50%", background: "white",
              animation: `starFloat ${2 + (i%4)}s ease-in-out infinite`,
              animationDelay: `${(i*0.25)%4}s`,
            }}/>
          ))}
        </div>

        {/* Habitat particles */}
        {particles.map((p, i) => <FloatingParticle key={i} {...p}/>)}

        {/* Status bar */}
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>23:14</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)" }}>RITUAL NOCTURNO</span>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>◆◆◆</span>
        </div>

        {/* Main Tabs */}
        <div style={{ display: "flex", gap: "4px", margin: "14px 20px 0", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "4px", position: "relative", zIndex: 2 }}>
          {[["ritual","🌙 Ritual"],["meditation","🫁 Meditación"],["architecture","⚙️ SwiftUI"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "7px 4px", borderRadius: "9px", border: "none",
              background: tab === key ? "rgba(255,255,255,0.1)" : "transparent",
              color: tab === key ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
              fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.06em",
              cursor: "pointer", transition: "all 0.3s ease", textTransform: "uppercase",
            }}>{label}</button>
          ))}
        </div>

        {/* ─── TAB: RITUAL ─── */}
        {tab === "ritual" && (
          <div style={{ padding: "20px 20px 0", animation: "tabIn 0.4s ease" }}>

            {/* Harmony Ring + Today stats */}
            <div style={{
              padding: "20px", borderRadius: "20px",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${h.accent}22`,
              display: "flex", gap: "20px", alignItems: "center",
              marginBottom: "14px",
              boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.4)`,
            }}>
              <HarmonyRing score={harmonyScore} color={h.accent} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "13px", color: h.accent, letterSpacing: "0.1em", marginBottom: "4px" }}>
                  {harmonyScore >= 80 ? "Equilibrio Profundo" : harmonyScore >= 60 ? "Vínculo Estable" : "Tensión Latente"}
                </div>
                <p style={{ fontSize: "12px", fontStyle: "italic", color: "rgba(255,255,255,0.45)", lineHeight: 1.5, marginBottom: "14px" }}>
                  Tu día concluye con el espíritu en armonía con tu naturaleza.
                </p>
                {[
                  { label: "Euforia", val: euphoriaToday, color: "#7AC87A" },
                  { label: "Disforia", val: dysphoriaToday, color: "#C87A7A" },
                  { label: "Shifts hoy", val: 4, max: 10, color: h.accent },
                ].map(({ label, val, max = 100, color }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: "8px", color: "rgba(255,255,255,0.3)", width: "46px", textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>{label}</span>
                    <MiniBar val={val} max={max} color={color}/>
                    <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)", width: "24px", textAlign: "right" }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly trend */}
            <div style={{
              padding: "16px", borderRadius: "16px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              marginBottom: "14px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, letterSpacing: "0.15em", textTransform: "uppercase" }}>Tendencia 7 días</span>
                <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>∅ {Math.round(WEEKLY_DATA.reduce((a,b)=>a+b.harmony,0)/7)}</span>
              </div>
              <WeekChart data={WEEKLY_DATA} accent={h.accent}/>
            </div>

            {/* Habitat for tonight */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, letterSpacing: "0.15em", marginBottom: "10px", textTransform: "uppercase" }}>
                Hábitat para esta noche
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {Object.entries(HABITATS).map(([key, hab]) => (
                  <button key={key} onClick={() => setHabitat(key)} style={{
                    padding: "12px 10px", borderRadius: "14px",
                    border: `1px solid ${habitat === key ? hab.accent + "66" : "rgba(255,255,255,0.07)"}`,
                    background: habitat === key ? `${hab.color}44` : "rgba(255,255,255,0.03)",
                    cursor: "pointer", textAlign: "left",
                    transform: habitat === key ? "scale(1.02)" : "scale(1)",
                    transition: "all 0.3s ease",
                    boxShadow: habitat === key ? `0 0 16px ${hab.color}44` : "none",
                  }}>
                    <div style={{ fontSize: "20px", marginBottom: "4px" }}>{hab.emoji}</div>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: habitat === key ? hab.accent : "rgba(255,255,255,0.45)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{hab.name}</div>
                    <div style={{ fontSize: "9px", fontStyle: "italic", color: "rgba(255,255,255,0.28)", marginTop: "2px", lineHeight: 1.4 }}>{hab.desc.substring(0, 32)}...</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Begin ritual CTA */}
            <button onClick={() => setTab("meditation")} style={{
              width: "100%", padding: "14px",
              borderRadius: "14px",
              border: `1px solid ${h.accent}66`,
              background: `linear-gradient(135deg, ${h.color}88, ${h.accent}33)`,
              color: h.accent,
              fontFamily: "'Cinzel', serif", fontSize: "12px", letterSpacing: "0.25em",
              cursor: "pointer", textTransform: "uppercase",
              boxShadow: `0 0 30px ${h.color}44`,
            }}>
              🌙 Iniciar Ritual Onírico
            </button>
          </div>
        )}

        {/* ─── TAB: MEDITATION ─── */}
        {tab === "meditation" && (
          <div style={{ padding: "20px", animation: "tabIn 0.4s ease" }}>
            {/* Habitat header */}
            <div style={{
              padding: "16px", borderRadius: "16px",
              background: `${h.color}33`,
              border: `1px solid ${h.accent}33`,
              marginBottom: "20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "32px", marginBottom: "6px" }}>{h.emoji}</div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "13px", color: h.accent, letterSpacing: "0.12em" }}>{h.name}</div>
              <p style={{ fontSize: "12px", fontStyle: "italic", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>{h.desc}</p>
            </div>

            {/* Breath visualizer */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0 36px" }}>
              <BreathCircle phase={meditating ? breathPhase : "exhale"} habitatColor={h.color} habitatAccent={h.accent}/>
            </div>

            {/* Session timer */}
            {meditating && (
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontFamily: "monospace", fontSize: "32px", color: h.accent, letterSpacing: "0.1em",
                  textShadow: `0 0 20px ${h.accent}66` }}>{formatTime(sessionSecs)}</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em", marginTop: "4px", textTransform: "uppercase" }}>
                  Shift Onírico · Activo
                </div>
              </div>
            )}

            {/* Glassmorphism info card */}
            <div style={{
              padding: "16px", borderRadius: "16px",
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.12)",
              marginBottom: "16px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)",
            }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, letterSpacing: "0.15em", marginBottom: "10px", textTransform: "uppercase" }}>
                Técnica · Ciclo 4-4-6
              </div>
              {[["Inhala","4s","Llena tus pulmones, siente el pelaje"],["Sostén","4s","Mantén la forma animal en tu mente"],["Exhala","6s","Libera la tensión humana"]].map(([phase, time, desc]) => (
                <div key={phase} style={{ display: "flex", gap: "12px", alignItems: "center", padding: "6px 0",
                  borderBottom: phase !== "Exhala" ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, width: "48px" }}>{phase}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)", width: "24px" }}>{time}</div>
                  <div style={{ fontSize: "11px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{desc}</div>
                </div>
              ))}
            </div>

            <button onClick={() => { setMeditating(m => !m); if (meditating) setSessionSecs(0); }} style={{
              width: "100%", padding: "14px", borderRadius: "14px",
              border: `1px solid ${h.accent}66`,
              background: meditating
                ? "rgba(200,120,120,0.2)"
                : `linear-gradient(135deg, ${h.color}88, ${h.accent}33)`,
              color: meditating ? "#C87A7A" : h.accent,
              fontFamily: "'Cinzel', serif", fontSize: "12px", letterSpacing: "0.2em",
              cursor: "pointer", textTransform: "uppercase",
              boxShadow: meditating ? "none" : `0 0 24px ${h.color}44`,
              transition: "all 0.4s ease",
            }}>
              {meditating ? "◼ Finalizar Ritual" : "▶ Comenzar Meditación"}
            </button>
          </div>
        )}

        {/* ─── TAB: ARCHITECTURE ─── */}
        {tab === "architecture" && (
          <div style={{ padding: "20px", animation: "tabIn 0.4s ease" }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, letterSpacing: "0.15em", marginBottom: "4px", textTransform: "uppercase" }}>
              Arquitectura SwiftUI + SwiftData
            </div>
            <p style={{ fontSize: "12px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", marginBottom: "16px", lineHeight: 1.6 }}>
              Implementación lista para producción en iOS 17+
            </p>

            {/* Arch sub-tabs */}
            <div style={{ display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "3px", marginBottom: "14px" }}>
              {[["persistence","SwiftData"],["glassmorph","Glassmorphism"],["animations","Animaciones"]].map(([key,label]) => (
                <button key={key} onClick={() => setArchTab(key)} style={{
                  flex: 1, padding: "6px 4px", borderRadius: "8px", border: "none",
                  background: archTab === key ? "rgba(255,255,255,0.1)" : "transparent",
                  color: archTab === key ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                  fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.06em",
                  cursor: "pointer", transition: "all 0.3s ease", textTransform: "uppercase",
                }}>{label}</button>
              ))}
            </div>

            {/* Explanation cards */}
            {archTab === "persistence" && (
              <div style={{ animation: "tabIn 0.3s ease" }}>
                <div style={{ padding: "14px", borderRadius: "14px", background: `${h.color}22`, border: `1px solid ${h.accent}22`, marginBottom: "12px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, marginBottom: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Por qué SwiftData sobre Core Data
                  </div>
                  {[
                    ["@Model macro", "Cero boilerplate — el compilador genera NSManagedObject automáticamente"],
                    ["iCloud sync", ".cloudKitDatabase(.automatic) = sync gratis con zero config"],
                    ["fetchLimit", "CRÍTICO: siempre limitar fetches para no cargar toda la DB en RAM"],
                    ["Lazy loading", "SwiftData carga relaciones on-demand — no hay N+1 queries"],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: "10px", padding: "7px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "flex-start" }}>
                      <span style={{ color: h.accent, fontSize: "11px", flexShrink: 0 }}>◆</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px", lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <CodeBlock code={SWIFT_DOCS.persistence} title="RitualRecord.swift + PersistenceController.swift"/>
              </div>
            )}

            {archTab === "glassmorph" && (
              <div style={{ animation: "tabIn 0.3s ease" }}>
                <div style={{ padding: "14px", borderRadius: "14px", background: `${h.color}22`, border: `1px solid ${h.accent}22`, marginBottom: "12px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, marginBottom: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Capas del Glassmorphism orgánico
                  </div>
                  {[
                    [".ultraThinMaterial", "iOS aplica blur real del contenido detrás — usa GPU compositor nativo"],
                    ["tinte + opacidad", "Capa de color orgánico encima del blur, opacity 8–15% por bioma"],
                    ["strokeBorder gradient", "Borde luminoso: blanco en topLeading → transparente en bottomTrailing"],
                    ["shadow multicapa", ".shadow(radius:60) + inset highlight = profundidad real"],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: "10px", padding: "7px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "flex-start" }}>
                      <span style={{ color: h.accent, fontSize: "11px", flexShrink: 0 }}>◆</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px", lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <CodeBlock code={SWIFT_DOCS.glassmorph} title="GlassCard.swift"/>
              </div>
            )}

            {archTab === "animations" && (
              <div style={{ animation: "tabIn 0.3s ease" }}>
                <div style={{ padding: "14px", borderRadius: "14px", background: `${h.color}22`, border: `1px solid ${h.accent}22`, marginBottom: "12px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: h.accent, marginBottom: "8px", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Tres técnicas clave
                  </div>
                  {[
                    ["Canvas + TimelineView", "Partículas en 60fps sin UIKit — Canvas dibuja en GPU, TimelineView sincroniza con display refresh"],
                    ["MeshGradient iOS 18", "Fondos de hábitat que transicionan suavemente — 4 puntos de control con interpolación automática"],
                    [".animation repeatForever", "Rings de respiración — easeInOut(2.8s) crea la sensación orgánica más convincente"],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: "10px", padding: "7px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "flex-start" }}>
                      <span style={{ color: h.accent, fontSize: "11px", flexShrink: 0 }}>◆</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "rgba(255,255,255,0.7)", letterSpacing: "0.05em" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px", lineHeight: 1.5 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <CodeBlock code={SWIFT_DOCS.animations} title="ParticleCanvas.swift + HabitatBackground.swift"/>
              </div>
            )}
          </div>
        )}

        {/* Bottom nav */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "390px", padding: "12px 30px 28px",
          background: "rgba(10,8,16,0.92)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 10,
        }}>
          {[["🏠","Inicio"],["🌿","Mundo"],["🐾","Yo"],["🌙","Ritual"],["👥","Manada"]].map(([icon,label],i) => (
            <button key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
              background: "none", border: "none", cursor: "pointer",
              opacity: i === 3 ? 1 : 0.35,
            }}>
              <span style={{ fontSize: i === 3 ? "22px" : "18px" }}>{icon}</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.1em",
                color: i === 3 ? h.accent : "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
