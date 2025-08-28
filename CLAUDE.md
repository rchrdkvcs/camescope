# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Development and build commands:
- `npm run dev` - Start the AdonisJS server with HMR enabled for development
- `npm run build` - Build the application for production
- `npm start` - Start the production server (requires build first)
- `npm test` - Run all tests using Japa test runner
- `npm run lint` - Lint the codebase using ESLint with AdonisJS config
- `npm run format` - Format code using Prettier
- `npm run typecheck` - Run TypeScript type checking without emitting files

Test suites:
- Unit tests: `tests/unit/**/*.spec(.ts|.js)` (2s timeout)
- Functional tests: `tests/functional/**/*.spec(.ts|.js)` (30s timeout)

## Architecture Overview

This is a **WebRTC streaming application** built with AdonisJS 6 backend and Vue 3 frontend using Inertia.js for seamless SPA-like experience.

### Core Components

**Backend (AdonisJS 6):**
- Full-stack Node.js framework with TypeScript
- Socket.IO server for real-time WebRTC signaling (`start/ws.ts`)
- Three main routes: `/rooms/:roomId/guest`, `/obs`, `/admin` (`start/routes.ts`)
- Session-based room management with program switching capability

**Frontend (Vue 3 + Inertia.js):**
- Three distinct views: Guest, OBS Viewer, and Admin Panel
- WebRTC peer connections for video streaming
- Socket.IO client integration via `~/composables/use_socket.ts`

**Real-time Architecture:**
- Socket.IO handles WebRTC signaling (offer/answer/ICE candidates)
- Room-based session management with program switching
- OBS integration for live streaming production

### Key Files Structure

- `start/ws.ts` - WebRTC signaling server with room management
- `start/routes.ts` - HTTP routes for three main views
- `inertia/pages/` - Vue components for Guest, OBS, and Admin interfaces
- `inertia/composables/use_socket.ts` - Socket.IO client wrapper
- `app/models/user.ts` - User authentication model
- `config/` - AdonisJS configuration files
- `adonisrc.ts` - Main application configuration

### Import Aliases

The project uses Node.js subpath imports for clean imports:
- `#controllers/*` → `./app/controllers/*.js`
- `#models/*` → `./app/models/*.js`
- `#middleware/*` → `./app/middleware/*.js`
- `#config/*` → `./config/*.js`
- `#start/*` → `./start/*.js`
- And others as defined in `package.json`

Frontend uses Vite alias: `~/` → `./inertia/`

### Development Setup

- Uses Bun as package manager (`bun.lock` present)
- Hot-reload configured for controllers and middleware
- Vite handles frontend asset bundling with Vue SFC support
- PostgreSQL database with Lucid ORM
- Session-based authentication system

### WebRTC Flow

1. **Guest** joins room via `/rooms/:roomId/guest` → emits `joinRoom`
2. **Admin** switches program via `/admin` → emits `switchProgram` 
3. **OBS** connects via `/obs` → receives guest list for current program
4. WebRTC negotiation: OBS creates offers → Guests respond with answers
5. ICE candidates exchanged for NAT traversal
6. Direct peer-to-peer video streaming established

The application manages multiple guest connections per room with dynamic program switching controlled by admin panel.
- Je lance toujours le serveur de developpement a la main