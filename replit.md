# Solitaire Game

## Overview

This is a full-stack solitaire card game built with React, TypeScript, and Express. The application features a classic Klondike solitaire implementation with drag-and-drop gameplay, audio feedback, and a clean, responsive UI built with Tailwind CSS and Radix UI components.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development experience
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS with custom design system using CSS variables for theming
- **UI Components**: Comprehensive Radix UI component library with custom styled components
- **State Management**: Zustand for lightweight, performant state management
- **Asset Support**: GLSL shader support via vite-plugin-glsl for potential 3D features

### Backend Architecture
- **Server**: Express.js with TypeScript for the REST API
- **Module System**: ESM (ES Modules) throughout the entire application
- **Development**: Hot reload setup with Vite middleware integration
- **Routing**: Centralized route registration with error handling middleware
- **Storage Interface**: Abstracted storage layer with in-memory implementation (ready for database integration)

### Data Storage Solutions
- **Database ORM**: Drizzle ORM configured for PostgreSQL with migration support
- **Connection**: Neon Database serverless connection via @neondatabase/serverless
- **Schema**: Type-safe database schemas with Zod validation
- **Development Storage**: In-memory storage implementation for rapid prototyping

### Game Logic Architecture
- **Game State**: Immutable state management using Zustand stores
- **Card System**: Type-safe card representation with suits, ranks, and colors
- **Game Rules**: Modular game logic with functions for move validation and state transitions
- **Audio System**: Centralized audio management with mute/unmute functionality
- **Drag & Drop**: Custom drag-and-drop implementation for card movement

### External Dependencies

- **UI Framework**: React ecosystem with @react-three/fiber and @react-three/drei for potential 3D card animations
- **Database**: PostgreSQL via Neon serverless platform
- **Styling**: Tailwind CSS with PostCSS processing
- **Development**: Replit-specific error overlay and development tooling
- **Audio**: Native Web Audio API for sound effects
- **Fonts**: Inter font family via @fontsource for consistent typography