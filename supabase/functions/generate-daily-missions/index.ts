// Supabase Edge Function — generates today's 3 daily missions for the calling user,
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function sanitizeMission(m: Record<string, unknown>): { title: string; goal_unit: GoalUnit; goal_value: number; icon: string; xp_reward: number } {
  const goalUnit: GoalUnit = (['steps', 'calories', 'minutes'] as const).includes(m.goal_unit as GoalUnit)
    ? (m.goal_unit as GoalUnit)
    : 'steps';
  const range = RANGES[goalUnit];
  const goalValue = clamp(Number(m.goal_value) || range.min, range.min, range.max);
  const xpReward = clamp(Number(m.xp_reward) || 30, 10, 150);
  const title = typeof m.title === 'string' && m.title.trim() ? m.title.trim().slice(0, 60) : `Reach ${goalValue} ${goalUnit}`;
  const icon = typeof m.icon === 'string' && m.icon.trim() ? m.icon.trim().slice(0, 4) : FALLBACK_ICON[goalUnit];
  return { title, goal_unit: goalUnit, goal_value: goalValue, icon, xp_reward: xpReward };
}

function buildPrompt(
  history: { date: string; steps: number; calories: number; xp_earned: number }[],
  profile: { xp: number; level: number; streak_days: number },
): string {
  const historyLines = history.length
    ? history.map((d) => `${d.date}: ${d.steps} steps, ${d.calories} cal, ${d.xp_earned} XP`).join('\n')
    : 'No activity recorded yet.';

  return `You are designing today's daily missions for a university student on AUra, a gamified fitness app.

Their recent activity (most recent days, newest first):
${historyLines}

Current level: ${profile.level}, current XP: ${profile.xp}, current streak: ${profile.streak_days} day(s).

Design exactly 3 daily missions for TODAY, personalized to this history — achievable given what they've actually been doing, not generic. Neither trivially easy nor unrealistic. Mix goal types across the 3 (don't repeat the same goal_unit three times) unless their history genuinely only supports one type.

Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "missions": [
    { "title": "short mission title", "goal_unit": "steps" | "calories" | "minutes", "goal_value": number, "xp_reward": number, "icon": "single emoji" },
    { "title": "...", "goal_unit": "...", "goal_value": 0, "xp_reward": 0, "icon": "..." },
    { "title": "...", "goal_unit": "...", "goal_value": 0, "xp_reward": 0, "icon": "..." }
  ]
}

Ranges: steps missions 1000-15000, calories missions 50-800, minutes missions 5-90. xp_reward should scale with difficulty, roughly 20-120. No text outside the JSON object.`;
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
    if (!userRes.ok) return json({ error: 'Invalid auth token' }, 401);
    const userData = await userRes.json();
    const userId = userData.id as string | undefined;
    if (!userId) return json({ error: 'Could not resolve user' }, 401);

    // Idempotent: if today's missions already exist, return those instead of generating again.
    const existingRes = await restFetch(
      `/user_missions?user_id=eq.${userId}&date=eq.${date}&select=id,current_value,completed,missions(title,xp_reward,goal_value,goal_unit,icon)`,
    );
    if (!existingRes.ok) {
      console.error('Failed to check existing missions', await existingRes.text());
      return json({ error: 'Failed to check existing missions' }, 502);
    }
    const existing = await existingRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      const missions: MissionOut[] = existing
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
      return json({ missions }, 200);
    }

    // No missions yet today — pull recent history and generate personalized ones.
    const [historyRes, profileRes] = await Promise.all([
      restFetch(`/daily_stats?user_id=eq.${userId}&order=date.desc&limit=7&select=date,steps,calories,xp_earned`),
      restFetch(`/profiles?id=eq.${userId}&select=xp,level,streak_days`),
    ]);
    if (!historyRes.ok || !profileRes.ok) {
      console.error('Failed to load user data', await historyRes.text(), await profileRes.text());
      return json({ error: 'Failed to load user data' }, 502);
    }
    const history = await historyRes.json();
    const profileRows = await profileRes.json();
    const profile = profileRows[0] ?? { xp: 0, level: 1, streak_days: 0 };

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

    const sanitized = parsed.missions.slice(0, 3).map(sanitizeMission);

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
