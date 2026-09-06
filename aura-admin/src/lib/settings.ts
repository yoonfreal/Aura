import { supabase } from './supabase';
import { logAdminActivity } from './activityLog';

export type AppSettings = {
  communityPostsEnabled: boolean;
  partnerFinderEnabled: boolean;
  filterBannedKeywords: boolean;
  maintenanceModeEnabled: boolean;
};

type AppSettingsRow = {
  community_posts_enabled: boolean;
  partner_finder_enabled: boolean;
  filter_banned_keywords: boolean;
  maintenance_mode_enabled: boolean;
};

// Singleton row (id = 1) — see the app_settings table. aura-app reads the same row to decide
// whether to allow posting/replying, whether to run the banned-keyword filter, and whether to
// show the maintenance screen instead of letting anyone into the app at all.
export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('community_posts_enabled, partner_finder_enabled, filter_banned_keywords, maintenance_mode_enabled')
    .eq('id', 1)
    .single();
  if (error) throw error;

  const row = data as AppSettingsRow;
  return {
    communityPostsEnabled: row.community_posts_enabled,
    partnerFinderEnabled: row.partner_finder_enabled,
    filterBannedKeywords: row.filter_banned_keywords,
    maintenanceModeEnabled: row.maintenance_mode_enabled,
  };
}

const SETTING_LABELS: Record<keyof AppSettings, string> = {
  communityPostsEnabled: 'Community posts',
  partnerFinderEnabled: 'Partner finder posts',
  filterBannedKeywords: 'Filter banned keywords',
  maintenanceModeEnabled: 'Maintenance mode',
};

// Saves the whole Moderation card at once (it has one Save button, not per-toggle autosave)
// and logs which individual toggles actually changed — e.g. "Community posts off" — rather
// than a vague "settings updated", by diffing against what was loaded before editing.
export async function updateAppSettings(adminId: string, adminUsername: string, previous: AppSettings, next: AppSettings): Promise<void> {
  const { data, error } = await supabase
    .from('app_settings')
    .update({
      community_posts_enabled: next.communityPostsEnabled,
      partner_finder_enabled: next.partnerFinderEnabled,
      filter_banned_keywords: next.filterBannedKeywords,
      maintenance_mode_enabled: next.maintenanceModeEnabled,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select('id');
  if (error) throw error;
  // RLS blocks (rather than errors on) an update with no visible matching row — same
  // silent-no-op gap as profiles updates elsewhere in this app — so surface that instead of
  // letting the caller believe it saved.
  if (!data || data.length === 0) {
    throw new Error('Settings update did not apply — check the admin update policy on app_settings.');
  }

  const changes = (Object.keys(next) as (keyof AppSettings)[])
    .filter((key) => next[key] !== previous[key])
    .map((key) => `${SETTING_LABELS[key]} ${next[key] ? 'on' : 'off'}`);

  if (changes.length > 0) {
    try {
      await logAdminActivity(adminId, adminUsername, 'Updated moderation settings', changes.join(', '));
    } catch {
      // Best-effort — the settings change itself already succeeded.
    }
  }
}
