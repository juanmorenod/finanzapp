# 💰 FinanzApp — Control de Gastos Personales

![Version](https://img.shields.io/badge/version-1.0.0-6C63FF?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Hosting%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase)
![HTML](https://img.shields.io/badge/HTML%2FJS%2FCSS-Vanilla-E34F26?style=for-the-badge&logo=html5)

Aplicación web moderna para el **control y análisis de gastos personales**. Construida con HTML, CSS y JavaScript vanilla, integrada con Firebase para autenticación con Google y sincronización en tiempo real con Cloud Firestore.

## ✨ Características

- 🔐 **Autenticación con Google** — Inicio de sesión seguro vía Firebase Auth
- ☁️ **Sincronización en tiempo real** — Los datos se guardan y actualizan en Cloud Firestore
- 📊 **Dashboard con KPIs** — Total gastado, categoría líder, cantidad y promedio de gastos
- 🍩 **Gráfico de dona** — Distribución de gastos por categoría
- 📈 **Gráfico de barras** — Gastos por día del mes o por mes del año
- 📋 **Historial completo** — Tabla con búsqueda, filtros, ordenamiento y paginación
- 🗑️ **Eliminar gastos** — Con confirmación modal
- 📱 **Responsive** — Diseño adaptable para móvil y escritorio
- 🌙 **Dark mode** — Interfaz oscura moderna con glassmorphism

## 🏗️ Estructura del Proyecto

```
finanzapp/
├── app/
│   ├── index.html                  # Estructura principal de la SPA
│   ├── app.js                      # Lógica de la app (Firebase, Firestore, UI)
│   ├── styles.css                  # Estilos (diseño oscuro, componentes)
│   ├── firebase-config.js          # ⚠️ Config local (NO incluida en Git)
│   └── firebase-config.example.js # Plantilla de configuración
├── firebase.json                   # Configuración de Firebase Hosting
├── deploy.bat                      # Script de despliegue para Windows
└── README.md
```

## 🔧 Configuración Inicial (Requerida)

> **⚠️ La clave de API de Firebase no está incluida en el repositorio por seguridad.**
> Debes configurarla localmente antes de ejecutar o desplegar la app.

### Pasos

1. Copia el archivo de ejemplo:
   ```bash
   cp app/firebase-config.example.js app/firebase-config.js
   ```
   *(En Windows: copia y renombra el archivo manualmente)*

2. Abre `app/firebase-config.js` y reemplaza los valores con los de tu proyecto:
   - Ve a [Firebase Console](https://console.firebase.google.com)
   - Selecciona tu proyecto → ⚙️ Configuración → Tus apps → SDK de Firebase
   - Copia los valores del objeto `firebaseConfig`

3. El archivo `firebase-config.js` está en `.gitignore` y **nunca se subirá al repositorio**.

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | HTML5, CSS3, JavaScript (ES Modules) |
| Autenticación | Firebase Auth (Google Sign-In) |
| Base de datos | Cloud Firestore (NoSQL, tiempo real) |
| Hosting | Firebase Hosting |
| Gráficos | Chart.js v4 |
| Fuentes | Google Fonts — Inter |

## 📦 Categorías de Gastos

- 🍽️ Comida
- 🚗 Transporte
- 💆 Cuidado personal
- 🎮 Entretenimiento
- 🎉 Salidas
- 🏠 Hogar

## 🚀 Despliegue en Firebase Hosting

### Requisitos
- Node.js instalado
- Cuenta de Google con proyecto Firebase configurado
- Archivo `app/firebase-config.js` configurado (ver sección anterior)

### Pasos
```bash
# Desplegar con el script incluido (Windows)
deploy.bat

# O manualmente:
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only hosting --project presupuesto-2bcd5
```

## 📄 Licencia

MIT — libre para uso personal y educativo.
