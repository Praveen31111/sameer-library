# 📱 Sameer Library - Frontend Mobile App

A cross-platform React Native mobile application built with **Expo SDK 54**, **TypeScript**, and **SecureStore**, connecting directly with the Next.js backend (`backend/`) and PostgreSQL database.

---

## 🏗️ Mobile Frontend Architecture

```
frontend/
├── assets/                     # App icons, splash screens & brand images
├── src/
│   ├── components/             # Reusable UI Component Library
│   │   ├── common/             # UI Primitives (Button, Card, Badge, Input, StatCard, EmptyState, Loader)
│   │   ├── layout/             # Layout components (Navbar, Drawer)
│   │   └── index.ts            # Component barrel exports
│   │
│   ├── context/                # Global State Management
│   │   ├── AuthContext.tsx     # Authentication context with SecureStore persistence
│   │   └── index.ts
│   │
│   ├── hooks/                  # Custom React Native Hooks
│   │   ├── useAuth.ts          # Authentication hook
│   │   └── index.ts
│   │
│   ├── navigation/             # Navigation & Routing Definitions
│   │   ├── types.ts            # Screen name enums & navigation interfaces
│   │   └── index.ts
│   │
│   ├── screens/                # App Views & Screens
│   │   ├── HomeScreen.tsx      # Landing page with interactive seat visualizer
│   │   ├── LoginScreen.tsx     # Role-based login (Student Google Auth / Admin Credentials)
│   │   ├── RegisterScreen.tsx  # Multi-step registration
│   │   ├── StudentDashboard.tsx# Attendance logs, seat booking, active subscriptions
│   │   ├── AdminDashboard.tsx  # KPI metrics, booking approvals, branches & live seats
│   │   └── index.ts
│   │
│   ├── services/               # API & Network Layer
│   │   ├── api.ts              # Fetch client with auto IP detection & JWT header injection
│   │   ├── auth.service.ts     # Auth endpoints
│   │   ├── student.service.ts  # Attendance & booking endpoints
│   │   ├── admin.service.ts    # Admin management endpoints
│   │   └── index.ts
│   │
│   ├── types/                  # Centralized TypeScript Definitions
│   │   ├── auth.types.ts       # User, Role, Credentials types
│   │   ├── models.types.ts     # Branch, Room, Seat, Booking, Attendance types
│   │   ├── api.types.ts        # API Responses & dashboard stats
│   │   └── index.ts
│   │
│   └── utils/                  # Utilities & Constants
│       ├── constants.ts        # Theme palette, storage keys, photo presets
│       ├── formatters.ts       # Currency (₹ INR), date/time formatters, status colors
│       ├── storage.ts          # Type-safe SecureStore wrapper
│       └── index.ts
│
├── .env.example                # Environment variables template
├── app.json                    # Expo configuration
├── package.json                # Dependencies & scripts
└── tsconfig.json               # TypeScript config with @/* path aliases
```

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Expo Development Server
```bash
npx expo start
# OR from root:
npm run dev:frontend
```

### 3. Connect to Device
- Scan the displayed QR code with the **Expo Go** app on your Android or iOS phone.
- Press `a` in the terminal for Android Emulator.
- Press `w` in the terminal for Web browser preview.

---

## ⚙️ Backend Connectivity & IP Configuration

The app automatically detects your computer's local Wi-Fi IP address in development (`http://<LAN_IP>:3000/api`) so your physical phone can talk directly to your Next.js backend on the same Wi-Fi network without manual configuration!

For production builds:
1. Copy `.env.example` to `.env`.
2. Set `EXPO_PUBLIC_API_URL="https://your-production-url.com/api"`.

---

## 📦 Building for Production (APK / iOS)

Using EAS (Expo Application Services):
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```
