import { supabase } from './supabase';

export type AppSettings = {
  communityPostsEnabled: boolean;
  partnerFinderEnabled: boolean;
  filterBannedKeywords: boolean;
  maintenanceModeEnabled: boolean;
};


const DEFAULTS: AppSettings = {
  communityPostsEnabled: true,
  partnerFinderEnabled: true,
  filterBannedKeywords: true,
  maintenanceModeEnabled: false,
};


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
