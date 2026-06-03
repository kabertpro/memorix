# 🎵 MEMORIX
### "Escucha, recuerda y responde"
**Kabert Studio — LMKE**

Juego web educativo musical para entrenar la memoria de notas musicales.

---

## ⚙️ Requisitos previos

- Node.js 18+
- npm 9+
- Cuenta de Firebase (ya configurada)
- Cuenta de GitHub

---

## 🚀 Instalación local

```bash
# 1. Descomprimir el ZIP y entrar a la carpeta
cd memorix

# 2. Instalar dependencias
npm install

# 3. Iniciar en modo desarrollo
npm run dev
```

Abrir en el navegador: `http://localhost:5173`

---

## 📤 Subir a GitHub

```bash
# Dentro de la carpeta memorix/
git init
git add .
git commit -m "Initial commit - MEMORIX"
git branch -M main
git remote add origin https://github.com/kabertpro/memorix.git
git push -u origin main
```

---

## 🏗️ Build para producción

```bash
npm run build
```

Genera la carpeta `dist/` lista para desplegar.

---

## 🔥 Desplegar en Firebase Hosting

```bash
# 1. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 2. Iniciar sesión
firebase login

# 3. Construir el proyecto
npm run build

# 4. Desplegar reglas de Firestore + hosting
firebase deploy
```

Tu app quedará en: `https://memorix-8d3eb.web.app`

---

## 📁 Estructura del proyecto

```
memorix/
├── src/
│   ├── components/       ← Staff, HUD, NoteButtons, StarBurst, Ranking
│   ├── screens/          ← Menu, Login, Register, Game, GameOver
│   ├── hooks/            ← useGame, useAudio
│   ├── firebase/         ← config, auth, firestore
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── firestore.rules
├── firebase.json
├── index.html
└── package.json
```

---

## 🔥 Firebase — Configuración adicional

### Activar Authentication

1. Firebase Console → Authentication → Get Started
2. Habilitar **Email/Password** provider

### Crear índice Firestore (ranking)

En Firebase Console → Firestore → Indexes:

- Collection: `scores`
- Field: `score` DESC
- Field: `__name__` DESC

---

## 🎮 Cómo se juega

1. Se muestra una nota en el pentagrama + sonido de piano
2. Tienes 2 segundos para memorizar
3. La nota se oculta
4. Selecciona la nota correcta entre los botones
5. ✅ Correcto = +10 puntos | ❌ Incorrecto = pierde una ❤️
6. 5 rondas por nivel, 7 niveles en total

---

## 🎵 Audio

Los sonidos son generados **100% por Web Audio API** del navegador.  
No se necesitan archivos de audio externos.

---

## 📄 Licencia

© 2025 Kabert Studio — LMKE. Todos los derechos reservados.
