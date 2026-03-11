import { useState, useEffect, useRef } from "react";

const THERIOTIPES = {
  wolf: {
    name: "Lobo Gris",
    latin: "Canis lupus",
    emoji: "🐺",
    primary: "#7C6A52",
    accent: "#C4A882",
    glow: "#D4B896",
    bg: "from-[#1A1410] via-[#2A1F14] to-[#1C1A16]",
    card: "rgba(60,42,28,0.7)",
    border: "rgba(196,168,130,0.25)",
    traits: ["Instinto de manada", "Sentido del territorio", "Howl interior"],
    habitat: "Bosque boreal · Montaña",
    phase: "Luna creciente",
    phaseIcon: "🌒",
  },
  cat: {
    name: "Leopardo de las Nieves",
    latin: "Panthera uncia",
    emoji: "🐆",
    primary: "#6B7A5C",
    accent: "#A8B890",
    glow: "#C2D4A8",
    bg: "from-[#141A10] via-[#1A2214] to-[#161A14]",
    card: "rgba(38,52,28,0.7)",
    border: "rgba(168,184,144,0.25)",
    traits: ["Sigilo ancestral", "Vista aguda", "Independencia espiritual"],
    habitat: "Montaña alpina · Niebla",
    phase: "Alba silenciosa",
    phaseIcon: "🌅",
  },
};

const NeedBar = ({ label, value, color, icon }) => {
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    setTimeout(() => setAnimated(value), 200);
  }, [value]);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>
          {icon} {label}
        </span>
        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{value}%</span>
      </div>
      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${animated}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            borderRadius: "2px",
            transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
};

const PulseRing = ({ color }) => (
  <div style={{ position: "absolute", inset: 0, borderRadius: "50%" }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          inset: `-${i * 8}px`,
          borderRadius: "50%",
          border: `1px solid ${color}`,
          opacity: 0.15 - i * 0.04,
          animation: `pulse ${2 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
        }}
      />
    ))}
  </div>
);

const ShiftMeter = ({ value, color, glow }) => {
  const [anim, setAnim] = useState(0);
  useEffect(() => { setTimeout(() => setAnim(value), 400); }, [value]);
  const segments = 12;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: "3px" }}>
      {Array.from({ length: segments }).map((_, i) => {
        const filled = i < Math.round((anim / 100) * segments);
        return (
          <div
            key={i}
            style={{
              width: "6px",
              height: filled ? "20px" : "12px",
              borderRadius: "3px",
              background: filled ? `linear-gradient(180deg, ${glow}, ${color})` : "rgba(255,255,255,0.08)",
              boxShadow: filled ? `0 0 6px ${color}88` : "none",
              transition: `all 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 0.05}s`,
            }}
          />
        );
      })}
    </div>
  );
};

const EventCard = ({ icon, title, desc, time, accent }) => (
  <div
    style={{
      display: "flex",
      gap: "12px",
      padding: "12px",
      borderRadius: "12px",
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.07)",
      marginBottom: "8px",
    }}
  >
    <div style={{ fontSize: "20px", lineHeight: 1 }}>{icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", color: accent, letterSpacing: "0.08em" }}>{title}</div>
      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px", lineHeight: 1.4 }}>{desc}</div>
    </div>
    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{time}</div>
  </div>
);

export default function WildSoulDashboard() {
  const [active, setActive] = useState("wolf");
  const [shifting, setShifting] = useState(false);
  const [shiftIntensity, setShiftIntensity] = useState(67);
  const [euphoria, setEuphoria] = useState(74);
  const [dysphoria, setDysphoria] = useState(28);
  const [tab, setTab] = useState("identity");

  const t = THERIOTIPES[active];

  const handleShift = () => {
    setShifting(true);
    setShiftIntensity(prev => Math.min(100, prev + 15));
    setEuphoria(prev => Math.min(100, prev + 12));
    setDysphoria(prev => Math.max(0, prev - 8));
    setTimeout(() => setShifting(false), 1800);
  };

  const switchTherioType = (key) => {
    if (key === active) return;
    setActive(key);
    setShiftIntensity(Math.floor(Math.random() * 40) + 40);
    setEuphoria(Math.floor(Math.random() * 30) + 55);
    setDysphoria(Math.floor(Math.random() * 35) + 15);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.15} 50%{transform:scale(1.05);opacity:0.25} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes floatUp { 0%{transform:translateY(0)} 50%{transform:translateY(-4px)} 100%{transform:translateY(0)} }
        @keyframes shiftGlow { 0%,100%{box-shadow:0 0 20px #C4A88244} 50%{box-shadow:0 0 60px #C4A88288, 0 0 100px #C4A88222} }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #0D0B08; }
        .tab-active { background: rgba(255,255,255,0.08) !important; }
      `}</style>

      <div style={{
        width: "390px",
        minHeight: "844px",
        background: `linear-gradient(160deg, var(--bg-start), var(--bg-mid), var(--bg-end))`,
        backgroundImage: `
          radial-gradient(ellipse at 20% 10%, ${t.primary}22 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, ${t.accent}18 0%, transparent 50%),
          linear-gradient(160deg, #1A1410, #141010, #0D0B08)
        `,
        fontFamily: "'Crimson Pro', serif",
        color: "rgba(255,255,255,0.85)",
        overflow: "hidden",
        position: "relative",
        margin: "0 auto",
        paddingBottom: "80px",
      }}>

        {/* Texture overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
          opacity: 0.4,
        }} />

        {/* Status bar */}
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>9:41</span>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.2em", color: "rgba(255,255,255,0.25)" }}>WILDSOUL</span>
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>◆◆◆</span>
        </div>

        {/* Therioype switcher */}
        <div style={{ display: "flex", gap: "8px", padding: "16px 20px 0", position: "relative", zIndex: 1 }}>
          {Object.entries(THERIOTIPES).map(([key, data]) => (
            <button
              key={key}
              onClick={() => switchTherioType(key)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "12px",
                border: `1px solid ${active === key ? data.border : "rgba(255,255,255,0.07)"}`,
                background: active === key ? `${data.card}` : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "all 0.4s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "18px" }}>{data.emoji}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: active === key ? data.accent : "rgba(255,255,255,0.3)", letterSpacing: "0.1em" }}>
                  {data.name.split(" ")[0].toUpperCase()}
                </div>
                <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: "9px", fontStyle: "italic", color: "rgba(255,255,255,0.25)" }}>{data.latin}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Avatar + Shift Core */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px 20px", position: "relative", zIndex: 1 }}>
          <div style={{ position: "relative", marginBottom: "20px" }}>
            <PulseRing color={t.accent} />
            <div
              style={{
                width: "110px",
                height: "110px",
                borderRadius: "50%",
                background: `radial-gradient(circle at 35% 35%, ${t.accent}44, ${t.primary}88, ${t.primary}22)`,
                border: `2px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "52px",
                animation: shifting ? "shiftGlow 1.8s ease-in-out" : "breathe 4s ease-in-out infinite",
                boxShadow: `0 0 30px ${t.primary}44, inset 0 0 20px ${t.accent}22`,
                transition: "all 0.6s ease",
                cursor: "default",
              }}
            >
              {t.emoji}
            </div>
            {shifting && (
              <div style={{
                position: "absolute", inset: "-20px",
                borderRadius: "50%",
                background: `radial-gradient(circle, ${t.accent}33, transparent 70%)`,
                animation: "pulse 1.8s ease-out",
              }} />
            )}
          </div>

          <div style={{ textAlign: "center", marginBottom: "6px" }}>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "22px",
              fontWeight: "500",
              letterSpacing: "0.15em",
              background: `linear-gradient(135deg, ${t.glow}, ${t.accent}, ${t.primary})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundSize: "200% auto",
              animation: "shimmer 4s linear infinite",
            }}>Kael Mirkwood</h1>
            <p style={{ fontStyle: "italic", fontSize: "13px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>
              {t.phaseIcon} {t.habitat}
            </p>
          </div>

          {/* Shift intensity */}
          <div style={{
            width: "100%",
            padding: "16px",
            borderRadius: "16px",
            background: t.card,
            border: `1px solid ${t.border}`,
            backdropFilter: "blur(10px)",
            marginTop: "8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", letterSpacing: "0.15em", color: t.accent, textTransform: "uppercase" }}>
                Intensidad de Shift
              </span>
              <span style={{ fontFamily: "monospace", fontSize: "14px", color: t.glow }}>{shiftIntensity}%</span>
            </div>
            <ShiftMeter value={shiftIntensity} color={t.primary} glow={t.glow} />
            <button
              onClick={handleShift}
              style={{
                width: "100%",
                marginTop: "14px",
                padding: "10px",
                borderRadius: "10px",
                border: `1px solid ${t.accent}66`,
                background: `linear-gradient(135deg, ${t.primary}44, ${t.accent}22)`,
                color: t.glow,
                fontFamily: "'Cinzel', serif",
                fontSize: "11px",
                letterSpacing: "0.2em",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textTransform: "uppercase",
              }}
            >
              ⟡ Shift Mental
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", margin: "0 20px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "4px", position: "relative", zIndex: 1 }}>
          {[["identity", "Identidad"], ["needs", "Necesidades"], ["events", "Eventos"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={tab === key ? "tab-active" : ""}
              style={{
                flex: 1,
                padding: "7px 4px",
                borderRadius: "9px",
                border: "none",
                background: "transparent",
                color: tab === key ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                fontFamily: "'Cinzel', serif",
                fontSize: "9px",
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 0.3s ease",
                textTransform: "uppercase",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "0 20px", position: "relative", zIndex: 1 }}>

          {tab === "identity" && (
            <div>
              {/* Euforia / Disforia */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                {[
                  { label: "Euforia de Especie", value: euphoria, color: t.accent, icon: "✦" },
                  { label: "Disforia", value: dysphoria, color: "#B87878", icon: "◈" },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{
                    padding: "14px",
                    borderRadius: "14px",
                    background: t.card,
                    border: `1px solid ${t.border}`,
                    backdropFilter: "blur(8px)",
                    textAlign: "center",
                  }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", marginBottom: "8px", textTransform: "uppercase" }}>
                      {icon} {label}
                    </div>
                    <div style={{
                      fontSize: "28px",
                      fontFamily: "'Cinzel', serif",
                      color,
                      fontWeight: "600",
                      textShadow: `0 0 20px ${color}66`,
                    }}>{value}</div>
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", marginTop: "2px" }}>/ 100</div>
                  </div>
                ))}
              </div>

              {/* Rasgos */}
              <div style={{
                padding: "16px",
                borderRadius: "14px",
                background: t.card,
                border: `1px solid ${t.border}`,
                backdropFilter: "blur(8px)",
                marginBottom: "14px",
              }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: t.accent, letterSpacing: "0.15em", marginBottom: "12px", textTransform: "uppercase" }}>
                  Rasgos Activos
                </div>
                {t.traits.map((trait, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 0",
                    borderBottom: i < t.traits.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: t.accent,
                      boxShadow: `0 0 8px ${t.accent}`,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.7)" }}>{trait}</span>
                  </div>
                ))}
              </div>

              {/* Fase lunar/natural */}
              <div style={{
                padding: "14px 16px",
                borderRadius: "14px",
                background: t.card,
                border: `1px solid ${t.border}`,
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}>
                <span style={{ fontSize: "28px" }}>{t.phaseIcon}</span>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: t.accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>Ciclo Natural</div>
                  <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", marginTop: "2px" }}>{t.phase}</div>
                  <div style={{ fontSize: "11px", fontStyle: "italic", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>Influencia +18% en instinto</div>
                </div>
              </div>
            </div>
          )}

          {tab === "needs" && (
            <div style={{
              padding: "16px",
              borderRadius: "14px",
              background: t.card,
              border: `1px solid ${t.border}`,
              backdropFilter: "blur(8px)",
            }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: t.accent, letterSpacing: "0.15em", marginBottom: "16px", textTransform: "uppercase" }}>
                Necesidades Vitales
              </div>
              <NeedBar label="Conexión con la Naturaleza" value={82} color={t.accent} icon="🌿" />
              <NeedBar label="Expresión del Terio" value={67} color={t.glow} icon="🐾" />
              <NeedBar label="Manada / Comunidad" value={45} color="#9BB8D4" icon="🐺" />
              <NeedBar label="Descanso instintivo" value={71} color="#C4A882" icon="🌙" />
              <NeedBar label="Movimiento físico" value={58} color="#A8B890" icon="⚡" />
              <NeedBar label="Soledad restauradora" value={89} color="#B8A0C4" icon="🍃" />
            </div>
          )}

          {tab === "events" && (
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: t.accent, letterSpacing: "0.15em", marginBottom: "12px", textTransform: "uppercase" }}>
                Registro del Día
              </div>
              <EventCard icon="🌄" title="Shift Matutino" desc="Conexión fuerte al despertar. Instinto activo." time="07:22" accent={t.accent} />
              <EventCard icon="🌿" title="Tiempo en naturaleza" desc="45 min en el parque. Euforia +22pts." time="11:05" accent={t.accent} />
              <EventCard icon="😔" title="Episodio de disforia" desc="Entorno urbano intenso. Técnica de grounding aplicada." time="14:30" accent="#C49090" />
              <EventCard icon="🐾" title="Comunidad Therian" desc="Chat con la manada. Conexión +15pts." time="18:48" accent={t.accent} />
              <EventCard icon="🌙" title="Ritual nocturno" desc="Meditación de especie. Shift estable." time="21:00" accent="#9BB8C4" />
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div style={{
          position: "fixed",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "390px",
          padding: "12px 30px 28px",
          background: "rgba(13,11,8,0.92)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          zIndex: 10,
        }}>
          {[["🏠", "Inicio"], ["🌿", "Mundo"], ["🐾", "Yo"], ["🌙", "Ritual"], ["👥", "Manada"]].map(([icon, label], i) => (
            <button key={i} style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              background: "none",
              border: "none",
              cursor: "pointer",
              opacity: i === 2 ? 1 : 0.4,
            }}>
              <span style={{ fontSize: i === 2 ? "22px" : "18px" }}>{icon}</span>
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: "8px",
                letterSpacing: "0.1em",
                color: i === 2 ? t.accent : "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
