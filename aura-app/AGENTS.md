# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

You are an expert React Native and Expo engineer helping me build AUra.
Write clean, simple, maintainable code. Prioritize clarity over
unnecessary abstraction.
Think like a senior mobile developer.
 
---
 
## Project Overview
 
We are building AUra, a gamified fitness tracking mobile app for
Assumption University students.
 
The app includes:
- AU student login via Google OAuth (AU email domain only)
- Activity tracking via HealthKit, with GPS as a fallback data source for students
  without a paired watch (see Activity Data Sources below)
- Gamification (XP, levels, badges, streaks)
- AI daily missions and AI report card via Claude API
- 1v1 and team challenges
- Social connection (QR code, student ID, username)
- Real-time leaderboard (overall, weekly, friends)
- Anti-cheat system (live photo + AI validation)
- Admin dashboard
 
Keep the implementation simple and readable.
 
---
 
## Tech Stack
 
- Expo (Bare Workflow — required for HealthKit)
- React Native
- TypeScript
- Expo Router
- NativeWind
- Zustand
- Supabase (auth, database, storage, realtime)
- Supabase Edge Functions (backend logic that needs a secret key — Claude calls, photo
  validation, AU email domain enforcement — no separate Node.js/Express server)
- Claude API (AI missions, report card, photo validation)
- HealthKit via @kingstinct/react-native-healthkit (fitness data — built for the New
  Architecture; react-native-health is incompatible with this project's RN version)
- expo-location (GPS — already used for gym check-in; extended to track distance/pace
  for students without a paired watch, see Activity Data Sources below)
- EAS Build + TestFlight (iOS distribution)
 
Do not introduce new major libraries unless there is a strong reason.
Ask before installing anything new.
 
---
 
## Development Philosophy
 
Build feature by feature.
For every feature:
1. Read this file first.
2. Keep the implementation simple.
3. Avoid overengineering.
4. Prefer readable code over clever code.
5. Build the smallest useful version first.
6. Refactor only when repetition appears.
 
---
 
## Decision Making
 
If something is unclear or could be improved, suggest a better
approach. If a new library would significantly help, recommend it,
explain why, and ask before adding it.
 
Do not install new libraries without approval.
 
---
 
## Architecture
 
Use this folder structure:
 
app/
  (auth)/          → login, AU email verification
  (tabs)/          → home, rank, challenges, social, profile
  admin/           → admin dashboard screens
components/        → reusable UI components
constants/         → colors, images, config values
data/              → hardcoded content, typed
hooks/             → custom hooks (useAuth, useHealthKit, useLeaderboard)
lib/               → supabase.ts, api.ts, claude.ts, healthkit.ts, cn.ts
store/             → Zustand stores
types/             → TypeScript types and interfaces
assets/            → images, fonts, icons
 
**app/** is for routes and screens only. Screens compose components and
call hooks or stores. They should not contain large reusable UI blocks
or business logic.
 
**components/** is for reusable UI. Create a component when it is
reused in multiple places, when it makes a screen easier to read, or
when it represents a clear UI concept.
Examples: MissionCard, LeaderboardRow, XPBar, ChallengeCard,
ActivityLog, BadgeItem, UserAvatar, QRModal, AIReportCard.
Do not create components too early.
 
**data/** holds hardcoded content such as badge definitions,
mission templates, level thresholds. Keep it typed.
 
**store/** holds Zustand stores.
Examples: userStore (XP, level, streak), challengeStore,
leaderboardStore, missionStore.
Persist with AsyncStorage when needed.
 
**lib/** holds external service helpers.
- supabase.ts → Supabase client (anon key only, never service key)
- api.ts → Direct Supabase calls (missions, XP, challenges, social, etc.)
- claude.ts → Calls a Supabase Edge Function, never the Claude API directly
- healthkit.ts → HealthKit permissions and data reads
- cn.ts → NativeWind utility
 
Never expose secret keys in client code.
 
---
 
## UI Rules
 
For any UI task:
- Replicate the provided design exactly.
- Match layout, spacing, padding, font sizes, font hierarchy, colors,
  border radius, shadows, alignment, and proportions.
- Do not approximate. Do not simplify unless explicitly asked.
- The app uses a dark navy theme (#1B2B4B) with gold accents (#F5B800).
 
---
 
## Styling Rules
 
Use NativeWind classes. Do not use StyleSheet unless it is not
possible to style with className.
 
Use the NativeWind version installed in this project. Check
package.json. Do not upgrade without approval.
 
Reuse class patterns through utilities in global.css.
 
### Style Exception List
 
Use StyleSheet or inline styles for:
- SafeAreaView (className not supported)
- KeyboardAvoidingView (behavior props)
- Modal (visible, transparent props)
- Animated.View (animated style values)
- Dynamic styles calculated at runtime
- Platform specific styles
- Pressable or TouchableOpacity pressed states
- Shadows (different per platform)
 
Everywhere else, use NativeWind.
 
---
 
## Image Rule
 
Use centralized image imports.
1. Check if constants/images.ts exists.
2. If not, create it.
3. Import all app images there.
4. Use them through the centralized object.
 
```ts
import logo from "@/assets/images/logo.png";
export const images = {
  logo,
};
```
 
```tsx
<Image source={images.logo} />
```
 
Do not import image assets directly inside screens or components.
 
---
 
## State Management
 
- Zustand for global client state (XP, level, streak, missions,
  challenges, leaderboard).
- Local state for temporary UI state (modals, loading, form inputs).
- AsyncStorage for persistence (user session, cached data).
 
---
 
## TypeScript
 
- Strict mode.
- No `any`.
- Keep types simple and readable.
 
Key types to define:
- User (id, email, username, xp, level, streak)
- Mission (id, title, xpReward, completed, type)
- Challenge (id, title, type, participants, xpReward)
- ActivityLog (id, userId, type, steps, calories, photoUrl)
- LeaderboardEntry (userId, username, xp, rank)
 
---
 
## Authentication
 
Use Supabase Auth. Currently email/password; Google OAuth is planned
(Supabase Auth supports it natively — no separate backend needed to add it).
Restrict login to @student.au.edu email domain only.
Enforce the domain check in a Postgres trigger or Supabase Edge Function,
not just client-side, so it can't be bypassed.
Admin users have a separate role stored in the users table.
Do not build custom auth from scratch.
 
```typescript
// In a Supabase Edge Function or Postgres trigger
if (!user.email?.endsWith('@student.au.edu')) {
  throw new Error('AU students only')
}
```
 
---
 
## Supabase Rules
 
- Use anon key in frontend only.
- Use service key in a Supabase Edge Function only — never in client code.
- All AI calls (Claude API) go through a Supabase Edge Function only.
- HealthKit data is read on device and synced directly to Supabase (steps/calories today);
  route it through an Edge Function instead if/when trust-worthiness of the data matters
  (e.g. for anti-cheat cross-referencing).
- Never call Claude API directly from the React Native app.
 
---
 
## Activity Data Sources
 
Modeled on how Strava handles this: trust the device that recorded the
activity, since a GPS trace or watch sensor reading is much harder to
fake convincingly than a number a user types in. Not every student has
an Apple Watch, so HealthKit and GPS are two independent, trusted
inputs — use whichever the student has, don't require both.
 
**HealthKit** (steps, calories — the primary source when available):
- Request permissions on first launch.
- Read: steps, calories, heart rate, distance, workout sessions
  (steps/calories implemented; heart rate/distance/workouts not yet).
- Data flows: Apple Watch or iPhone → HealthKit →
  @kingstinct/react-native-healthkit → Supabase (direct sync, no
  backend hop).
- Requires Expo Bare Workflow and EAS Build (or a local dev client build).
- Does not work in Expo Go.
 
**GPS** (fallback for students without a paired watch, or for
distance/pace HealthKit doesn't give us):
- Track an active session with expo-location while a workout is in
  progress (foreground only — no background location without a
  stronger reason and explicit ask, since that's a bigger permission
  and battery ask than gym check-in's one-shot location read).
- Derive distance and pace from the recorded GPS trace, the same
  underlying signal Strava's running/cycling tracking uses.
- Like Strava, treat GPS data as trusted-but-not-infallible: apply the
  same anomaly checks Strava does (reject speeds/paces outside human
  limits for the activity type, flag sparse or gapped traces) rather
  than accepting any reported distance at face value.
- Swimming is HealthKit-only, not GPS — GPS doesn't work underwater.
  Skip GPS-based swim tracking; revisit only if a specific need for it
  comes up.
 
---
 
## Anti-Cheat Rules
 
Layered the way Strava layers device trust, anomaly detection, and
review — no single layer has to catch everything on its own:
- Live photo only (gallery disabled).
- Photo sent to a Supabase Edge Function.
- Edge Function calls Claude API to analyze image.
- Cross-reference against whichever real signal exists for that
  workout — HealthKit sensor data, or the GPS trace's distance/pace —
  not just the number the student entered.
- Apply the same statistical sanity checks Strava applies to GPS
  data: reject values that exceed realistic human speed/pace/output
  for the activity type, not just a flat cooldown.
- Apply cooldown: no duplicate logs within 30 minutes.
- Block unrealistic values based on duration.
 
---
 
## Secrets
 
- Never expose secret keys in client code.
- Claude API key → Supabase Edge Function only.
- Supabase service key → Supabase Edge Function only.
- Supabase anon key → frontend only.
- All sensitive API calls go through a Supabase Edge Function.
 
---
 
## Feature Implementation
 
When building a feature:
1. Read this file first.
2. Identify the files to change.
3. Keep changes focused.
4. Do not rewrite unrelated code.
5. Follow existing patterns.
6. Make sure the feature works end to end.
7. Fix lint and type errors before finishing.
 
---

## For level proceeding
  if (level < 5) return 'Beginner'
  if (level < 10) return 'Rookie'
  if (level < 20) return 'Warrior'
  if (level < 30) return 'Athlete'
  if (level < 40) return 'Elite'
  else return 'Legend'

## level calculation formula
 Cumulative XP to reach level N = 80 × (N-1)^1.3 (so level 1 starts at 0 XP)
 
## Communication
 
Be concise. Explain what changed and how to test it.
 
---
 
## Final Reminder
 
Before every feature:
- Read this file.
- Follow it strictly.
- Build clean, simple code.
- Replicate UI exactly when designs are provided.
- Never expose API keys in client code.
- Always check AU email domain on protected routes.