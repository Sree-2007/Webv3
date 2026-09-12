# 🚦 DRISHTI — Smart Urban Traffic Management

> **Real-time insight. Smarter decisions. Better mobility.**

A Smart City traffic management platform built for **Smart India Hackathon (SIH) 2026**. DRISHTI combines AI-powered YOLOv8 camera simulation, adaptive traffic signal control, ambulance green-corridor priority, live hazard reporting, and hazard-aware rerouting on an interactive OpenStreetMap-backed Bengaluru city map.

---

## 📸 Overview

DRISHTI connects **Citizens**, **Ambulance Drivers**, and **Traffic Police / Control Panel Operators** in real time through a shared, synchronised dashboard. Every hazard reported, every SOS raised, and every signal change propagates instantly across all open tabs and dashboards.

---

## ✨ Features

### 👤 Citizen / Driver Portal
- **Vehicle Registration** — Sign up as Car, Bike, Cycle, Ambulance, Government, School, or Other with vehicle number
- **Hazard Reporting** — Report accidents, waterlogging, rallies, construction, potholes, or custom hazards with a **mandatory photo** and precise map location
- **AI Trust Score** — Every photo gets an instant AI-computed trust score (0–99%) based on keyword matching against the hazard type
- **Safe Route Planner** — Choose a destination and get a **hazard-aware reroute** that avoids every verified hazard on the direct path
- **Visual Route Comparison** — See both the **red "direct route"** (unsafe) and **blue "safe reroute"** with distance, ETA, and hazard count
- **Tap-to-Highlight Hazards** — Click "Avoided N hazards" to see pulsing red radar zones on exactly which hazards the AI avoided
- **Live Ambulance Warning** — Get a red toast with the **exact distance in km** whenever an ambulance SOS is raised nearby
- **Emergency SOS (Ambulance only)** — One-tap broadcast that alerts the Control Panel and opens a green corridor

### 👮 Control Panel / Traffic Police
- **4 Live YOLOv8 Camera Feeds** — Simulated intersection feeds with real-time vehicle detection (cars, bikes, buses, trucks, ambulances, pedestrians)
- **Grid & Single View** — Watch all cameras at once or zoom in on one; animations continue seamlessly between modes
- **Density-Based Adaptive Signals** — Signal green-phase duration automatically adjusts based on N/S vs E/W queue length
- **Manual Signal Override** — Toggle off AI mode to control signals manually for any junction
- **Real-Time City Map** — OpenStreetMap view showing every hazard, signal state, officer position, and ambulance location
- **Report Verification** — Verify, reject, or permanently delete citizen reports; three separate tabs (Pending / Verified / Rejected) with smooth transitions
- **Add Officer Reports** — Police can add hazards directly (auto-verified) via an inline map picker
- **Green Corridor Activation** — When an ambulance triggers SOS, a full-screen priority modal appears and cascades green signals along the route
- **SOS Emergency Log** — Every past SOS is logged with location, timestamp, and a "focus on map" button
- **AI Trust Badge** — See every citizen photo with its AI trust score; click to enlarge full-screen

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | React 18 + TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS v3 |
| **UI Components** | Custom shadcn-style components + Radix Popover |
| **Icons** | Lucide React |
| **Maps** | Leaflet + OpenStreetMap tiles |
| **Routing Engine** | OSRM (Open Source Routing Machine, no API key required) |
| **Animation** | Motion (Framer Motion successor) |
| **State** | React Context + localStorage |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18 or higher — [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn** / **pnpm**
- **Git** — [Download](https://git-scm.com/)
  
### Installation
  **Open any Terminal Such as Command Prompt/Powershell/Linux etc** 
1. **Clone the repository**
   ```bash
   git clone https://github.com/Sree-2007/Webv3.git
   cd Webv3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

That's it. No `.env` file, no API keys, no backend required — everything runs client-side.

### Building for Production

```bash
npm run build
```

The optimised bundle will be in the `dist/` folder, ready to deploy to Vercel, Netlify, GitHub Pages, or any static host.

To preview the production build locally:

```bash
npm run preview
```

---

## 🎬 How to Use — Demo Walkthrough

### 🔑 Demo Credentials

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| **Citizen / Driver** | `citizen` | `password123` | Normal car driver account |
| **Ambulance Driver** | `ambulance` | `sos123` | SOS-enabled emergency vehicle |
| **Traffic Police / Operator** | `police` | `police123` | Full control panel access |

**One-click demo login buttons are available on the auth page** for instant access.

### Scenario 1 — Citizen Reports a Hazard
1. Login as `citizen / password123`
2. Click **Report** in the header
3. Click the map to pin the hazard's exact location
4. Choose a hazard type, write a description, and **upload a photo** (required)
5. Submit — AI trust score is computed and sent to the Control Panel
6. Switch to the Police dashboard to verify it

### Scenario 2 — Reroute Around Hazards
1. Login as `citizen / password123`
2. In the Route Planner sidebar, select a destination (try **Electronic City**)
3. Click **Find Safe Route**
4. Watch both the red direct route and blue safe route render on the map
5. Click **"Avoided N hazards on this route"** to see pulsing radar rings on the avoided zones

### Scenario 3 — Ambulance SOS + Green Corridor
1. Open two browser windows side by side
2. **Window A:** Login as `ambulance / sos123`
3. **Window B:** Login as `police / police123`
4. In Window A, click **EMERGENCY SOS**
5. In Window B, a full-screen red modal appears instantly, and the green corridor cascades across all junctions
6. Both windows can dismiss the alert via the X button

### Scenario 4 — Adaptive Signals + Camera Feeds
1. Login as `police / police123`
2. Go to **Live Cameras** — watch cars queue up at red lights, pedestrians cross at zebra crossings, and ambulances get priority
3. Toggle between **Grid** and **Single** view — animation continues uninterrupted
4. Go to **Signal Control** — see N/S and E/W queue counters driving the green-light duration

---

## 📁 Project Structure

```
drishti-sih-2026/
├── public/
│   └── icons.svg
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── glass-button.tsx       # Glassmorphic button component
│   │   │   ├── help-popper.tsx        # Radix-based help menu
│   │   │   └── sonar-grid.tsx         # Animated canvas background
│   │   ├── BengaluruMap.tsx           # Leaflet map + routing
│   │   └── CameraFeed.tsx             # Canvas-based YOLOv8 simulator
│   ├── pages/
│   │   ├── LandingPage.tsx            # Marketing / entry page
│   │   ├── AuthPage.tsx               # Login + Registration
│   │   ├── CitizenDashboard.tsx       # Citizen portal
│   │   └── ControlPanel.tsx           # Police dashboard
│   ├── lib/
│   │   └── utils.ts                   # cn() helper
│   ├── App.tsx                        # Root component + Context
│   ├── demoUsers.ts                   # Demo login credentials
│   ├── types.ts                       # TypeScript interfaces
│   ├── index.css                      # Tailwind directives
│   └── main.tsx                       # Vite entry
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🔮 Future Scope

### 🔌 Backend & Real-Time
- **Node.js / FastAPI backend** with WebSocket or Socket.IO for true multi-device sync (replaces localStorage)
- **PostgreSQL + PostGIS** for persistent, geo-indexed report storage
- **JWT-based auth** with proper user management and role-based access control
- **Push notifications** via Firebase Cloud Messaging for SOS alerts and report updates

### 🤖 AI & Computer Vision
- **Real YOLOv8 integration** — swap the canvas simulator for real RTSP video streams from city cameras
- **Traffic density forecasting** — LSTM/Transformer models to predict congestion 15–30 minutes ahead
- **Automatic incident detection** — detect accidents, stopped vehicles, and wrong-way drivers from video alone
- **License plate recognition (ALPR)** — automatic flagging of stolen or blacklisted vehicles
- **Photo authenticity check** — detect fake or recycled images via perceptual hashing + reverse search

### 🗺️ Mapping & Routing
- **Real Google Maps / Mapbox** integration with traffic layer overlays
- **Turn-by-turn navigation** for citizens with voice guidance
- **Multi-modal routing** — combine metro, bus, bike-share, and walking
- **Live traffic heatmap** — visualize congestion in real time across the whole city
- **Predictive routing** — factor in time-of-day traffic patterns

### 🚑 Emergency Response
- **Automatic nearest-ambulance dispatch** — when SOS is raised, alert the closest ambulance automatically
- **Hospital integration** — notify the destination hospital of incoming patients and pre-clear the trauma bay
- **Smart signal pre-emption** — integrate with real traffic signals (not just simulation) for physical green corridors
- **Fire / Police SOS** — extend the corridor system beyond ambulances to fire engines and VIP movement

### 📱 Platform Expansion
- **Native mobile apps** (React Native / Flutter) for citizens and police
- **Voice-based reporting** for drivers (hands-free)
- **In-car integration** via Android Auto / Apple CarPlay
- **WhatsApp bot** for hazard reporting without opening the app

### 🏛️ Governance & Analytics
- **Analytics dashboard** for city planners — hotspots, peak hours, incident trends
- **Public transparency portal** — open data on traffic, accidents, and response times
- **Multi-city support** — scale to Mumbai, Delhi, Chennai with city-specific routing profiles
- **Blockchain audit trail** — tamper-proof log of every report, verification, and action taken

### 🎨 UX & Accessibility
- **Multi-language support** (Kannada, Hindi, English + regional)
- **Voice guidance** for visually impaired users
- **High-contrast mode** for outdoor sunlight visibility
- **Offline mode** with report queue that syncs when connectivity returns

---

## 🤝 Contributing

This project was built for **SIH 2026**. Contributions are welcome.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👥 Team & Credits

Built with ❤️ for **Smart India Hackathon 2026**

- **Problem Statement:** Smart Urban Traffic Management
- **Domain:** Smart Automation / Smart City
- **Category:** Software

**Special thanks to:**
- OpenStreetMap contributors
- OSRM (Open Source Routing Machine) team
- Leaflet, React, Tailwind communities
- All SIH mentors and evaluators

---

## 📞 Contact

For questions, suggestions, or demo requests:

- **GitHub Issues:** [Open an issue](https://github.com/YOUR-USERNAME/YOUR-REPO/issues)
- **Email:** your-email@example.com

---

## ⭐ Show Your Support

If this project helped you or inspired you, please give it a **star ⭐** on GitHub — it means a lot!

---

**Made for a safer, smarter, and smoother tomorrow.**
