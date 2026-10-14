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

### Required Tools

Install these on your Mac before running the project:

| Tool | Version | Needed for | Install |
|------|---------|------------|---------|
| macOS | Recent version | Building the iOS app | – |
| Node.js | 20 or later (LTS recommended) | Both projects | `brew install node` |
| npm | Comes with Node.js | Installing packages | – |
| Xcode | Latest, with iOS Simulator | Mobile app | Mac App Store |
| CocoaPods | 1.15 or later | Mobile app (iOS native libraries) | `brew install cocoapods` |
| Watchman | Any | Mobile app (recommended, faster reloads) | `brew install watchman` |
| Supabase CLI | Latest | Backend only (migrations and Edge Functions) | `brew install supabase/tap/supabase` |

> **Note:** The mobile app uses HealthKit, so it does not run in Expo Go. It needs a development build made with Xcode, using the steps below.

### Dependencies

Each project installs its own packages with `npm install`. These are the main ones.

#### aura-app

| Package | Purpose |
|---------|---------|
| `expo` (SDK 56), `react-native` 0.85, `react` 19 | App framework |
| `expo-router` | Screen navigation |
| `nativewind`, `tailwindcss` | Styling |
| `zustand` | App state |
| `@supabase/supabase-js` | Database and login |
| `@kingstinct/react-native-healthkit` | Steps, calories, and workouts from Apple Health |
| `expo-location` | Gym check-in and GPS tracking |
| `expo-image-picker`, `expo-image-manipulator` | Workout photos |
| `react-native-reanimated`, `react-native-gesture-handler` | Animations and gestures |

#### aura-admin

| Package | Purpose |
|---------|---------|
| `next` 16, `react` 19 | Web framework |
| `@supabase/supabase-js`, `@supabase/ssr` | Database and admin login |
| `tailwindcss` 4 | Styling |
| `typescript` | Type checking |

The full lists are in each project's `package.json`.

### Run the Mobile App (aura-app)

**1. Install packages** (first time only):

```bash
cd aura-app
npm install
```

**2. Add environment variables.** Create a file named `aura-app/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**3. Build and run on the iOS Simulator:**

```bash
npm run ios
```

The first build takes about 5–10 minutes. It opens the app in the iPhone Simulator when done.

To run on a real iPhone, connect it with a cable and run:

```bash
npm run ios -- --device
```

Use a real iPhone to test HealthKit, because the Simulator has no real health data.

After the first build, you don't need to rebuild every time. Start the dev server and press `i` to open the app that is already installed:

```bash
npm start
```

You only need to run `npm run ios` again after adding or updating a native package.

### Run the Admin Dashboard (aura-admin)

**1. Install packages** (first time only):

```bash
cd aura-admin
npm install
```

**2. Add environment variables.** Create a file named `aura-admin/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**3. Start the dashboard:**

```bash
npm run dev
```

Then open http://localhost:3000 and log in with an account that has the admin role.

> **Tip:** To run the app and the dashboard together, use two terminal tabs. Press `Ctrl + C` in a tab to stop that one.

### Supabase Backend

Only needed when setting up a new Supabase project or changing the database or Edge Functions. Link your project, apply the database migrations, and deploy the Edge Functions:

```bash
supabase link --project-ref your-project-ref
supabase db push
supabase secrets set ANTHROPIC_API_KEY=your-key
supabase functions deploy
```

#### Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-daily-missions` | Creates personalised daily missions |
| `ai-report-card` | Generates a progress report for a user |
| `validate-workout` | Checks workout photos for anti-cheat |
| `delete-account` | Deletes a user's account and data |

## Team

| Name | GitHub |
|------|--------|
| Yoon | [@yoonfreal](https://github.com/yoonfreal) |
| Terry | [@txxrim](https://github.com/txxrim) |

Built at Assumption University.
````

## Team Members 
- Yoon Hsu Hlaing
- Myat Yadana Khin
- Bhone Myat Htut
  
