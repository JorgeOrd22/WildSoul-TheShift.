# ᚹ WildSoul: The Shift

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![iOS](https://img.shields.io/badge/iOS-17+-black.svg?logo=apple)
![Node](https://img.shields.io/badge/Node.js-Backend-green.svg?logo=node.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue.svg?logo=postgresql)

Una aplicación de simulación de vida y bienestar diseñada exclusivamente para la comunidad Therian. WildSoul no gestiona recursos materiales, sino la identidad, la disforia/euforia de especie y la conexión con la naturaleza.

## 🌿 Arquitectura del Sistema

El proyecto sigue una arquitectura Full-Stack moderna orientada a la privacidad y el rendimiento:

- **Frontend (iOS):** SwiftUI, SwiftData (Local-first), MapKit (Clustering & Geofencing) y Metal Shaders (Instinct Mode).
- **Backend (API):** Node.js con Express usando el patrón Controller-Service-Repository.
- **Base de Datos:** PostgreSQL gestionado con Prisma ORM.
- **Caché y Tiempo Real:** Redis (Gestión de JWT y sistema Pub/Sub para manadas).

## 🚀 Instalación y Despliegue Local

### 1. Backend (Node.js)
\`\`\`bash
cd Backend_Node
npm install
# Configurar variables de entorno
cp .env.example .env
# Generar el cliente de Prisma y sincronizar BD
npx prisma generate
npx prisma db push
# Iniciar el servidor
npm run dev
\`\`\`

### 2. Frontend (iOS)
1. Abre Xcode (versión 15 o superior).
2. Abre la carpeta `Frontend_iOS`.
3. Selecciona un simulador (iOS 17+) y presiona `Cmd + R` para compilar.

## 🛡️ Privacidad y Ética
Los datos de identidad Therian se procesan localmente mediante SwiftData. El cálculo de la fórmula de "Armonía" se realiza en el servidor para evitar manipulaciones, pero el historial detallado de rituales y geolocalización de hábitats nunca se comparte con terceros.