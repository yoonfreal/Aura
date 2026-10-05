// Supabase Edge Function — generates a personalized recap of the user's real week for
// the AI Report Card screen. The day-by-day numbers come from the app (real math); this
// function only writes the narrative, and its shape is left up to the model rather than
// forced into a fixed sentence count — a quiet week and an eventful one should read
// differently, the way a chat response adapts to what's actually being discussed.
//
// Deploy: supabase functions deploy ai-report-card
// Requires secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const MODEL = 'claude-sonnet-5';

type DayActivity = {
  day: string;
  steps: number;
  calories: number;
  xp: number;
};

type ReportStats = {
  days: DayActivity[];
  totalSteps: number;
  totalCalories: number;
  totalXpThisWeek: number;
  avgStepsVsLastWeek: number | null;
  caloriesVsLastWeek: number | null;
  streakDays: number;
  level: number;
  xpNeeded: number;
  nextLevel: number;
};

function buildPrompt(stats: ReportStats): string {
  const dayLines = stats.days
    .map((d) => `${d.day}: ${d.steps} steps, ${d.calories} cal, ${d.xp} XP`)
    .join('\n');

  return `You are a sharp, encouraging fitness coach for AUra, a gamified fitness app for university students. Write this student's weekly recap.

Day-by-day activity this week (Mon–Sun):
${dayLines}

Totals: ${stats.totalSteps} steps, ${stats.totalCalories} calories, ${stats.totalXpThisWeek} XP earned this week.
Steps vs last week: ${stats.avgStepsVsLastWeek == null ? 'no prior data' : `${stats.avgStepsVsLastWeek >= 0 ? '+' : ''}${stats.avgStepsVsLastWeek}%`}
Calories vs last week: ${stats.caloriesVsLastWeek == null ? 'no prior data' : `${stats.caloriesVsLastWeek >= 0 ? '+' : ''}${stats.caloriesVsLastWeek}%`}
Current streak: ${stats.streakDays} day(s). Currently Level ${stats.level}, ${stats.xpNeeded} XP from Level ${stats.nextLevel}.

Write a natural recap of what this student actually did this week — reference specific days by name where it matters (a big day, a quiet stretch, a comeback). Let the shape of your response follow the shape of the week: a genuinely active, eventful week can run longer and call out more specifics; a quiet or inconsistent week should say so plainly and stay shorter — don't pad a quiet week to sound impressive. You may use short paragraphs, or a tight bulleted breakdown of standout days, or both — pick whichever fits. You may use **bold** for numbers or day names that matter, and "- " bullet lines where a list reads better than prose. Do not use markdown headers (#, ##) — this renders inside a small card, not a page. Do not invent activity that isn't in the data above.

Respond with ONLY valid JSON, no markdown fences, matching exactly this shape:
{
  "recap": "the recap text described above, using \\n\\n between paragraphs/sections",
  "recommendations": [
    { "title": "short actionable title (5-8 words)", "detail": "one sentence explaining why, referencing a real number when relevant" },
    { "title": "...", "detail": "..." },
    { "title": "...", "detail": "..." }
  ]
}

Write between 2 and 4 recommendations depending on how much this week's data actually calls for — a strong, consistent week may only need 2; an inconsistent one may warrant 4. Every recommendation must be grounded in the real data above. No text outside the JSON object.`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let stats: ReportStats;
  try {
    stats = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        // This is a formatting/writing task, not one that benefits from reasoning — disable
        // thinking (on by default for this model) to cut latency and avoid timing out.
        thinking: { type: 'disabled' },
        messages: [{ role: 'user', content: buildPrompt(stats) }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Claude API error', anthropicRes.status, errText);
      return new Response(JSON.stringify({ error: 'Claude API error', detail: errText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicRes.json();
    const raw = data.content?.[0]?.text?.trim() ?? '';

    let parsed: { recap: string; recommendations: { title: string; detail: string }[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('Claude returned invalid JSON:', raw);
      return new Response(JSON.stringify({ error: 'Claude returned invalid JSON', detail: raw }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Catches thrown errors that don't come back as a normal HTTP response — a network
    // blip or timeout talking to Anthropic, for example — so a transient failure returns
    // a clean JSON error instead of crashing the function uncaught.
    console.error('Unexpected error calling Claude:', err);
    return new Response(JSON.stringify({ error: 'Unexpected error', detail: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
