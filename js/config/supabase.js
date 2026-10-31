/* ============================================================
   SUPABASE CONFIG
   Project URL, public (anon) key, client, and table names.
   `window.supabase` comes from the CDN <script> tag in index.html,
   which loads before this module runs.
============================================================ */
export const SUPABASE_URL = "https://lvsohmtmydjvuwiptvvs.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_07ljO6sChQRYpMyQGDEgLg_7RGz37RL";

export const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const TABLE_NAME = "scripts";
export const COMMENTS_TABLE_NAME = "comments";
export const REACTIONS_TABLE_NAME = "script_reactions";
