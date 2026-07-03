<div align="center">

# 🏃 3D Endless Runner

A three-lane 3D endless runner built with **React Three Fiber** and **Three.js**.

Dodge obstacles. Collect coins. Run forever.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Three.js](https://img.shields.io/badge/Three.js-r160-000000?logo=three.js)](https://threejs.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

</div>

---

## 🎮 Gameplay

<table>
  <tr><th width="200">Feature</th><th>Description</th></tr>
  <tr><td><b>3 Lanes</b></td><td>Switch between left, center, and right lanes to avoid obstacles</td></tr>
  <tr><td><b>Jump Mechanic</b></td><td>Realistic jump physics with gravity — leap over low barriers</td></tr>
  <tr><td><b>Two Obstacle Types</b></td><td><b>Pillars</b> (dodge by switching lanes) & <b>Barriers</b> (clear by jumping)</td></tr>
  <tr><td><b>Gold Coins</b></td><td>Collect spinning coins for <code>+10</code> bonus points each</td></tr>
  <tr><td><b>Ramping Difficulty</b></td><td>Speed increases from <code>10</code> → <code>30</code> — the longer you run, the harder it gets</td></tr>
  <tr><td><b>High Score</b></td><td>Best score saved to <code>localStorage</code> — beat your own record</td></tr>
</table>

---

## 🕹 Controls

### Keyboard

|       Key        |     Action      |
| :--------------: | :-------------: |
|  `←` &nbsp;or&nbsp; `A`  |   Move left     |
|  `→` &nbsp;or&nbsp; `D`  |   Move right    |
| `Space` &nbsp;or&nbsp; `↑` &nbsp;or&nbsp; `W` |     Jump        |

### Mobile

On-screen touch buttons (`◀` · `▲ JUMP` · `▶`) appear at the bottom during gameplay.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### Setup

```bash
# Clone the project
git clone <your-repo-url>
cd endless-runner

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Production Build

```bash
npm run build     # Outputs to dist/
npm run preview   # Preview the production build locally
```

---

## 📁 Project Structure

```
endless-runner/
│
├── index.html               # Entry HTML
├── package.json              # Dependencies & scripts
├── vite.config.js            # Vite configuration
│
└── src/
    ├── main.jsx              # React entry point
    ├── index.css             # Global styles (reset, full‑screen canvas)
    ├── App.jsx               # Root component
    └── Game.jsx              # 🎯 Everything — 3D scene, game loop, HUD
```

---

## 🛠 Tech Stack

<table>
  <tr><th width="220">Technology</th><th>Purpose</th></tr>
  <tr><td><a href="https://react.dev">React 18</a></td><td>Component‑based UI</td></tr>
  <tr><td><a href="https://docs.pmnd.rs/react-three-fiber">React Three Fiber</a></td><td>React renderer for Three.js</td></tr>
  <tr><td><a href="https://github.com/pmndrs/drei">@react‑three/drei</a></td><td>Helper abstractions for R3F</td></tr>
  <tr><td><a href="https://threejs.org">Three.js</a></td><td>WebGL 3D rendering engine</td></tr>
  <tr><td><a href="https://vitejs.dev">Vite 5</a></td><td>Fast dev server & bundler</td></tr>
</table>

---

## 🎨 Visual Style

| Element | Description |
| :--- | :--- |
| **Character** | Stylized geometric runner — blue body, dark‑blue legs, red cap, peach head with eyes & smile |
| **Ground** | Checkerboard green tiles with white lane dividers and yellow edge markers |
| **Obstacles** | Orange low barriers (full‑width) and red tall pillars (single lane) |
| **Coins** | Spinning golden cylinders with an emissive glow |
| **Scenery** | Procedural trees and buildings on both sides of the track |
| **Atmosphere** | Fog for depth, hemispheric sky lighting, directional sun with soft shadows |
| **Camera** | Third‑person chase cam behind and above the player |

---

## 🔧 How It Works

1. **Ground scrolling** — 16 ground segments loop endlessly to simulate forward movement.
2. **Player state** — lane position, vertical jump height, and velocity are stored in a `useRef` for zero‑lag mutation.
3. **Input queue** — keystrokes are buffered and processed each frame, so no input is ever dropped.
4. **Object lifecycle** — obstacles, coins, and scenery are spawned ahead (`z = -35`) and despawned behind the camera (`z > 10`).
5. **Collision detection** — simple AABB (axis‑aligned bounding box) checks between the player and every active obstacle.
6. **React reconciliation** — a `setRenderTick` counter triggers re‑renders so spawned/removed meshes appear in the React tree.

---
