# AUra

AUra is a gamified fitness app for Assumption University students. It combines activity tracking, personalized AI missions, and social features to help students stay active.

## Features
- HealthKit activity tracking
- AI daily missions and weekly report cards
- Workout photo verification
- XP, levels, streaks, and badges
- Individual, 1v1, and team challenges
- Leaderboards and GPS gym check-ins
- Social feed, workout partners, and real-time chat
- Admin dashboard for users, challenges, and moderation

## Tech Stack
- **Mobile:** React Native, Expo, TypeScript, Expo Router
- **Styling and state:** NativeWind, Zustand
- **Admin:** Next.js, React, Tailwind CSS
- **Backend:** Supabase Auth, PostgreSQL, Storage, Realtime, Edge Functions
- **AI:** Claude API
- **Device:** Apple HealthKit, Expo Location, camera

## Goals
- Encourage consistent physical activity through gamification
- Personalize daily goals using recent activity and preferences
- Build a supportive campus fitness community
- Use activity data and photo checks to support verification

## Project Structure

```
Aura/
├── aura-app/     # Expo mobile app (iOS)
│   └── src/
│       ├── app/          # Expo Router screens
│       ├── components/   # Shared UI components
│       ├── store/        # Zustand stores
│       ├── lib/          # Supabase client and helpers
│       └── ...
├── aura-admin/   # Next.js admin dashboard
│   └── src/
│       ├── app/          # Admin pages
│       ├── components/
│       └── lib/
└── supabase/
    ├── migrations/   # Database schema and policies
    └── functions/    # Edge Functions
        ├── generate-daily-missions/
        ├── ai-report-card/
        ├── validate-workout/
        └── delete-account/
```
## Getting Started

### Prerequisites

- Node.js and npm
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- Xcode and an iPhone or iOS Simulator (HealthKit needs a development build, so Expo Go won't work)
- A Supabase project and an Anthropic API key

### 1. Set up the backend

```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>
supabase functions deploy generate-daily-missions
supabase functions deploy ai-report-card
supabase functions deploy validate-workout
supabase functions deploy delete-account
```

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge Functions automatically.

Sign-up only accepts `@au.edu` email addresses. A database trigger in the migrations enforces this.

### 2. Run the mobile app

Create `aura-app/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Then:

```bash
cd aura-app
npm install
npm run ios
```

### 3. Run the admin dashboard

Create `aura-admin/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Then:

```bash
cd aura-admin
npm install
npm run dev
```

Open http://localhost:3000.


## Team Members 
- Yoon Hsu Hlaing
- Myat Yadana Khin
- Bhone Myat Htut
  
