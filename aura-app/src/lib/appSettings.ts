import { supabase } from './supabase';

export type AppSettings = {
  communityPostsEnabled: boolean;
  partnerFinderEnabled: boolean;
  filterBannedKeywords: boolean;
  maintenanceModeEnabled: boolean;
};

// Fails open — if app_settings isn't reachable for some reason, the app should keep working
// (everything enabled, maintenance off) rather than a network hiccup locking everyone out or
// silently breaking posting for every user.
const DEFAULTS: AppSettings = {
  communityPostsEnabled: true,
  partnerFinderEnabled: true,
  filterBannedKeywords: true,
  maintenanceModeEnabled: false,
};

// Singleton row (id = 1) an admin controls from the Settings page in aura-admin.
export async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('community_posts_enabled, partner_finder_enabled, filter_banned_keywords, maintenance_mode_enabled')
    .eq('id', 1)
    .maybeSingle();
  if (error || !data) return DEFAULTS;

  return {
    communityPostsEnabled: data.community_posts_enabled,
    partnerFinderEnabled: data.partner_finder_enabled,
    filterBannedKeywords: data.filter_banned_keywords,
    maintenanceModeEnabled: data.maintenance_mode_enabled,
  };
}
