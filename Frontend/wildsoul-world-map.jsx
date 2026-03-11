import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════
// SWIFT ARCHITECTURE REFERENCE — embedded as annotated data
// ═══════════════════════════════════════════════════════════════

const SWIFT_ARCH = {

clustering: `// ── CLUSTERING: MKClusterAnnotation ──────────────────────────
// SwiftUI MapKit no tiene clustering nativo aún (iOS 17).
// Usamos el bridge UIViewRepresentable con MKMapView clásico
// para acceder a MKClusterAnnotation.

class PackPointAnnotation: NSObject, MKAnnotation {
    let coordinate: CLLocationCoordinate2D
    let packId:     String
    let therioType: String
    let memberCount: Int
    var clusteringIdentifier: String? { "packPoint" }  // ← CLAVE
    // Al asignar el mismo identifier, MapKit agrupa automáticamente
    // los annotations cercanos en un MKClusterAnnotation
    init(_ point: PackPoint) {
        self.coordinate  = CLLocationCoordinate2D(
            latitude: point.lat, longitude: point.lon)
        self.packId      = point.packId
        self.therioType  = point.therioType
        self.memberCount = point.memberCount
    }
}

// ── Renderer de clusters ──────────────────────────────────────
func mapView(_ mapView: MKMapView,
             viewFor annotation: MKAnnotation) -> MKAnnotationView? {
    switch annotation {

    case let cluster as MKClusterAnnotation:
        // Cluster de múltiples manadas
        let view = mapView.dequeueReusableAnnotationView(
            withIdentifier: "cluster",
            for: cluster) as? ClusterAnnotationView
            ?? ClusterAnnotationView(annotation: cluster, reuseIdentifier: "cluster")
        let count = cluster.memberAnnotations.count
        view.configure(count: count, dominantType: dominantTherioType(cluster))
        return view

    case let pack as PackPointAnnotation:
        // Marcador individual
        let view = mapView.dequeueReusableAnnotationView(
            withIdentifier: "pack",
            for: pack) as? PackAnnotationView
            ?? PackAnnotationView(annotation: pack, reuseIdentifier: "pack")
        view.configure(pack)
        return view

    default: return nil
    }
}

// ── Caching: solo cargar marcadores del viewport ─────────────
// NUNCA cargar todos los marcadores. Usar la región visible:
func loadVisiblePackPoints(region: MKCoordinateRegion) async {
    let bbox = BoundingBox(region)
    // GET /api/v1/pack/points?minLat=&maxLat=&minLon=&maxLon=&limit=200
    let points = try await api.fetchPackPoints(bbox: bbox, limit: 200)
    
    await MainActor.run {
        // Remover annotations fuera del viewport
        let toRemove = mapView.annotations.filter { ann in
            guard let p = ann as? PackPointAnnotation else { return false }
            return !bbox.contains(p.coordinate)
        }
        mapView.removeAnnotations(toRemove)
        
        // Agregar solo los nuevos
        let existing = Set(mapView.annotations
            .compactMap { ($0 as? PackPointAnnotation)?.packId })
        let toAdd = points
            .filter { !existing.contains($0.packId) }
            .map    { PackPointAnnotation($0) }
        mapView.addAnnotations(toAdd)
    }
}

// ── Throttle de región: evitar llamadas en cada scroll ───────
var regionChangeTask: Task<Void, Never>?

func mapView(_ mapView: MKMapView, regionDidChangeAnimated: Bool) {
    regionChangeTask?.cancel()
    regionChangeTask = Task {
        try? await Task.sleep(for: .milliseconds(500)) // debounce 500ms
        guard !Task.isCancelled else { return }
        await loadVisiblePackPoints(region: mapView.region)
    }
}`,

instinct: `// ── MODO INSTINTO: Metal Shader + ColorMatrix ────────────────
// Dos técnicas según el theriotipo:
// • Lobo/Cánido: visión dicromática (sin rojo, azules/amarillos)
// • Felino:      visión nocturna (alto contraste, verde oscuro)
// • Ave rapaz:   visión UV (ultravioleta, colores vibrantes)

// TÉCNICA 1: SwiftUI .colorMultiply (simple, iOS 16+)
// Aplicar sobre el UIViewRepresentable del mapa
MapViewRepresentable(...)
    .colorMultiply(instinctColor)
    .saturation(instinctSaturation)
    .contrast(instinctContrast)
    .animation(.easeInOut(duration: 1.2), value: instinctMode)

// Valores por theriotipo:
var instinctColor: Color {
    switch therioType {
    case "wolf":    return Color(red: 0.7, green: 0.85, blue: 1.0)  // azul-amarillo
    case "leopard": return Color(red: 0.4, green: 0.9,  blue: 0.5)  // verde nocturno
    case "hawk":    return Color(red: 1.0, green: 0.7,  blue: 1.1)  // UV simulation
    default:        return .white
    }
}

// TÉCNICA 2: Metal Shader (iOS 17+, más potente)
// Shader aplicado directamente al layer del mapa
struct TherioVisionShader: View {
    var therioType: String
    
    var body: some View {
        MapViewRepresentable()
            .layerEffect(
                ShaderLibrary.therioVision(
                    .float(therioTypeIndex),
                    .float(intensity)
                ),
                maxSampleOffset: .zero
            )
    }
}

// En WildSoul.metal:
[[stitchable]] half4 therioVision(
    float2 position,
    half4  color,
    float  therioIndex,
    float  intensity
) {
    half4 result = color;
    if (therioIndex == 0) {         // Wolf: dichromatic
        half luminance = dot(color.rgb, half3(0.299, 0.587, 0.114));
        result.r = luminance * 0.3 * half(intensity);
        result.g = luminance * 0.9;
        result.b = luminance * 1.1;
    } else if (therioIndex == 1) {  // Leopard: night vision
        half lum = dot(color.rgb, half3(0.2, 0.7, 0.1));
        result = half4(0, lum * 1.4 * half(intensity), 0, color.a);
    } else if (therioIndex == 2) {  // Hawk: UV enhanced
        result.r = color.b * half(intensity);
        result.b = color.r * half(intensity);
    }
    return mix(color, result, half(intensity));
}`,

geofencing: `// ── GEOFENCING con CoreLocation ──────────────────────────────
// CLLocationManager puede monitorear hasta 20 regiones simultáneas.
// Estrategia: detectar parques/bosques con dos enfoques combinados.

// ── Enfoque 1: Regiones fijas (manadas conocidas) ─────────────
class GeofenceManager: NSObject, CLLocationManagerDelegate {
    private let locationManager = CLLocationManager()
    private let harmonyService  = HarmonyService.shared
    
    func setupNatureZones(_ zones: [NatureZone]) {
        // Limpiar regiones anteriores
        locationManager.monitoredRegions.forEach {
            locationManager.stopMonitoring(for: $0)
        }
        // Registrar nuevas (máx 20)
        zones.prefix(20).forEach { zone in
            let region = CLCircularRegion(
                center: zone.coordinate,
                radius: zone.radiusMeters,   // ej: 500m para un parque
                identifier: zone.id
            )
            region.notifyOnEntry = true
            region.notifyOnExit  = true
            locationManager.startMonitoring(for: region)
        }
    }
    
    // ENTRADA a zona natural → euforia boost
    func locationManager(_ manager: CLLocationManager,
                         didEnterRegion region: CLRegion) {
        guard let zone = NatureZoneCache.find(region.identifier) else { return }
        
        Task {
            // Aplicar euphoria boost al perfil
            await harmonyService.applyEuphoriaEvent(
                type:      .nature_entry,
                zoneType:  zone.type,           // .forest, .park, .mountain
                boost:     zone.euphoriaBoost,  // ej: +15 puntos
                message:   "Entraste a \\(zone.name) 🌿"
            )
            // Push notification local (no requiere internet)
            scheduleLocalNotification(zone: zone)
        }
    }
    
    func locationManager(_ manager: CLLocationManager,
                         didExitRegion region: CLRegion) {
        // Opcional: reducir boost gradualmente al salir
    }
    
    // ── Notification local ─────────────────────────────────
    private func scheduleLocalNotification(zone: NatureZone) {
        let content = UNMutableNotificationContent()
        content.title = "Euforia de Especie +\\(zone.euphoriaBoost)"
        content.body  = "Tu instinto se intensifica en \\(zone.name)"
        content.sound = .default
        content.categoryIdentifier = "NATURE_ENTRY"
        
        let request = UNNotificationRequest(
            identifier: "nature_\\(zone.id)_\\(Date().timeIntervalSince1970)",
            content:    content,
            trigger:    nil   // inmediato
        )
        UNUserNotificationCenter.current().add(request)
    }
}

// ── Enfoque 2: Significant Location Changes ──────────────────
// Para detectar parques no predefinidos, usamos la API de MapKit
// para geocoding inverso cuando el usuario se mueve significativamente.

func locationManager(_ manager: CLLocationManager,
                     didUpdateLocations locations: [CLLocation]) {
    guard let loc = locations.last,
          loc.horizontalAccuracy < 100 else { return }  // ignorar GPS impreciso
    
    // Solo procesar si cambió >200m desde última verificación
    guard distanceFromLastCheck(loc) > 200 else { return }
    lastCheckedLocation = loc
    
    Task {
        let geocoder = CLGeocoder()
        let placemarks = try await geocoder.reverseGeocodeLocation(loc)
        
        // Detectar si estamos en área natural
        if let pm = placemarks.first {
            let isNatural = detectNatureFromPlacemark(pm)
            // areasOfInterest puede incluir "Parque Nacional", "Reserva", etc.
            if isNatural {
                await harmonyService.applyPassiveNatureBonus(intensity: isNatural.intensity)
            }
        }
    }
}

private func detectNatureFromPlacemark(_ pm: CLPlacemark) -> NatureDetection? {
    let keywords = ["park", "forest", "parque", "bosque", "mountain",
                    "montaña", "nature", "naturaleza", "reserve", "reserva",
                    "national", "nacional", "wildlife", "lago", "lake"]
    let text = [pm.name, pm.locality, pm.areasOfInterest?.joined()]
        .compactMap { $0 }.joined(separator: " ").lowercased()
    
    return keywords.contains(where: text.contains) 
        ? NatureDetection(intensity: 0.8) : nil
}`
};

// ═══════════════════════════════════════════════════════════════
// VISUAL DATA
// ═══════════════════════════════════════════════════════════════

const THERIOTIPO_MAP_CONFIG = {
  wolf:  { color: "#7C6A52", accent: "#C4A882", glow: "#E8D4B8", habitatColor: "rgba(124,106,82,0.25)", label: "Zonas de Manada", icon: "🐺" },
  snow:  { color: "#4A6A8A", accent: "#90C4E8", glow: "#C8E8F8", habitatColor: "rgba(74,106,138,0.2)",  label: "Zonas Alpinas",   icon: "❄️" },
  hawk:  { color: "#5A6A3A", accent: "#9AB870", glow: "#C4E090", habitatColor: "rgba(90,106,58,0.2)",   label: "Zonas de Altura",  icon: "🦅" },
};

// Simulated pack points (in real app: from API /pack/points?bbox=)
const PACK_POINTS_RAW = [
  { id:"p1",  lat:40.710, lng:-74.010, type:"wolf",  name:"Northern Pack",       members:14, harmony:82, activity:"high"   },
  { id:"p2",  lat:40.725, lng:-73.985, type:"wolf",  name:"Urban Wolves",        members:8,  harmony:67, activity:"medium" },
  { id:"p3",  lat:40.695, lng:-74.025, type:"wolf",  name:"River Sentinels",     members:22, harmony:91, activity:"high"   },
  { id:"p4",  lat:40.740, lng:-74.000, type:"snow",  name:"Peak Leopards",       members:5,  harmony:88, activity:"low"    },
  { id:"p5",  lat:40.715, lng:-73.960, type:"hawk",  name:"Sky Watchers",        members:11, harmony:75, activity:"medium" },
  { id:"p6",  lat:40.700, lng:-73.970, type:"wolf",  name:"Forest Edge Pack",    members:18, harmony:79, activity:"high"   },
  { id:"p7",  lat:40.730, lng:-74.015, type:"snow",  name:"Shadow Cats",         members:7,  harmony:94, activity:"medium" },
  { id:"p8",  lat:40.745, lng:-73.975, type:"hawk",  name:"Thermal Riders",      members:9,  harmony:71, activity:"low"    },
  { id:"p9",  lat:40.705, lng:-74.040, type:"wolf",  name:"Midnight Howlers",    members:31, harmony:86, activity:"high"   },
  { id:"p10", lat:40.755, lng:-73.990, type:"wolf",  name:"Old Growth Pack",     members:12, harmony:78, activity:"medium" },
  { id:"p11", lat:40.720, lng:-74.030, type:"snow",  name:"Alpine Ghosts",       members:4,  harmony:97, activity:"low"    },
  { id:"p12", lat:40.688, lng:-73.995, type:"hawk",  name:"Updraft Clan",        members:16, harmony:83, activity:"high"   },
];

// Nature zones (geofence targets)
const NATURE_ZONES = [
  { id:"nz1", lat:40.700, lng:-74.010, name:"Bosque Centenario",  radius:600,  boost:18, type:"forest"   },
  { id:"nz2", lat:40.735, lng:-73.975, name:"Reserva del Norte",  radius:800,  boost:22, type:"reserve"  },
  { id:"nz3", lat:40.755, lng:-74.020, name:"Parque de la Niebla",radius:400,  boost:15, type:"park"     },
];

// Habitat overlay zones (wolf territory, alpine zones, etc.)
const HABITAT_ZONES = [
  { id:"h1", cx:40.703, cy:-74.018, rx:0.018, ry:0.012, type:"wolf",  opacity:0.18 },
  { id:"h2", cx:40.728, cy:-74.000, rx:0.012, ry:0.010, type:"wolf",  opacity:0.14 },
  { id:"h3", cx:40.742, cy:-73.985, rx:0.010, ry:0.008, type:"snow",  opacity:0.16 },
  { id:"h4", cx:40.715, cy:-73.962, rx:0.008, ry:0.010, type:"hawk",  opacity:0.15 },
];

// ═══════════════════════════════════════════════════════════════
// SPATIAL CLUSTERING (pure JS — mirrors Swift MKClusterAnnotation logic)
// ═══════════════════════════════════════════════════════════════
function clusterPoints(points, zoom) {
  const cellSize = zoom < 1.5 ? 0.03 : zoom < 2.5 ? 0.018 : 0.01;
  const cells = {};
  points.forEach(p => {
    const key = `${Math.floor(p.lat / cellSize)}_${Math.floor(p.lng / cellSize)}`;
    if (!cells[key]) cells[key] = [];
    cells[key].push(p);
  });
  return Object.values(cells).map(group => {
    if (group.length === 1) return { ...group[0], cluster: false, count: 1 };
    const avgLat = group.reduce((s, p) => s + p.lat, 0) / group.length;
    const avgLng = group.reduce((s, p) => s + p.lng, 0) / group.length;
    const dominant = group.sort((a, b) => b.members - a.members)[0];
    return { id: `cluster_${group[0].id}`, lat: avgLat, lng: avgLng,
      cluster: true, count: group.length, type: dominant.type,
      totalMembers: group.reduce((s, p) => s + p.members, 0),
      avgHarmony: Math.round(group.reduce((s, p) => s + p.harmony, 0) / group.length),
      points: group };
  });
}

// Lat/Lng → SVG pixel (Mercator approximation for small area)
function toPixel(lat, lng, bounds, w, h) {
  const x = (lng - bounds.minLng) / (bounds.maxLng - bounds.minLng) * w;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * h;
  return { x, y };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

const INSTINCT_MODES = {
  normal:  { label: "Normal",           filter: "none",                                      overlayColor: "transparent",           saturation: 1 },
  wolf:    { label: "Instinto Cánido",  filter: "saturate(0.3) hue-rotate(180deg) brightness(1.1)", overlayColor: "rgba(70,110,180,0.15)", saturation: 0.4 },
  leopard: { label: "Visión Nocturna",  filter: "saturate(0.2) brightness(0.7) contrast(1.4)", overlayColor: "rgba(0,80,20,0.35)",  saturation: 0.1 },
  hawk:    { label: "Visión UV",        filter: "hue-rotate(60deg) saturate(2.2) contrast(1.2)", overlayColor: "rgba(120,0,180,0.12)", saturation: 2.2 },
};

const MapTile = ({ x, y, w, h, instinct }) => {
  // Simplified map tiles as colored grid (represents real MapKit tiles)
  const cells = useMemo(() => {
    const arr = [];
    const cols = 8, rows = 10;
    const colors = ["#2A3820","#1E2A18","#243222","#1C2416","#283C1C","#222E1A","#1E2814","#2E3C22"];
    const roadColors = ["#3A4030","#323828","#2E3824"];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isRoad = (r === 3 || r === 7 || c === 2 || c === 5);
        arr.push({ r, c, color: isRoad ? roadColors[r % 3] : colors[(r * cols + c) % colors.length] });
      }
    }
    return arr;
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {/* Base map grid */}
      {cells.map(({ r, c, color }) => (
        <div key={`${r}-${c}`} style={{
          position: "absolute",
          left:   `${(c / 8) * 100}%`,
          top:    `${(r / 10) * 100}%`,
          width:  `${100 / 8}%`,
          height: `${100 / 10}%`,
          background: color,
          border: "0.5px solid rgba(0,0,0,0.15)",
        }}/>
      ))}
      {/* Water body */}
      <div style={{ position:"absolute", left:"60%", top:"70%", width:"40%", height:"30%",
        background:"rgba(20,40,80,0.5)", borderRadius:"40% 20% 0 30%" }}/>
      {/* Green areas */}
      <div style={{ position:"absolute", left:"5%", top:"5%", width:"35%", height:"40%",
        background:"rgba(40,70,20,0.4)", borderRadius:"30% 50% 40% 20%" }}/>
      <div style={{ position:"absolute", left:"55%", top:"20%", width:"20%", height:"25%",
        background:"rgba(30,60,15,0.35)", borderRadius:"50%" }}/>
    </div>
  );
};

const PackMarker = ({ point, px, isSelected, onSelect, instinct, therioConfig }) => {
  const cfg = THERIOTIPO_MAP_CONFIG[point.type] || THERIOTIPO_MAP_CONFIG.wolf;
  const actColor = point.activity === "high" ? "#7AC87A" : point.activity === "medium" ? "#C4A882" : "#7A9AC8";

  if (point.cluster) {
    return (
      <div
        onClick={() => onSelect(point)}
        style={{
          position: "absolute",
          left: `${px.x}px`, top: `${px.y}px`,
          transform: "translate(-50%, -50%)",
          cursor: "pointer",
          zIndex: 10,
        }}
      >
        <div style={{
          width: `${28 + Math.min(point.count * 4, 20)}px`,
          height: `${28 + Math.min(point.count * 4, 20)}px`,
          borderRadius: "50%",
          background: `radial-gradient(circle at 35% 35%, ${cfg.accent}88, ${cfg.color})`,
          border: `2px solid ${cfg.accent}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 0 16px ${cfg.color}88, 0 0 32px ${cfg.color}44`,
          fontSize: "11px",
          fontFamily: "'Cinzel', serif",
          color: "#fff",
          fontWeight: "600",
          animation: "clusterPulse 3s ease-in-out infinite",
        }}>
          {point.count}
        </div>
        <div style={{
          position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)",
          width: "6px", height: "6px", borderRadius: "50%",
          background: actColor, boxShadow: `0 0 6px ${actColor}`,
        }}/>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(point)}
      style={{
        position: "absolute",
        left: `${px.x}px`, top: `${px.y}px`,
        transform: "translate(-50%, -100%)",
        cursor: "pointer",
        zIndex: isSelected ? 20 : 8,
        filter: instinct !== "normal" ? "brightness(1.4) contrast(1.2)" : "none",
      }}
    >
      <div style={{
        width: "32px", height: "32px", borderRadius: "50% 50% 50% 0",
        transform: "rotate(-45deg)",
        background: `radial-gradient(circle at 35% 35%, ${cfg.accent}88, ${cfg.color}cc)`,
        border: `1.5px solid ${isSelected ? cfg.glow : cfg.accent + "88"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: isSelected
          ? `0 0 20px ${cfg.accent}, 0 0 40px ${cfg.color}88`
          : `0 0 8px ${cfg.color}66`,
        transition: "all 0.3s ease",
      }}>
        <span style={{ transform: "rotate(45deg)", fontSize: "14px" }}>{cfg.icon}</span>
      </div>
      {/* Activity dot */}
      <div style={{
        position: "absolute", top: "0", right: "0",
        width: "8px", height: "8px", borderRadius: "50%",
        background: actColor, border: "1px solid rgba(0,0,0,0.3)",
        boxShadow: `0 0 6px ${actColor}`,
      }}/>
    </div>
  );
};

const NatureZoneMarker = ({ zone, px }) => (
  <div style={{
    position: "absolute",
    left: `${px.x}px`, top: `${px.y}px`,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  }}>
    <div style={{
      width: `${zone.radius * 0.12}px`,
      height: `${zone.radius * 0.12}px`,
      borderRadius: "50%",
      border: "1px dashed rgba(122,200,122,0.5)",
      background: "rgba(50,120,50,0.08)",
      boxShadow: "0 0 20px rgba(100,200,80,0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "16px",
    }}>🌿</div>
  </div>
);

const HabitatZone = ({ zone, bounds, w, h }) => {
  const cfg = THERIOTIPO_MAP_CONFIG[zone.type] || THERIOTIPO_MAP_CONFIG.wolf;
  const center = toPixel(zone.cx, zone.cy, bounds, w, h);
  const rx = (zone.rx / (bounds.maxLng - bounds.minLng)) * w;
  const ry = (zone.ry / (bounds.maxLat - bounds.minLat)) * h;
  return (
    <ellipse
      cx={center.x} cy={center.y} rx={rx} ry={ry}
      fill={cfg.habitatColor}
      stroke={cfg.accent} strokeWidth="0.8"
      strokeDasharray="4 3"
      style={{ opacity: zone.opacity * 1.5 }}
    />
  );
};

const PackDetailPanel = ({ point, therioConfig, onClose }) => {
  if (!point) return null;
  const cfg = THERIOTIPO_MAP_CONFIG[point.type] || THERIOTIPO_MAP_CONFIG.wolf;
  return (
    <div style={{
      position: "absolute", bottom: "80px", left: "12px", right: "12px",
      borderRadius: "20px",
      background: "rgba(10,8,14,0.92)",
      backdropFilter: "blur(24px)",
      border: `1px solid ${cfg.accent}44`,
      padding: "16px",
      boxShadow: `0 -4px 40px ${cfg.color}44`,
      zIndex: 30,
      animation: "slideUp 0.35s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${cfg.accent}44, ${cfg.color}88)`,
            border: `1.5px solid ${cfg.accent}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px",
          }}>{cfg.icon}</div>
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: "14px", color: cfg.glow, letterSpacing: "0.08em" }}>
              {point.cluster ? `${point.count} Manadas` : point.name}
            </div>
            <div style={{ fontSize: "11px", fontStyle: "italic", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
              {point.cluster ? `${point.totalMembers} miembros · armonía ∅ ${point.avgHarmony}` : `${point.members} miembros`}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "18px", lineHeight: 1 }}>×</button>
      </div>

      {!point.cluster && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            {[
              { label: "Armonía", value: point.harmony, color: point.harmony > 80 ? "#7AC87A" : cfg.accent },
              { label: "Miembros", value: point.members, color: cfg.accent },
              { label: "Actividad", value: point.activity === "high" ? "Alta" : point.activity === "medium" ? "Media" : "Baja",
                color: point.activity === "high" ? "#7AC87A" : point.activity === "medium" ? "#C4A882" : "#7A9AC8" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center", padding: "8px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: "14px", color, fontWeight: "600" }}>{value}</div>
                <div style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
          <button style={{
            width: "100%", padding: "10px",
            borderRadius: "12px",
            border: `1px solid ${cfg.accent}66`,
            background: `linear-gradient(135deg, ${cfg.color}66, ${cfg.accent}33)`,
            color: cfg.glow, fontFamily: "'Cinzel', serif", fontSize: "11px",
            letterSpacing: "0.2em", cursor: "pointer", textTransform: "uppercase",
          }}>
            ⟡ Solicitar Unión
          </button>
        </>
      )}

      {point.cluster && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {point.points?.slice(0,4).map(p => (
            <div key={p.id} style={{ padding: "4px 10px", borderRadius: "20px", background: `${cfg.color}33`, border: `1px solid ${cfg.accent}33`, fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
              {p.name}
            </div>
          ))}
          {point.points?.length > 4 && (
            <div style={{ padding: "4px 10px", borderRadius: "20px", background: "rgba(255,255,255,0.05)", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
              +{point.points.length - 4} más
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SwiftCodePanel = ({ section, accent }) => {
  const code = SWIFT_ARCH[section];
  return (
    <div style={{ padding: "12px 16px", animation: "tabIn 0.3s ease" }}>
      <div style={{
        borderRadius: "14px", background: "rgba(0,0,0,0.7)",
        border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden",
      }}>
        <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: "8px" }}>
          {["#FF6058","#FEBC2E","#28C840"].map(c => <div key={c} style={{ width: "9px", height: "9px", borderRadius: "50%", background: c }}/>)}
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "rgba(255,255,255,0.35)", marginLeft: "4px" }}>
            {section === "clustering" ? "MapClusterManager.swift" : section === "instinct" ? "InstinctModeShader.swift" : "GeofenceManager.swift"}
          </span>
        </div>
        <pre style={{
          padding: "14px", fontFamily: "monospace", fontSize: "9px",
          color: "rgba(255,255,255,0.7)", overflowX: "auto",
          lineHeight: 1.65, whiteSpace: "pre-wrap", margin: 0,
          maxHeight: "380px", overflowY: "auto",
        }}>{code.trim()}</pre>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function WorldMapView() {
  const [tab, setTab] = useState("map");
  const [instinct, setInstinct] = useState("normal");
  const [zoom, setZoom] = useState(2);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showHabitats, setShowHabitats] = useState(true);
  const [therioFilter, setTherioFilter] = useState("all");
  const [archSection, setArchSection] = useState("clustering");
  const [userLat, setUserLat] = useState(40.718);
  const [userLng, setUserLng] = useState(-73.998);
  const [euphoriaEvent, setEuphoriaEvent] = useState(null);
  const mapRef = useRef(null);

  const MAP_W = 350, MAP_H = 460;

  const bounds = {
    minLat: 40.680, maxLat: 40.760,
    minLng: -74.050, maxLng: -73.950,
  };

  const instinctCfg = INSTINCT_MODES[instinct];
  const activeTherioConfig = THERIOTIPO_MAP_CONFIG[instinct !== "normal" ? instinct : "wolf"];

  // Filter and cluster pack points
  const filteredPoints = useMemo(() => {
    return PACK_POINTS_RAW.filter(p => therioFilter === "all" || p.type === therioFilter);
  }, [therioFilter]);

  const clusteredPoints = useMemo(() => clusterPoints(filteredPoints, zoom), [filteredPoints, zoom]);

  // Simulate geofence trigger when user moves near nature zone
  useEffect(() => {
    const nearZone = NATURE_ZONES.find(z => {
      const dlat = Math.abs(userLat - z.lat);
      const dlng = Math.abs(userLng - z.lng);
      return Math.sqrt(dlat*dlat + dlng*dlng) < 0.008;
    });
    if (nearZone) {
      setEuphoriaEvent(nearZone);
      const t = setTimeout(() => setEuphoriaEvent(null), 3500);
      return () => clearTimeout(t);
    }
  }, [userLat, userLng]);

  const handleMapClick = (e) => {
    if (!mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const lng = bounds.minLng + (px / MAP_W) * (bounds.maxLng - bounds.minLng);
    const lat = bounds.minLat + (1 - py / MAP_H) * (bounds.maxLat - bounds.minLat);
    setUserLat(lat);
    setUserLng(lng);
    setSelectedPoint(null);
  };

  const userPx = toPixel(userLat, userLng, bounds, MAP_W, MAP_H);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');
        @keyframes clusterPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes tabIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes euphoriaPop { 0%{transform:translateY(0) scale(0.8);opacity:0} 20%{transform:translateY(-8px) scale(1.05);opacity:1} 80%{transform:translateY(-8px) scale(1);opacity:1} 100%{transform:translateY(-20px) scale(0.9);opacity:0} }
        @keyframes userPulse { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.15)} }
        @keyframes geofenceRing { 0%,100%{opacity:0.3} 50%{opacity:0.7} }
        * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar{display:none;}
      `}</style>

      <div style={{
        width: "390px", minHeight: "844px",
        background: "linear-gradient(160deg, #0D1208, #0A100C, #080A08)",
        fontFamily: "'Crimson Pro', serif",
        color: "rgba(255,255,255,0.88)",
        position: "relative", margin: "0 auto",
        overflow: "hidden",
      }}>
        {/* Status bar */}
        <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>9:41</span>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)" }}>MUNDO EXPLORABLE</span>
          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>◆◆◆</span>
        </div>

        {/* Main tabs */}
        <div style={{ display: "flex", gap: "4px", margin: "12px 16px 0", background: "rgba(255,255,255,0.05)", borderRadius: "12px", padding: "4px", zIndex: 2, position: "relative" }}>
          {[["map","🌍 Mapa"],["arch","⚙️ Arquitectura"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1, padding: "7px", borderRadius: "9px", border: "none",
              background: tab === key ? "rgba(255,255,255,0.1)" : "transparent",
              color: tab === key ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)",
              fontFamily: "'Cinzel', serif", fontSize: "9px", letterSpacing: "0.1em",
              cursor: "pointer", transition: "all 0.3s", textTransform: "uppercase",
            }}>{label}</button>
          ))}
        </div>

        {/* ─── MAP TAB ─── */}
        {tab === "map" && (
          <div style={{ position: "relative", animation: "tabIn 0.3s ease" }}>
            {/* Map container */}
            <div
              ref={mapRef}
              onClick={handleMapClick}
              style={{
                position: "relative",
                width: `${MAP_W}px`,
                height: `${MAP_H}px`,
                margin: "12px 20px 0",
                borderRadius: "20px",
                overflow: "hidden",
                cursor: "crosshair",
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Base map tiles */}
              <div style={{
                position: "absolute", inset: 0,
                filter: instinctCfg.filter,
                transition: "filter 1.2s ease",
              }}>
                <MapTile w={MAP_W} h={MAP_H} />
              </div>

              {/* Instinct overlay tint */}
              <div style={{
                position: "absolute", inset: 0,
                background: instinctCfg.overlayColor,
                transition: "background 1.2s ease",
                pointerEvents: "none", zIndex: 1,
                borderRadius: "20px",
              }}/>

              {/* SVG layer: habitat zones + geofences */}
              <svg style={{ position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none" }}
                width={MAP_W} height={MAP_H}>
                {/* Habitat overlays */}
                {showHabitats && HABITAT_ZONES.map(z => (
                  <HabitatZone key={z.id} zone={z} bounds={bounds} w={MAP_W} h={MAP_H}/>
                ))}
                {/* Geofence circles */}
                {showGeofences && NATURE_ZONES.map(z => {
                  const c = toPixel(z.lat, z.lng, bounds, MAP_W, MAP_H);
                  const r = z.radius * 0.06;
                  return (
                    <g key={z.id}>
                      <circle cx={c.x} cy={c.y} r={r}
                        fill="rgba(80,180,80,0.06)" stroke="rgba(122,200,122,0.4)"
                        strokeWidth="1" strokeDasharray="4 3"
                        style={{ animation: "geofenceRing 3s ease-in-out infinite" }}
                      />
                      <circle cx={c.x} cy={c.y} r={4}
                        fill="rgba(100,220,100,0.8)"
                        style={{ filter: "drop-shadow(0 0 4px rgba(100,220,80,0.8))" }}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Pack point markers */}
              <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
                {clusteredPoints.map(point => {
                  const px = toPixel(point.lat, point.lng, bounds, MAP_W, MAP_H);
                  return (
                    <PackMarker
                      key={point.id} point={point} px={px}
                      isSelected={selectedPoint?.id === point.id}
                      onSelect={setSelectedPoint}
                      instinct={instinct}
                      therioConfig={activeTherioConfig}
                    />
                  );
                })}
                {/* Nature zone labels */}
                {showGeofences && NATURE_ZONES.map(z => {
                  const px = toPixel(z.lat, z.lng, bounds, MAP_W, MAP_H);
                  return <NatureZoneMarker key={z.id} zone={z} px={px}/>;
                })}
              </div>

              {/* User location */}
              <div style={{
                position: "absolute",
                left: `${userPx.x}px`, top: `${userPx.y}px`,
                transform: "translate(-50%, -50%)",
                zIndex: 15,
              }}>
                {[1.8, 1.35].map((s, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    width: `${s * 16}px`, height: `${s * 16}px`,
                    borderRadius: "50%",
                    border: "1px solid rgba(100,180,255,0.5)",
                    top: "50%", left: "50%",
                    transform: `translate(-50%, -50%)`,
                    animation: `userPulse ${2 + i * 0.5}s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}/>
                ))}
                <div style={{
                  width: "14px", height: "14px", borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #90C8FF, #4090D8)",
                  border: "2px solid white",
                  boxShadow: "0 0 12px rgba(80,160,255,0.8)",
                  position: "relative", zIndex: 1,
                  animation: "userPulse 2s ease-in-out infinite",
                }}/>
              </div>

              {/* Zoom controls */}
              <div style={{
                position: "absolute", right: "12px", top: "12px",
                display: "flex", flexDirection: "column", gap: "4px", zIndex: 10,
              }}>
                {["+", "−"].map((btn, i) => (
                  <button key={btn} onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(1, Math.min(4, z + (i === 0 ? 0.5 : -0.5)))); }} style={{
                    width: "28px", height: "28px", borderRadius: "8px",
                    background: "rgba(10,8,14,0.88)", backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.7)", fontSize: "16px", fontFamily: "monospace",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{btn}</button>
                ))}
              </div>

              {/* Zoom label */}
              <div style={{
                position: "absolute", left: "12px", bottom: "12px",
                fontFamily: "'Cinzel', serif", fontSize: "9px",
                color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em",
                background: "rgba(0,0,0,0.5)", padding: "3px 8px", borderRadius: "6px",
              }}>
                ZOOM ×{zoom.toFixed(1)} · {clusteredPoints.length} marcadores
              </div>

              {/* Instinct mode label */}
              {instinct !== "normal" && (
                <div style={{
                  position: "absolute", left: "12px", top: "12px",
                  fontFamily: "'Cinzel', serif", fontSize: "9px",
                  color: activeTherioConfig.glow, letterSpacing: "0.12em",
                  background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "8px",
                  border: `1px solid ${activeTherioConfig.accent}44`,
                  textTransform: "uppercase",
                }}>
                  {instinctCfg.label}
                </div>
              )}

              {/* Geofence euphoria event */}
              {euphoriaEvent && (
                <div style={{
                  position: "absolute", top: "50%", left: "50%",
                  transform: "translate(-50%, -50%)",
                  background: "rgba(10,30,10,0.9)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(100,220,80,0.5)",
                  borderRadius: "16px", padding: "14px 20px",
                  textAlign: "center", zIndex: 20,
                  animation: "euphoriaPop 3.5s ease forwards",
                  boxShadow: "0 0 30px rgba(80,180,60,0.4)",
                }}>
                  <div style={{ fontSize: "24px", marginBottom: "4px" }}>🌿</div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", color: "#7AC87A", letterSpacing: "0.1em", textTransform: "uppercase" }}>Euforia +{euphoriaEvent.boost}</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>{euphoriaEvent.name}</div>
                </div>
              )}
            </div>

            {/* Controls row */}
            <div style={{ display: "flex", gap: "8px", padding: "10px 20px 0", overflowX: "auto" }}>
              {/* Instinct mode */}
              {Object.entries(INSTINCT_MODES).map(([key, cfg]) => (
                <button key={key} onClick={() => setInstinct(key)} style={{
                  padding: "6px 12px", borderRadius: "20px", flexShrink: 0,
                  border: `1px solid ${instinct === key ? activeTherioConfig.accent : "rgba(255,255,255,0.12)"}`,
                  background: instinct === key ? `${activeTherioConfig.color}44` : "rgba(255,255,255,0.04)",
                  color: instinct === key ? activeTherioConfig.glow : "rgba(255,255,255,0.5)",
                  fontFamily: "'Cinzel', serif", fontSize: "9px",
                  letterSpacing: "0.08em", cursor: "pointer",
                  textTransform: "uppercase", transition: "all 0.3s",
                  boxShadow: instinct === key ? `0 0 12px ${activeTherioConfig.color}44` : "none",
                }}>
                  {key === "normal" ? "👁 Normal" : key === "wolf" ? "🐺 Cánido" : key === "leopard" ? "🐆 Nocturna" : "🦅 UV"}
                </button>
              ))}
            </div>

            {/* Layer toggles */}
            <div style={{ display: "flex", gap: "8px", padding: "8px 20px 0" }}>
              {[
                { key: "habitats", label: "🗺 Hábitats", state: showHabitats, toggle: setShowHabitats },
                { key: "geofences", label: "🌿 Zonas", state: showGeofences, toggle: setShowGeofences },
              ].map(({ key, label, state, toggle }) => (
                <button key={key} onClick={() => toggle(s => !s)} style={{
                  padding: "5px 12px", borderRadius: "20px",
                  border: `1px solid ${state ? "rgba(122,200,122,0.5)" : "rgba(255,255,255,0.1)"}`,
                  background: state ? "rgba(50,120,50,0.2)" : "rgba(255,255,255,0.03)",
                  color: state ? "#7AC87A" : "rgba(255,255,255,0.35)",
                  fontFamily: "'Cinzel', serif", fontSize: "9px",
                  letterSpacing: "0.08em", cursor: "pointer", textTransform: "uppercase",
                }}>
                  {label}
                </button>
              ))}
              {/* Theriotipo filter */}
              <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
                {[["all","◈"],["wolf","🐺"],["snow","❄️"],["hawk","🦅"]].map(([key, icon]) => (
                  <button key={key} onClick={() => setTherioFilter(key)} style={{
                    width: "26px", height: "26px", borderRadius: "50%", padding: 0,
                    border: `1px solid ${therioFilter === key ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.1)"}`,
                    background: therioFilter === key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.03)",
                    fontSize: key === "all" ? "11px" : "12px", cursor: "pointer",
                    color: "rgba(255,255,255,0.7)",
                  }}>{icon}</button>
                ))}
              </div>
            </div>

            {/* Selected point panel */}
            <PackDetailPanel point={selectedPoint} therioConfig={activeTherioConfig} onClose={() => setSelectedPoint(null)}/>

            {/* Tip */}
            {!selectedPoint && (
              <p style={{ fontSize: "11px", fontStyle: "italic", color: "rgba(255,255,255,0.25)", textAlign: "center", padding: "10px 20px 0" }}>
                Toca el mapa para mover tu posición · Toca un marcador para ver la manada
              </p>
            )}
          </div>
        )}

        {/* ─── ARCHITECTURE TAB ─── */}
        {tab === "arch" && (
          <div style={{ paddingBottom: "20px", animation: "tabIn 0.3s ease" }}>
            <div style={{ display: "flex", gap: "4px", margin: "12px 16px 0", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "3px" }}>
              {[["clustering","Clustering"],["instinct","Instinct Mode"],["geofencing","Geofencing"]].map(([key, label]) => (
                <button key={key} onClick={() => setArchSection(key)} style={{
                  flex: 1, padding: "6px 4px", borderRadius: "8px", border: "none",
                  background: archSection === key ? "rgba(255,255,255,0.1)" : "transparent",
                  color: archSection === key ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)",
                  fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.06em",
                  cursor: "pointer", textTransform: "uppercase",
                }}>{label}</button>
              ))}
            </div>

            {/* Explanation cards */}
            <div style={{ padding: "10px 16px 4px" }}>
              {archSection === "clustering" && (
                <div style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(124,106,82,0.15)", border: "1px solid rgba(196,168,130,0.2)", marginBottom: "8px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "#C4A882", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Reto Técnico Resuelto
                  </div>
                  {[
                    ["clusteringIdentifier", "Misma string en todas las PackPointAnnotation → MapKit agrupa automáticamente. Zero code extra."],
                    ["Viewport-only loading", "GET /pack/points?bbox= con limit:200. Solo se cargan los marcadores visibles."],
                    ["Debounce 500ms", "regionDidChangeAnimated espera 500ms antes de fetchear. Evita 50 calls al hacer scroll."],
                    ["dequeueReusableAnnotationView", "Reutilizar vistas como UITableViewCell. Sin esto, 1000 marcadores = 1000 objetos en RAM."],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "#C4A882", fontSize: "10px", flexShrink: 0 }}>◆</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: "rgba(255,255,255,0.65)", letterSpacing: "0.05em" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px", lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {archSection === "instinct" && (
                <div style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(90,106,58,0.15)", border: "1px solid rgba(154,184,112,0.2)", marginBottom: "8px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "#9AB870", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                    Dos técnicas por complejidad
                  </div>
                  {[
                    [".colorMultiply + .saturation", "Suficiente para MVP. SwiftUI modifier puro, sin código adicional. Transición con .animation(.easeInOut(1.2))."],
                    ["Metal Shader (layerEffect)", "iOS 17+. Archivo .metal compilado en GPU. Control total por pixel. Simula dicromacia real del lobo."],
                    ["MeshGradient animado", "Halo de calor en modo hawk. Gradient de 4 puntos que oscila con TimelineView."],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "#9AB870", fontSize: "10px", flexShrink: 0 }}>◆</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: "rgba(255,255,255,0.65)" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px", lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {archSection === "geofencing" && (
                <div style={{ padding: "12px 14px", borderRadius: "14px", background: "rgba(50,100,50,0.15)", border: "1px solid rgba(122,200,122,0.2)", marginBottom: "8px" }}>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "10px", color: "#7AC87A", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
                    CoreLocation: dos enfoques
                  </div>
                  {[
                    ["CLCircularRegion (máx 20)", "Para manadas y parques conocidos. Funciona en background con app cerrada. Bajo consumo de batería."],
                    ["Geocoding inverso", "Para detectar cualquier parque. CLGeocoder.reverseGeocodeLocation() analiza areasOfInterest del placemark."],
                    ["Significant location change", "startMonitoringSignificantLocationChanges(). Solo wake-up cuando el usuario se mueve >500m. Mínima batería."],
                    ["UNNotificationRequest sin trigger", "trigger: nil = notificación inmediata al entrar. No requiere internet — es 100% local."],
                  ].map(([title, desc]) => (
                    <div key={title} style={{ display: "flex", gap: "8px", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "#7AC87A", fontSize: "10px", flexShrink: 0 }}>◆</span>
                      <div>
                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: "9px", color: "rgba(255,255,255,0.65)" }}>{title}</div>
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px", lineHeight: 1.4 }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <SwiftCodePanel section={archSection} accent="#C4A882"/>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "390px", padding: "12px 30px 28px",
          background: "rgba(8,10,8,0.94)", backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", justifyContent: "space-around", alignItems: "center", zIndex: 40,
        }}>
          {[["🏠","Inicio"],["🌿","Mundo"],["🐾","Yo"],["🌙","Ritual"],["👥","Manada"]].map(([icon,label],i) => (
            <button key={i} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
              background: "none", border: "none", cursor: "pointer", opacity: i === 1 ? 1 : 0.35,
            }}>
              <span style={{ fontSize: i === 1 ? "22px" : "18px" }}>{icon}</span>
              <span style={{
                fontFamily: "'Cinzel', serif", fontSize: "8px", letterSpacing: "0.1em",
                color: i === 1 ? "#9AB870" : "rgba(255,255,255,0.4)",
                textTransform: "uppercase",
              }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
