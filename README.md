# Counter-Strike 2 Tactical Simulator

A sophisticated browser-based tactical simulator for Counter-Strike 2, built with Next.js and TypeScript. This project simulates complex bot behaviors, economy management, and strategic gameplay on a 2D representation of De_Dust2.

**Version:** 0.1.0

## Features

### Core Simulation Engine
- **Advanced Bot AI**: Bots utilize a navigation mesh for movement, execute role-based behaviors (Entry Fragger, Lurker, Support), and engage in combat using realistic recoil and reaction time mechanics.
- **Vision System**: A dynamic vision system that accounts for field of view, line of sight, and environmental obstacles.
- **Physics**: Sliding collision response and realistic movement speeds based on weapon mobility.

### Strategy & Management
- **The Situation Room**: A dedicated planning interface where users can set team-wide strategies (Full Buy, Eco, Force Buy), assign tactical roles, and override individual bot behaviors before a round starts.
- **Team-Wide Buy System**: An intelligent economy manager that coordinates team spending, handles weapon drops (gifting), and projects future economy based on round outcomes.
- **Tournament Architecture**: A full seasonal system supporting Majors, Tiers 1-3, and various tournament formats (Swiss, GSL, Single Elimination).

### Analysis Tools
- **Replay System**: Review past matches with a tick-by-tick playback.
- **Heatmaps & Analytics**: Visualize player positions, kill zones, and utility usage.
- **Map Debugger**: Inspect the navigation mesh, cover points, and vision lines.

## Installation & How to Run

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun

### Setup
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Access the application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Project Structure
- `src/app`: Next.js App Router pages and layouts.
- `src/components`: React components for UI and Simulation visualization.
- `src/lib/engine`: Core simulation logic (Bots, Physics, Economy, Navigation).
- `src/data`: Map data and configuration files.

## Known Issues

### Performance
- **Simulation Lag**: Users may experience performance degradation or lag during complex rounds with many active bots. This is currently being troubleshooted and is primarily attributed to the intensive calculations required for the **Bot Vision System** (raycasting for line-of-sight checks) and pathfinding updates on every tick. Optimization efforts are ongoing to improve the simulation loop efficiency.
