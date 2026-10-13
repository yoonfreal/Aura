const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PHOTO_BUCKET = 'workout-photos';

const adminHeaders = {
  apikey: SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

async function deleteUserPhotos(userId: string): Promise<boolean> {
  while (true) {
    const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${PHOTO_BUCKET}`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ prefix: `${userId}/`, limit: 1000 }),
    });
    if (!listRes.ok) {
      console.error('Failed to list photos', await listRes.text());
      return false;
    }
    const files = (await listRes.json()) as { name: string }[];
    if (files.length === 0) return true;

    const deleteRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${PHOTO_BUCKET}`, {
      method: 'DELETE',
      headers: adminHeaders,
      body: JSON.stringify({ prefixes: files.map((f) => `${userId}/${f.name}`) }),
    });
    if (!deleteRes.ok) {
      console.error('Failed to delete photos', await deleteRes.text());
      return false;
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: SERVICE_ROLE_KEY },
    });
    if (!userRes.ok) return json({ error: 'Invalid auth token' }, 401);
    const userId = (await userRes.json()).id as string | undefined;
    if (!userId) return json({ error: 'Could not resolve user' }, 401);

    if (!(await deleteUserPhotos(userId))) {
      return json({ error: 'Failed to delete photos' }, 502);
    }

    const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    if (!deleteRes.ok) {
      console.error('Failed to delete user', deleteRes.status, await deleteRes.text());
      return json({ error: 'Failed to delete account' }, 502);
    }

    return json({ deleted: true }, 200);
  } catch (err) {
    console.error('Unexpected error deleting account:', err);
    return json({ error: 'Unexpected error' }, 502);
  }
});
