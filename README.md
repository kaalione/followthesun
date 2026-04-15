# FollowTheSun

Real-time sunny terrace finder for Stockholm. See which outdoor bars, restaurants and cafes have sunshine right now based on calculated building shadows.

## Features

- Interactive map of Stockholm with real-time shadow simulation (ShadeMap)
- 32 venue markers colored by sun/shade status (orange = sun, gray = shade)
- Time slider to check sun at any time of day
- Venue info bottom sheet with address, opening hours, and Google Maps link
- Night mode detection with next sunrise countdown
- "Only sunny" filter button
- Date picker for future days

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Web**: Next.js 15 (App Router), TypeScript strict
- **Map**: MapLibre GL JS via maplibre-gl
- **Shadows**: mapbox-gl-shadow-simulator (ShadeMap)
- **Tiles**: MapTiler Streets
- **State**: Zustand
- **UI**: Tailwind CSS v4, Framer Motion
- **Sun math**: suncalc

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Get API keys (free)

- **MapTiler**: Sign up at [maptiler.com](https://cloud.maptiler.com/account/keys/) and copy your API key
- **ShadeMap**: Get a free key at [shademap.app/about](https://shademap.app/about/)

### 3. Configure environment

```bash
cp apps/web/.env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and add your keys:

```
NEXT_PUBLIC_MAPTILER_API_KEY=your_maptiler_key
NEXT_PUBLIC_SHADEMAP_API_KEY=your_shademap_key
```

### 4. Run development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Build for production

```bash
pnpm build
```

## Project Structure

```
followthesun/
├── apps/web/                 # Next.js 15 web app
│   └── src/
│       ├── app/              # App Router pages
│       ├── components/       # Map, slider, sheet, header
│       └── store.ts          # Zustand state
├── packages/
│   ├── sun-engine/           # suncalc wrapper utilities
│   ├── venue-data/           # Stockholm venue data + types
│   ├── map-core/             # MapTiler config + constants
│   └── ui/                   # Shared React components
└── turbo.json
```

## How It Works

1. Map loads with MapLibre GL JS using MapTiler Streets tiles
2. ShadeMap overlay renders building shadows for the current time using GPU-accelerated terrain data
3. For each venue in the viewport, `isPositionInSun()` checks if the coordinate is in sun or shade
4. Venue markers update: orange circles for sun, gray for shade
5. Time slider lets you scrub through the day; ShadeMap re-renders shadows and venue statuses update

## License

MIT
