/* ============================================================
   SHARED APP STATE
   One object holds every shared variable and cache, so any module
   can read/write it (e.g. `state.allScripts = ...`) without needing
   global variables.

   `allScripts` is the local, in-memory cache of every script,
   always kept newest-first. Supabase is only queried on initial
   load; every other operation reads/writes this array and patches
   the DOM directly.
   `commentsCache` holds comments per script id, lazily loaded the
   first time a script's comments panel is opened.
============================================================ */
export const state = {
   allScripts: [],
   currentFilter: "all", // all | approved | not-approved | done | not-done | rejected
   editingId: null, // id of the script currently being edited, or null
   commentsCache: {}, // scriptId -> array of comments
   currentUserId: null, // Supabase auth id of the logged-in user, used for comment ownership checks
   reactionsCache: {}, // scriptId -> "like" | "dislike" for the current user's own reaction
   emailToNameMap: {}, // email -> display name, built from the profiles table
   commentCountsCache: {}, // scriptId -> number of comments
   nameFilter: "all", // "all" or a specific creator's display name
   dateFilter: "all" // all | today | yesterday | last7 | last30
};
