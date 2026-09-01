# ⚙️ Sameer Library - Backend & Web Portal

The core backend REST API, database ORM, authentication system, and administrative web management portal for Sameer Library.

---

## 🏗️ Tech Stack

- **Framework**: Next.js 16 (App Router + Route Handlers)
- **Database & ORM**: Prisma ORM 7 + PostgreSQL (Neon Serverless)
- **Authentication**: JWT, bcryptjs, Firebase Authentication & Google OAuth
- **Payments**: Razorpay Payment Gateway integration
- **Styling**: Tailwind CSS v4 & Vanilla Design System

---

## 📂 Backend Architecture

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema (User, Branch, Room, Seat, Booking, Payment, Attendance, Device)
│   ├── seed.ts                # Database seeder with sample branches, rooms, seats
│   └── migrations/            # Migration history
│
├── scripts/
│   └── test-db/               # Database connectivity verification scripts
│
├── src/
│   ├── app/
│   │   ├── api/               # REST API Endpoints for Mobile & Web clients
│   │   │   ├── admin/         # Admin endpoints (stats, attendance, bookings, live, rooms, students)
│   │   │   ├── attendance/    # Attendance logging & statistics
│   │   │   ├── auth/          # Authentication (login, register, google, me, logout)
│   │   │   ├── bookings/      # Seat booking creation & user bookings
│   │   │   ├── branches/      # Public branch list
│   │   │   ├── payments/      # Razorpay order creation & signature verification
│   │   │   ├── profile/       # Student profile & avatar
│   │   │   ├── rooms/         # Room details & live seat grid
│   │   │   └── seed/          # Initial DB seeding route
│   │   ├── (admin)/           # Admin Web Portal UI
│   │   ├── (auth)/            # Web Login & Registration UI
│   │   ├── (student)/         # Student Web Portal UI
│   │   └── page.tsx           # Web Landing Page
│   │
│   ├── components/            # UI Components & Theme toggles
│   ├── context/               # React Contexts
│   ├── lib/                   # Server Singletons (prisma.ts, auth.ts, firebase-admin.ts)
│   ├── types/                 # Centralized Backend TypeScript types
│   └── utils/                 # Constants, helpers, validators
│
├── .env.example               # Environment variables template
├── next.config.ts             # Next.js configuration
├── package.json               # Backend dependencies & scripts
└── tsconfig.json              # TypeScript configuration
```

---

## 🚀 Getting Started

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` is set to your PostgreSQL / Neon DB connection string.

### 2. Install Dependencies & Generate Prisma Client
```bash
npm install
npx prisma generate
```

### 3. Push Schema & Seed Database
```bash
npm run db:push
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Backend API will be running at `http://localhost:3000/api`.

---

## 🚢 Deployment (Vercel)

1. Push your repository to GitHub.
2. Import project on [Vercel](https://vercel.com).
3. Set root directory to `backend`.
4. Add all environment variables from `.env`.
5. Deploy!
