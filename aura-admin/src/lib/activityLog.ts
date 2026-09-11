import { supabase } from './supabase';

export type ActivityLogEntry = {
  id: string;
  adminUsername: string;
  action: string;
  details: string | null;
  createdAt: string;
};

type ActivityLogRow = {
  id: string;
  admin_username: string;
  action: string;
  details: string | null;
  created_at: string;
};

// Records one admin action for the Settings page's Activity Log card. Callers should treat
// this as best-effort (wrap in try/catch) — by the time this runs, the action it's logging
// has already succeeded, and a logging hiccup must never look like the action itself failed.
export async function logAdminActivity(
  adminId: string,
  adminUsername: string,
  action: string,
  details?: string | null,
): Promise<void> {
  const { error } = await supabase.from('admin_activity_log').insert({
    admin_id: adminId,
    admin_username: adminUsername,
    action,
    details: details ?? null,
  });
  if (error) throw error;
}

export async function fetchRecentActivity(limit = 20): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('admin_activity_log')
    .select('id, admin_username, action, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as ActivityLogRow[]).map((row) => ({
    id: row.id,
    adminUsername: row.admin_username,
    action: row.action,
    details: row.details,
    createdAt: row.created_at,
  }));
}
