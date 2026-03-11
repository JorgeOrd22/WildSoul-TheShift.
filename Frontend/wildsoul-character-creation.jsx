import { useState, useEffect, useRef } from "react";

// ============================================================
// DATA MODEL — Clases y objetos del sistema
// ============================================================

const THERIOTIPO_BASE = {
  wolf: {
    id: "wolf", family: "Canidae", name: "Lobo", latin: "Canis lupus",
    emoji: "🐺", glyph: "ᚹ",
    palette: { primary: "#7C6A52", accent: "#C4A882", glow: "#E8D4B8", dark: "#2A1F14" },
    base_traits: {
      vínculo_manada: 85, instinto_territorial: 70, sentido_olfativo: 90,
      comunicación_vocal: 80, resistencia: 75,
    },
    shift_affinity: ["mental", "sensorial"],
    euphoria_triggers: ["luna_llena", "bosque", "manada_activa", "aullido"],
    dysphoria_triggers: ["aislamiento_forzado", "entorno_urbano_denso", "silencio_social"],
    lore: "El lobo siente el mundo como una red de vínculos. Tu identidad es inseparable de quienes te rodean.",
  },
  fox: {
    id: "fox", family: "Canidae", name: "Zorro Rojo", latin: "Vulpes vulpes",
    emoji: "🦊", glyph: "ᚠ",
    palette: { primary: "#8B5A2B", accent: "#D4884A", glow: "#F0B878", dark: "#2A1508" },
    base_traits: {
      adaptabilidad: 90, agudeza_sensorial: 85, sigilo: 80,
      curiosidad: 95, independencia: 70,
    },
    shift_affinity: ["mental", "onírico"],
    euphoria_triggers: ["amanecer", "campo_abierto", "resolución_de_acertijo", "libertad_de_movimiento"],
    dysphoria_triggers: ["rutina_rígida", "confrontación_directa", "confinamiento"],
    lore: "El zorro navega entre mundos. Tu identidad es fluidez, adaptación y la chispa de lo inesperado.",
  },
  leopard: {
    id: "leopard", family: "Felidae", name: "Leopardo", latin: "Panthera pardus",
    emoji: "🐆", glyph: "ᛚ",
    palette: { primary: "#6B5A3A", accent: "#C8A86A", glow: "#E8CC90", dark: "#201808" },
    base_traits: {
      sigilo: 95, independencia: 90, agilidad: 92,
      observación: 88, poder_solitario: 85,
    },
    shift_affinity: ["sensorial", "onírico"],
    euphoria_triggers: ["altura", "noche_estrellada", "soledad_elegida", "caza_exitosa"],
    dysphoria_triggers: ["multitudes", "ruido_constante", "dependencia_forzada"],
    lore: "El leopardo domina desde las sombras. Tu identidad es la soberanía absoluta sobre tu propio espacio.",
  },
  snow_leopard: {
    id: "snow_leopard", family: "Felidae", name: "Leopardo de Nieves", latin: "Panthera uncia",
    emoji: "❄️", glyph: "ᛁ",
    palette: { primary: "#6A7A8A", accent: "#A8C4D8", glow: "#D8EAF8", dark: "#101820" },
    base_traits: {
      misterio: 95, agilidad_en_alturas: 98, independencia: 92,
      resistencia_al_frío: 90, elusividad: 96,
    },
    shift_affinity: ["onírico", "sensorial"],
    euphoria_triggers: ["montaña", "silencio_nevado", "niebla", "alba_fría"],
    dysphoria_triggers: ["calor_extremo", "aglomeraciones", "obligaciones_sociales"],
    lore: "El fantasma de las montañas existe entre lo visible y lo invisible. Tu identidad es la frontera entre mundos.",
  },
  hawk: {
    id: "hawk", family: "Accipitridae", name: "Halcón", latin: "Falco peregrinus",
    emoji: "🦅", glyph: "ᚱ",
    palette: { primary: "#5A6A3A", accent: "#9AB870", glow: "#C4E090", dark: "#141A08" },
    base_traits: {
      visión_aguda: 98, libertad: 95, velocidad: 90,
      perspectiva_elevada: 92, precisión: 88,
    },
    shift_affinity: ["mental", "sensorial"],
    euphoria_triggers: ["cielo_abierto", "viento", "altura", "velocidad", "claridad_mental"],
    dysphoria_triggers: ["espacios_cerrados", "pensamiento_lento", "niebla_mental"],
    lore: "El halcón ve lo que otros no pueden. Tu identidad es la claridad absoluta y la libertad sin límites.",
  },
  mammoth: {
    id: "mammoth", family: "Elephantidae", name: "Mamut Lanudo", latin: "Mammuthus primigenius",
    emoji: "🦣", glyph: "ᚦ",
    palette: { primary: "#5A4A3A", accent: "#A08870", glow: "#C8B090", dark: "#181410" },
    base_traits: {
      memoria_ancestral: 98, fortaleza: 95, sabiduría: 90,
      conexión_con_el_pasado: 96, protección: 88,
    },
    shift_affinity: ["onírico", "mental"],
    euphoria_triggers: ["tierra_fría", "recuerdos_vívidos", "sueños_ancestrales", "solsticio"],
    dysphoria_triggers: ["olvido", "cambio_abrupto", "desconexión_de_raíces"],
    lore: "El mamut camina entre épocas. Tu identidad trasciende el tiempo — eres memoria viva de lo que fue.",
  },
};

const SHIFT_TYPES = {
  mental: {
    id: "mental", name: "Mental", icon: "🧠",
    desc: "Pensamientos, perspectiva y forma de procesar el mundo como tu animal.",
    color: "#9AB8D8",
    questions_weight: { Q1: 0.4, Q2: 0.2, Q3: 0.4 },
  },
  sensorial: {
    id: "sensorial", name: "Sensorial", icon: "👁️",
    desc: "Sensaciones físicas: olfato intensificado, visión periférica, percepción táctil.",
    color: "#C4A882",
    questions_weight: { Q1: 0.2, Q2: 0.5, Q3: 0.3 },
  },
  onírico: {
    id: "onírico", name: "Onírico", icon: "🌙",
    desc: "Sueños vívidos con forma animal, viajes astrales y visiones en estados alterados.",
    color: "#B890C8",
    questions_weight: { Q1: 0.3, Q2: 0.2, Q3: 0.5 },
  },
};

const GEAR_CATALOG = {
  masks: [
    { id: "mask_wolf", name: "Máscara de Lobo", emoji: "🐺", rarity: "common", euphoria_mod: 8, shift_boost: { mental: 5 } },
    { id: "mask_fox", name: "Máscara de Zorro", emoji: "🦊", rarity: "common", euphoria_mod: 7, shift_boost: { mental: 4, onírico: 3 } },
    { id: "mask_feline", name: "Máscara Felina", emoji: "🐆", rarity: "uncommon", euphoria_mod: 10, shift_boost: { sensorial: 6 } },
    { id: "mask_bird", name: "Máscara de Ave", emoji: "🦅", rarity: "uncommon", euphoria_mod: 9, shift_boost: { mental: 7 } },
  ],
  tails: [
    { id: "tail_wolf", name: "Cola de Lobo", emoji: "🐾", rarity: "common", euphoria_mod: 12, shift_boost: { sensorial: 8 } },
    { id: "tail_fox", name: "Cola de Zorro", emoji: "🍂", rarity: "common", euphoria_mod: 10, shift_boost: { onírico: 6 } },
    { id: "tail_snow", name: "Cola Nevada", emoji: "❄️", rarity: "rare", euphoria_mod: 15, shift_boost: { sensorial: 10, onírico: 5 } },
  ],
  collars: [
    { id: "collar_bone", name: "Collar de Hueso", emoji: "🦴", rarity: "common", euphoria_mod: 6, shift_boost: { mental: 3 } },
    { id: "collar_stone", name: "Piedra Rúnica", emoji: "🪨", rarity: "uncommon", euphoria_mod: 9, shift_boost: { mental: 5, onírico: 4 } },
    { id: "collar_feather", name: "Pluma Sagrada", emoji: "🪶", rarity: "rare", euphoria_mod: 14, shift_boost: { onírico: 9, mental: 5 } },
  ],
  totems: [
    { id: "totem_moon", name: "Tótem Lunar", emoji: "🌕", rarity: "rare", euphoria_mod: 18, shift_boost: { onírico: 12, mental: 6 } },
    { id: "totem_forest", name: "Tótem del Bosque", emoji: "🌲", rarity: "uncommon", euphoria_mod: 12, shift_boost: { sensorial: 8, mental: 4 } },
    { id: "totem_sun", name: "Tótem Solar", emoji: "☀️", rarity: "uncommon", euphoria_mod: 11, shift_boost: { mental: 7, sensorial: 4 } },
    { id: "totem_ancestral", name: "Espíritu Ancestral", emoji: "🔮", rarity: "legendary", euphoria_mod: 25, shift_boost: { onírico: 15, mental: 10, sensorial: 8 } },
  ],
};

const INTROSPECTION_QUESTIONS = [
  {
    id: "Q1",
    text: "Cuando caminas por un espacio natural, ¿qué es lo primero que notas?",
    options: [
      { text: "Los sonidos y su significado", shift: "mental", vínculo: 3 },
      { text: "Los olores, texturas y temperatura", shift: "sensorial", vínculo: 4 },
      { text: "Una sensación de pertenencia difícil de describir", shift: "onírico", vínculo: 5 },
      { text: "Las rutas de escape y los puntos elevados", shift: "mental", vínculo: 3 },
    ],
  },
  {
    id: "Q2",
    text: "¿Cómo describes tu experiencia de therianthropy más intensa?",
    options: [
      { text: "Mi mente procesa el mundo como mi animal lo haría", shift: "mental", vínculo: 5 },
      { text: "Siento sensaciones físicas: garras, pelaje, colmillos", shift: "sensorial", vínculo: 5 },
      { text: "En sueños o meditación me convierto completamente", shift: "onírico", vínculo: 5 },
      { text: "Una combinación que varía según el contexto", shift: "mental", vínculo: 4 },
    ],
  },
  {
    id: "Q3",
    text: "¿Cuándo sientes mayor euforia de especie?",
    options: [
      { text: "Al resolver problemas con instinto puro", shift: "mental", vínculo: 4 },
      { text: "Al usar gear o ropa que expresa mi terio", shift: "sensorial", vínculo: 3 },
      { text: "Al despertar de un sueño con forma animal", shift: "onírico", vínculo: 5 },
      { text: "Al conectar con otros therians que comparten mi especie", shift: "mental", vínculo: 4 },
    ],
  },
];

// ============================================================
// COMPONENTES UI
// ============================================================

const RARITY_COLOR = { common: "#A8A890", uncommon: "#90B890", rare: "#9090D8", legendary: "#D8A840" };

const StepIndicator = ({ total, current, accent }) => (
  <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        height: "3px",
        width: i === current ? "28px" : "10px",
        borderRadius: "2px",
        background: i <= current ? accent : "rgba(255,255,255,0.12)",
        transition: "all 0.4s ease",
        boxShadow: i === current ? `0 0 8px ${accent}88` : "none",
      }} />
    ))}
  </div>
);

const ParticleField = ({ color }) => {
  const particles = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random() * 100, y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 4,
    duration: Math.random() * 3 + 3,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: "50%",
          background: color,
          opacity: 0.15,
          animation: `floatParticle ${p.duration}s ease-in-out infinite`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
};

const GearCard = ({ item, selected, onSelect, accent }) => (
  <div
    onClick={() => onSelect(item)}
    style={{
      padding: "12px",
      borderRadius: "14px",
      border: `1px solid ${selected ? accent + "88" : "rgba(255,255,255,0.08)"}`,
      background: selected ? `${accent}18` : "rgba(255,255,255,0.03)",
      cursor: "pointer",
      transition: "all 0.3s ease",
      textAlign: "center",
      transform: selected ? "scale(1.03)" : "scale(1)",
      boxShadow: selected ? `0 0 20px ${accent}33` : "none",
    }}
  >
    <div style={{ fontSize: "26px", marginBottom: "6px" }}>{item.emoji}</div>
    <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: selected ? accent : "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.3 }}>
      {item.name}
    </div>
    <div style={{ marginTop: "6px", fontSize: "9px", color: RARITY_COLOR[item.rarity], fontStyle: "italic" }}>
      {item.rarity}
    </div>
    <div style={{ marginTop: "6px", fontSize: "10px", color: "rgba(255,255,255,0.3)" }}>
      +{item.euphoria_mod} euforia
    </div>
  </div>
);

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function WildSoulCreation() {
  const [step, setStep] = useState(0);   // 0=intro 1=theriotipo 2=quiz 3=gear 4=summary
  const [selected, setSelected] = useState({
    theriotipo: null,
    q_answers: [],
    gear: { mask: null, tail: null, collar: null, totem: null },
    name: "",
  });
  const [quizStep, setQuizStep] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [finalProfile, setFinalProfile] = useState(null);

  const t = selected.theriotipo ? THERIOTIPO_BASE[selected.theriotipo] : null;
  const palette = t?.palette || { primary: "#7C6A52", accent: "#C4A882", glow: "#E8D4B8", dark: "#2A1F14" };

  const transitionStep = (next) => {
    setRevealing(true);
    setTimeout(() => { setStep(next); setRevealing(false); }, 400);
  };

  // Calcular perfil final
  const computeProfile = () => {
    const base = THERIOTIPO_BASE[selected.theriotipo];
    const shiftScores = { mental: 0, sensorial: 0, onírico: 0 };
    let vínculos = 60;

    selected.q_answers.forEach(a => {
      shiftScores[a.shift] += 2;
      vínculos += a.vínculo;
    });

    // Gear modifiers
    const gearList = Object.values(selected.gear).filter(Boolean);
    let euphoriaMod = 0;
    gearList.forEach(g => {
      euphoriaMod += g.euphoria_mod;
      Object.entries(g.shift_boost || {}).forEach(([type, val]) => {
        shiftScores[type] += val;
      });
    });

    // Dominant shift
    const dominantShift = Object.entries(shiftScores).sort((a, b) => b[1] - a[1])[0][0];

    const profile = {
      theriotipo: base,
      vínculo: Math.min(100, vínculos),
      euphoria_base: Math.min(100, 50 + euphoriaMod),
      dysphoria_base: Math.max(0, 40 - euphoriaMod * 0.5),
      shift_dominant: dominantShift,
      shift_scores: shiftScores,
      gear: selected.gear,
      traits: base.base_traits,
      name: selected.name || "Alma Salvaje",
    };
    setFinalProfile(profile);
  };

  useEffect(() => {
    if (step === 4) computeProfile();
  }, [step]);

  const bgStyle = {
    backgroundImage: `
      radial-gradient(ellipse at 15% 15%, ${palette.primary}28 0%, transparent 55%),
      radial-gradient(ellipse at 85% 85%, ${palette.accent}18 0%, transparent 55%),
      linear-gradient(160deg, ${palette.dark}, #0D0B08, #111010)
    `,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeOut { from{opacity:1;transform:translateY(0)} to{opacity:0;transform:translateY(-16px)} }
        @keyframes shimmer { 0%{background-position:200%} 100%{background-position:-200%} }
        @keyframes floatParticle { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-12px) scale(1.2)} }
        @keyframes glyphSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes pulse { 0%,100%{opacity:0.2} 50%{opacity:0.5} }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar { display:none; }
      `}</style>

      <div style={{
        width: "390px", minHeight: "844px",
        ...bgStyle,
        fontFamily: "'Crimson Pro', serif",
        color: "rgba(255,255,255,0.88)",
        position: "relative",
        margin: "0 auto",
        overflow: "hidden",
      }}>
        <ParticleField color={palette.accent} />

        <div style={{
          opacity: revealing ? 0 : 1,
          transform: revealing ? "translateY(12px)" : "translateY(0)",
          transition: "all 0.4s ease",
          position: "relative", zIndex: 1,
          minHeight: "844px",
          display: "flex", flexDirection: "column",
        }}>

          {/* ── STEP 0: INTRO ── */}
          {step === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", textAlign: "center" }}>
              <div style={{ fontSize: "72px", marginBottom: "16px", animation: "breathe 3s ease-in-out infinite" }}>🌿</div>
              <h1 style={{
                fontFamily: "'Cinzel', serif", fontSize: "28px", fontWeight: "500",
                letterSpacing: "0.2em", marginBottom: "6px",
                background: `linear-gradient(135deg, ${palette.glow}, ${palette.accent})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>WILDSOUL</h1>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.3em", color: "rgba(255,255,255,0.3)", marginBottom: "36px" }}>THE SHIFT · CHARACTER ORIGIN</p>
              <p style={{ fontSize: "16px", fontStyle: "italic", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: "40px", maxWidth: "280px" }}>
                "Este no es un avatar. Es el reflejo de algo que ya existe dentro de ti."
              </p>
              <div style={{ width: "100%", marginBottom: "16px" }}>
                <div style={{ fontSize: "12px", fontFamily: "'Cinzel', serif", letterSpacing: "0.12em", color: palette.accent, marginBottom: "8px", textTransform: "uppercase" }}>Tu nombre en la manada</div>
                <input
                  value={selected.name}
                  onChange={e => setSelected(s => ({ ...s, name: e.target.value }))}
                  placeholder="Escribe tu nombre..."
                  maxLength={24}
                  style={{
                    width: "100%", padding: "12px 16px",
                    borderRadius: "12px",
                    border: `1px solid ${palette.accent}44`,
                    background: "rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.88)",
                    fontFamily: "'Crimson Pro', serif", fontSize: "16px",
                    outline: "none", textAlign: "center",
                  }}
                />
              </div>
              <button onClick={() => transitionStep(1)} style={{
                width: "100%", padding: "14px",
                borderRadius: "14px",
                border: `1px solid ${palette.accent}66`,
                background: `linear-gradient(135deg, ${palette.primary}66, ${palette.accent}33)`,
                color: palette.glow,
                fontFamily: "'Cinzel', serif", fontSize: "12px", letterSpacing: "0.2em",
                cursor: "pointer", textTransform: "uppercase",
                boxShadow: `0 0 24px ${palette.primary}44`,
              }}>
                ⟡ Comenzar el Origen
              </button>
            </div>
          )}

          {/* ── STEP 1: THERIOTIPO SELECTION ── */}
          {step === 1 && (
            <div style={{ padding: "20px 20px 40px", flex: 1 }}>
              <div style={{ padding: "14px 0 20px", textAlign: "center" }}>
                <StepIndicator total={4} current={0} accent={palette.accent} />
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "16px", letterSpacing: "0.2em", marginTop: "16px", color: palette.glow }}>ELIGE TU THERIOTIPO</h2>
                <p style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>¿Con qué especie resuena tu alma?</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {Object.values(THERIOTIPO_BASE).map(tipo => {
                  const isSelected = selected.theriotipo === tipo.id;
                  return (
                    <div
                      key={tipo.id}
                      onClick={() => setSelected(s => ({ ...s, theriotipo: tipo.id }))}
                      style={{
                        padding: "16px 12px",
                        borderRadius: "16px",
                        border: `1px solid ${isSelected ? tipo.palette.accent + "88" : "rgba(255,255,255,0.08)"}`,
                        background: isSelected ? `${tipo.palette.primary}44` : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        transition: "all 0.35s ease",
                        transform: isSelected ? "scale(1.03)" : "scale(1)",
                        boxShadow: isSelected ? `0 0 24px ${tipo.palette.primary}44` : "none",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "32px", marginBottom: "6px" }}>{tipo.emoji}</div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", color: isSelected ? tipo.palette.glow : "rgba(255,255,255,0.6)", letterSpacing: "0.08em" }}>{tipo.name}</div>
                      <div style={{ fontSize: "10px", fontStyle: "italic", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>{tipo.latin}</div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: "18px", color: isSelected ? tipo.palette.accent : "rgba(255,255,255,0.15)", marginTop: "6px" }}>{tipo.glyph}</div>
                      {isSelected && (
                        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", marginTop: "8px", lineHeight: 1.5, fontStyle: "italic" }}>
                          {tipo.lore.substring(0, 60)}...
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {selected.theriotipo && (
                <div style={{ marginTop: "16px", padding: "14px", borderRadius: "14px", background: `${palette.primary}33`, border: `1px solid ${palette.accent}33` }}>
                  <p style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, textAlign: "center" }}>
                    {THERIOTIPO_BASE[selected.theriotipo].lore}
                  </p>
                </div>
              )}

              <button
                onClick={() => selected.theriotipo && transitionStep(2)}
                style={{
                  width: "100%", marginTop: "20px", padding: "13px",
                  borderRadius: "12px",
                  border: `1px solid ${selected.theriotipo ? palette.accent + "66" : "rgba(255,255,255,0.1)"}`,
                  background: selected.theriotipo ? `linear-gradient(135deg, ${palette.primary}66, ${palette.accent}33)` : "rgba(255,255,255,0.04)",
                  color: selected.theriotipo ? palette.glow : "rgba(255,255,255,0.25)",
                  fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.2em",
                  cursor: selected.theriotipo ? "pointer" : "default", textTransform: "uppercase",
                  transition: "all 0.3s ease",
                }}
              >
                Continuar →
              </button>
            </div>
          )}

          {/* ── STEP 2: INTROSPECTION QUIZ ── */}
          {step === 2 && (
            <div style={{ padding: "20px 20px 40px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <StepIndicator total={4} current={1} accent={palette.accent} />
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "15px", letterSpacing: "0.2em", marginTop: "16px", color: palette.glow }}>CUESTIONARIO DE VÍNCULO</h2>
                <p style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
                  {quizStep + 1} / {INTROSPECTION_QUESTIONS.length}
                </p>
              </div>

              {quizStep < INTROSPECTION_QUESTIONS.length ? (
                <div style={{ flex: 1, animation: "fadeIn 0.4s ease" }} key={quizStep}>
                  <div style={{
                    padding: "20px",
                    borderRadius: "16px",
                    background: `${palette.primary}33`,
                    border: `1px solid ${palette.accent}33`,
                    marginBottom: "20px",
                  }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: palette.accent, letterSpacing: "0.15em", marginBottom: "10px" }}>
                      PREGUNTA {quizStep + 1}
                    </div>
                    <p style={{ fontSize: "16px", lineHeight: 1.6, color: "rgba(255,255,255,0.85)" }}>
                      {INTROSPECTION_QUESTIONS[quizStep].text}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {INTROSPECTION_QUESTIONS[quizStep].options.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSelected(s => ({ ...s, q_answers: [...s.q_answers, opt] }));
                          if (quizStep < INTROSPECTION_QUESTIONS.length - 1) {
                            setQuizStep(q => q + 1);
                          } else {
                            transitionStep(3);
                          }
                        }}
                        style={{
                          padding: "14px 16px",
                          borderRadius: "12px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.04)",
                          color: "rgba(255,255,255,0.75)",
                          fontFamily: "'Crimson Pro', serif", fontSize: "14px",
                          cursor: "pointer", textAlign: "left",
                          transition: "all 0.25s ease",
                          lineHeight: 1.5,
                          display: "flex", alignItems: "center", gap: "12px",
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = `${palette.primary}44`;
                          e.currentTarget.style.borderColor = `${palette.accent}66`;
                          e.currentTarget.style.color = "rgba(255,255,255,0.95)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                          e.currentTarget.style.color = "rgba(255,255,255,0.75)";
                        }}
                      >
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", color: palette.accent, flexShrink: 0 }}>
                          {["Ⅰ", "Ⅱ", "Ⅲ", "Ⅳ"][i]}
                        </span>
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* ── STEP 3: GEAR SELECTION ── */}
          {step === 3 && (
            <div style={{ padding: "20px 20px 40px", flex: 1 }}>
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <StepIndicator total={4} current={2} accent={palette.accent} />
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "15px", letterSpacing: "0.2em", marginTop: "16px", color: palette.glow }}>GEAR DE EXPRESIÓN</h2>
                <p style={{ fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>Elige lo que te hace sentir tú</p>
              </div>

              {[
                { key: "mask", label: "Máscara", items: GEAR_CATALOG.masks },
                { key: "tail", label: "Cola", items: GEAR_CATALOG.tails },
                { key: "collar", label: "Collar", items: GEAR_CATALOG.collars },
                { key: "totem", label: "Tótem", items: GEAR_CATALOG.totems },
              ].map(({ key, label, items }) => (
                <div key={key} style={{ marginBottom: "20px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: palette.accent, letterSpacing: "0.15em", marginBottom: "10px", textTransform: "uppercase" }}>
                    {label}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: "8px" }}>
                    {items.map(item => (
                      <GearCard
                        key={item.id} item={item} accent={palette.accent}
                        selected={selected.gear[key]?.id === item.id}
                        onSelect={g => setSelected(s => ({ ...s, gear: { ...s.gear, [key]: g } }))}
                      />
                    ))}
                  </div>
                </div>
              ))}

              <button
                onClick={() => transitionStep(4)}
                style={{
                  width: "100%", marginTop: "8px", padding: "13px",
                  borderRadius: "12px",
                  border: `1px solid ${palette.accent}66`,
                  background: `linear-gradient(135deg, ${palette.primary}66, ${palette.accent}33)`,
                  color: palette.glow,
                  fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.2em",
                  cursor: "pointer", textTransform: "uppercase",
                }}
              >
                Forjar Perfil →
              </button>
            </div>
          )}

          {/* ── STEP 4: FINAL SUMMARY ── */}
          {step === 4 && finalProfile && (
            <div style={{ padding: "20px 20px 40px", flex: 1, animation: "fadeIn 0.6s ease" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <StepIndicator total={4} current={3} accent={palette.accent} />
                <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: "15px", letterSpacing: "0.2em", marginTop: "16px", color: palette.glow }}>PERFIL FORJADO</h2>
              </div>

              {/* Avatar summary */}
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{
                  width: "88px", height: "88px", borderRadius: "50%", margin: "0 auto 12px",
                  background: `radial-gradient(circle at 35% 35%, ${palette.accent}44, ${palette.primary}88)`,
                  border: `2px solid ${palette.accent}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "40px",
                  boxShadow: `0 0 30px ${palette.primary}44`,
                }}>{finalProfile.theriotipo.emoji}</div>
                <h3 style={{ fontFamily: "'Cinzel', serif", fontSize: "20px", color: palette.glow, letterSpacing: "0.15em" }}>
                  {selected.name || "Alma Salvaje"}
                </h3>
                <p style={{ fontSize: "12px", fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>
                  {finalProfile.theriotipo.name} · {finalProfile.theriotipo.latin}
                </p>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                {[
                  { label: "Vínculo", value: finalProfile.vínculo, color: palette.accent },
                  { label: "Euforia", value: finalProfile.euphoria_base, color: "#9AB870" },
                  { label: "Disforia", value: Math.round(finalProfile.dysphoria_base), color: "#B87878" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{
                    padding: "12px 8px", borderRadius: "12px",
                    background: `${palette.primary}33`,
                    border: `1px solid ${palette.accent}22`,
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: "22px", fontFamily: "'Cinzel', serif", color, fontWeight: "600" }}>{value}</div>
                    <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Dominant shift */}
              <div style={{
                padding: "14px 16px", borderRadius: "14px", marginBottom: "14px",
                background: `${palette.primary}33`, border: `1px solid ${palette.accent}33`,
                display: "flex", alignItems: "center", gap: "14px",
              }}>
                <span style={{ fontSize: "28px" }}>{SHIFT_TYPES[finalProfile.shift_dominant].icon}</span>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: palette.accent, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                    Shift Dominante
                  </div>
                  <div style={{ fontSize: "16px", color: "rgba(255,255,255,0.85)", marginTop: "2px" }}>
                    {SHIFT_TYPES[finalProfile.shift_dominant].name}
                  </div>
                  <div style={{ fontSize: "11px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    {SHIFT_TYPES[finalProfile.shift_dominant].desc}
                  </div>
                </div>
              </div>

              {/* Gear summary */}
              <div style={{
                padding: "14px", borderRadius: "14px", marginBottom: "20px",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: palette.accent, letterSpacing: "0.15em", marginBottom: "10px", textTransform: "uppercase" }}>
                  Gear Equipado
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {Object.values(selected.gear).filter(Boolean).map(g => (
                    <span key={g.id} style={{
                      padding: "4px 10px", borderRadius: "20px",
                      background: `${palette.primary}44`,
                      border: `1px solid ${palette.accent}33`,
                      fontSize: "12px", color: "rgba(255,255,255,0.7)",
                    }}>
                      {g.emoji} {g.name}
                    </span>
                  ))}
                  {Object.values(selected.gear).filter(Boolean).length === 0 && (
                    <span style={{ fontSize: "12px", fontStyle: "italic", color: "rgba(255,255,255,0.3)" }}>Sin gear equipado</span>
                  )}
                </div>
              </div>

              <button style={{
                width: "100%", padding: "14px",
                borderRadius: "14px",
                border: `1px solid ${palette.accent}88`,
                background: `linear-gradient(135deg, ${palette.primary}88, ${palette.accent}44)`,
                color: palette.glow,
                fontFamily: "'Cinzel', serif", fontSize: "12px", letterSpacing: "0.25em",
                cursor: "pointer", textTransform: "uppercase",
                boxShadow: `0 0 30px ${palette.primary}66`,
              }}>
                ⟡ Entrar al Mundo
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
