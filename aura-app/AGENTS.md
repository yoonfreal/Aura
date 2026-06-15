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
- Activity tracking via HealthKit
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
- Node.js + Express (backend REST API)
- Redis / Upstash (caching, sessions)
- Claude API (AI missions, report card, photo validation)
- HealthKit via react-native-health (fitness data)
- Railway (backend hosting)
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
- api.ts → Express backend calls
- claude.ts → Claude API calls (via backend only, never direct from client)
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
 
Use Supabase Auth with Google OAuth.
Restrict login to @student.au.edu email domain only.
Check email domain in Express backend middleware after Supabase
verifies the token.
Admin users have a separate role stored in the users table.
Do not build custom auth from scratch.
 
```typescript
// In Express middleware
if (!user.email?.endsWith('@student.au.edu')) {
  return res.status(403).json({ error: 'AU students only' })
}
```
 
---
 
## Supabase Rules
 
- Use anon key in frontend only.
- Use service key in Express backend only — never in client code.
- All AI calls (Claude API) go through Express backend only.
- All HealthKit data is read on device and sent to backend via API.
- Never call Claude API directly from the React Native app.
 
---
 
## HealthKit Rules
 
- Request permissions on first launch.
- Read: steps, calories, heart rate, distance, workout sessions.
- Data flows: Apple Watch → HealthKit → react-native-health →
  Express backend → Supabase.
- Requires Expo Bare Workflow and EAS Build.
- Does not work in Expo Go.
 
---
 
## Anti-Cheat Rules
 
When validating manual workouts:
- Live photo only (gallery disabled).
- Photo sent to Express backend.
- Backend calls Claude API to analyze image.
- Cross-reference with HealthKit sensor data.
- Apply cooldown: no duplicate logs within 30 minutes.
- Block unrealistic values based on duration.
 
---
 
## Secrets
 
- Never expose secret keys in client code.
- Claude API key → Express backend only.
- Supabase service key → Express backend only.
- Supabase anon key → frontend only.
- All sensitive API calls go through Express backend.
 
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