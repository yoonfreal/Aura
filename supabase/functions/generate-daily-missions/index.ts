// Supabase Edge Function — generates today's 3 daily missions (steps, calories, and one
// specific sport verified by photo) for the calling user,
// personalized from their real recent activity (daily_stats history + profile level/
// streak), instead of assigning the same fixed global template set to every user.
//
// Identity comes from the caller's own auth token (verified via /auth/v1/user), never a
// client-supplied user id — a client can't request missions for someone else. All DB
// writes use the service role key so the client's anon key never needs INSERT rights on
// the shared `missions` catalog table.
//
// Idempotent: if today's missions already exist for this user, returns those instead of
// generating a second set — safe to call every time the Home tab loads.
//
// Deploy: supabase functions deploy generate-daily-missions
// Requires secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected by the platform.)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-5';

type GoalUnit = 'steps' | 'calories' | 'minutes';

type MissionOut = {
  id: string;
  title: string;
  xpReward: number;
  goalValue: number;
  goalUnit: GoalUnit;
  icon: string;
  currentValue: number;
  completed: boolean;
};

const RANGES: Record<GoalUnit, { min: number; max: number }> = {
  steps: { min: 1000, max: 15000 },
  calories: { min: 50, max: 800 },
  minutes: { min: 5, max: 90 },
};

const FALLBACK_ICON: Record<GoalUnit, string> = {
  steps: '🦶',
  calories: '🏋️',
  minutes: '⏱️',
};

// Keep in sync with aura-app/src/constants/sports.ts.
const SPORTS = ['basketball', 'football', 'badminton', 'volleyball', 'table_tennis', 'tennis', 'swimming', 'jump_rope', 'yoga', 'gym', 'running', 'cycling'];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeMission(m: Record<string, unknown>): { title: string; goal_unit: GoalUnit; goal_value: number; icon: string; xp_reward: number; sport: string | null } {
  const goalUnit: GoalUnit = (['steps', 'calories', 'minutes'] as const).includes(m.goal_unit as GoalUnit)
    ? (m.goal_unit as GoalUnit)
    : 'steps';
  const range = RANGES[goalUnit];
  const goalValue = clamp(Number(m.goal_value) || range.min, range.min, range.max);
  const xpReward = clamp(Number(m.xp_reward) || 30, 10, 150);
  const title = typeof m.title === 'string' && m.title.trim() ? m.title.trim().slice(0, 60) : `Reach ${goalValue} ${goalUnit}`;
  const icon = typeof m.icon === 'string' && m.icon.trim() ? m.icon.trim().slice(0, 4) : FALLBACK_ICON[goalUnit];
  // Only sport missions carry a sport, and only one from the known list — it's what links a
  // verified photo to a matching sport challenge.
  const sport = goalUnit === 'minutes' && typeof m.sport === 'string' && SPORTS.includes(m.sport) ? m.sport : null;
  return { title, goal_unit: goalUnit, goal_value: goalValue, icon, xp_reward: xpReward, sport };
}

function buildPrompt(
  history: { date: string; steps: number; calories: number; xp_earned: number }[],
  profile: { xp: number; level: number; streak_days: number; preferred_activities: string[] | null; fitness_goal: string | null },
): string {
  const historyLines = history.length
    ? history.map((d) => `${d.date}: ${d.steps} steps, ${d.calories} cal, ${d.xp_earned} XP`).join('\n')
    : 'No activity recorded yet.';
  const activities = profile.preferred_activities?.length ? profile.preferred_activities.join(', ') : 'not specified';

  return `You are designing today's daily missions for a university student on AUra, a gamified fitness app.

Their recent activity (most recent days, newest first):
${historyLines}

Current level: ${profile.level}, current XP: ${profile.xp}, current streak: ${profile.streak_days} day(s).
Preferred activities: ${activities}. Fitness goal: ${profile.fitness_goal ?? 'not specified'}.

Design exactly 3 missions for TODAY, personalized to this history — achievable given what they've actually been doing, neither trivially easy nor unrealistic. Always return them in this order:
1. A steps mission (goal_unit "steps").
2. A calories mission (goal_unit "calories").
3. A sport mission (goal_unit "minutes") that names one specific activity the student does for a set time, e.g. "Play basketball for 20 minutes", "Jump rope for 10 minutes", "Do yoga for 15 minutes". Pick it from their preferred activities; "sports" means a specific sport such as basketball, football, badminton, volleyball, table tennis or swimming. The student must be able to prove it with a photo, so never use a generic title like "Active Minutes" or "Stay active".

Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "missions": [
    { "title": "short mission title", "goal_unit": "steps", "goal_value": number, "xp_reward": number, "icon": "single emoji" },
    { "title": "...", "goal_unit": "calories", "goal_value": 0, "xp_reward": 0, "icon": "..." },
    { "title": "...", "goal_unit": "minutes", "goal_value": 0, "xp_reward": 0, "icon": "...", "sport": "basketball" }
  ]
}

For the sport mission, "sport" must be exactly one of: ${SPORTS.join(', ')}, matching the activity in the title.

Ranges: steps missions 1000-15000, calories missions 50-800, sport missions 5-90 minutes. xp_reward should scale with difficulty, roughly 20-120. No text outside the JSON object.`;
}

// Guarantees the daily set is always one steps, one calories and one sport mission, even if
// the model repeats a type or drops one — the sport slot falls back to a concrete activity.
const DEFAULT_MISSION: Record<GoalUnit, ReturnType<typeof sanitizeMission>> = {
  steps: { title: 'Walk 3,000 steps', goal_unit: 'steps', goal_value: 3000, icon: '🦶', xp_reward: 30, sport: null },
  calories: { title: 'Burn 150 calories', goal_unit: 'calories', goal_value: 150, icon: '🔥', xp_reward: 30, sport: null },
  minutes: { title: 'Play basketball for 20 minutes', goal_unit: 'minutes', goal_value: 20, icon: '🏀', xp_reward: 40, sport: 'basketball' },
};

function oneOfEachType(missions: ReturnType<typeof sanitizeMission>[]): ReturnType<typeof sanitizeMission>[] {
  return (['steps', 'calories', 'minutes'] as const).map(
    (unit) => missions.find((m) => m.goal_unit === unit) ?? DEFAULT_MISSION[unit],
  );
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function restFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
}

async function fetchExistingMissions(userId: string, date: string): Promise<MissionOut[] | null> {
  const res = await restFetch(
    `/user_missions?user_id=eq.${userId}&date=eq.${date}&select=id,current_value,completed,missions(title,xp_reward,goal_value,goal_unit,icon)`,
  );
  if (!res.ok) {
    console.error('Failed to check existing missions', await res.text());
    return null;
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row: Record<string, unknown>) => row.missions)
    .map((row: Record<string, unknown>) => {
      const m = row.missions as Record<string, unknown>;
      return {
        id: row.id as string,
        title: m.title as string,
        xpReward: m.xp_reward as number,
        goalValue: m.goal_value as number,
        goalUnit: m.goal_unit as GoalUnit,
        icon: (m.icon as string) || FALLBACK_ICON[m.goal_unit as GoalUnit] || '🏅',
        currentValue: row.current_value as number,
        completed: row.completed as boolean,
      };
    });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY not configured' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  let date: string;
  try {
    const body = await req.json();
    if (typeof body.date !== 'string') throw new Error('missing date');
    date = body.date;
  } catch {
    return json({ error: 'Invalid JSON body — expected { date: "YYYY-MM-DD" }' }, 400);
  }

  try {
    // Resolve the caller's own identity from their token — never trust a client-supplied
    // user id, so a request can only ever generate/read missions for the person who made it.
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SERVICE_ROLE_KEY },
    });
    if (!userRes.ok) {
      const detail = await userRes.text();
      console.error('Auth check failed', userRes.status, detail);
      return json({ error: 'Invalid auth token', status: userRes.status, detail }, 401);
    }
    const userData = await userRes.json();
    const userId = userData.id as string | undefined;
    if (!userId) return json({ error: 'Could not resolve user' }, 401);

    // Idempotent: if today's missions already exist, return those instead of generating again.
    const existing = await fetchExistingMissions(userId, date);
    if (!existing) return json({ error: 'Failed to check existing missions' }, 502);
    if (existing.length > 0) return json({ missions: existing }, 200);

    // No missions yet today — pull recent history and generate personalized ones.
    const [historyRes, profileRes] = await Promise.all([
      restFetch(`/daily_stats?user_id=eq.${userId}&order=date.desc&limit=7&select=date,steps,calories,xp_earned`),
      restFetch(`/profiles?id=eq.${userId}&select=xp,level,streak_days,preferred_activities,fitness_goal`),
    ]);
    if (!historyRes.ok || !profileRes.ok) {
      console.error('Failed to load user data', await historyRes.text(), await profileRes.text());
      return json({ error: 'Failed to load user data' }, 502);
    }
    const history = await historyRes.json();
    const profileRows = await profileRes.json();
    const profile = profileRows[0] ?? { xp: 0, level: 1, streak_days: 0, preferred_activities: null, fitness_goal: null };

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: buildPrompt(history, profile) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Claude API error', anthropicRes.status, errText);
      return json({ error: 'Claude API error', detail: errText }, 502);
    }

    const data = await anthropicRes.json();
    const raw = data.content?.[0]?.text?.trim() ?? '';

    let parsed: { missions: Record<string, unknown>[] };
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.missions) || parsed.missions.length === 0) throw new Error('empty missions');
    } catch {
      console.error('Claude returned invalid JSON:', raw);
      return json({ error: 'Claude returned invalid JSON', detail: raw }, 502);
    }

    const sanitized = oneOfEachType(parsed.missions.map(sanitizeMission));

    const savedMeanwhile = await fetchExistingMissions(userId, date);
    if (!savedMeanwhile) return json({ error: 'Failed to check existing missions' }, 502);
    if (savedMeanwhile.length > 0) return json({ missions: savedMeanwhile }, 200);

    const insertMissionsRes = await restFetch('/missions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(sanitized),
    });
    if (!insertMissionsRes.ok) {
      console.error('Failed to insert missions', await insertMissionsRes.text());
      return json({ error: 'Failed to insert missions' }, 502);
    }
    const insertedMissions = await insertMissionsRes.json();

    const insertUserMissionsRes = await restFetch('/user_missions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(
        insertedMissions.map((m: Record<string, unknown>) => ({
          user_id: userId,
          mission_id: m.id,
          date,
          current_value: 0,
          completed: false,
        })),
      ),
    });
    if (!insertUserMissionsRes.ok) {
      console.error('Failed to insert user_missions', await insertUserMissionsRes.text());
      return json({ error: 'Failed to insert user_missions' }, 502);
    }
    const insertedUserMissions = await insertUserMissionsRes.json();

    const missions: MissionOut[] = insertedUserMissions.map((row: Record<string, unknown>, i: number) => {
      const m = insertedMissions[i];
      return {
        id: row.id as string,
        title: m.title as string,
        xpReward: m.xp_reward as number,
        goalValue: m.goal_value as number,
        goalUnit: m.goal_unit as GoalUnit,
        icon: m.icon as string,
        currentValue: 0,
        completed: false,
      };
    });

    return json({ missions }, 200);
  } catch (err) {
    console.error('Unexpected error generating missions:', err);
    return json({ error: 'Unexpected error', detail: String(err) }, 502);
  }
});
