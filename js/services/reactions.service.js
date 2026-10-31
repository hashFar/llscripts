import {supabaseClient, REACTIONS_TABLE_NAME} from "../config/supabase.js";
import {state} from "../state/store.js";

/* ============================================================
   REACTIONS SERVICE — database operations for `script_reactions`.
============================================================ */

// Returns a map of { scriptId: "like" | "dislike" } for every
// reaction the current logged-in user has made. One request for
// everything, used only on initial load.
export async function getMyReactions() {
   if (!state.currentUserId) return {};

   const {data, error} = await supabaseClient
      .from(REACTIONS_TABLE_NAME)
      .select("script_id, reaction")
      .eq("user_id", state.currentUserId);

   if (error) {
      console.error("Reaction error:", error);
      return {};
   }

   const map = {};
   data.forEach(row => {
      map[row.script_id] = row.reaction;
   });
   return map;
}

// Sets (creates or changes) the current user's reaction on a script
// using a single upsert on (script_id, user_id). Using upsert instead
// of a client-decided insert-vs-update avoids the bug where a stale
// local cache could pick the wrong operation: insert() would fail on
// the UNIQUE(script_id, user_id) constraint if a row already existed,
// and update() would silently affect zero rows (no error!) if it
// didn't — which is why reactions could appear to do nothing and not
// persist after refresh.
export async function setReaction(scriptId, reaction) {
   if (!state.currentUserId) return {error: new Error("Not logged in")};
   if (!scriptId) return {error: new Error("Invalid script id")};

   const {error} = await supabaseClient
      .from(REACTIONS_TABLE_NAME)
      .upsert(
         {script_id: scriptId, user_id: state.currentUserId, reaction: reaction},
         {onConflict: "script_id,user_id"}
      );

   if (error) {
      console.error("Reaction error:", error);
   }
   return {error};
}

// Removes the current user's reaction from a script (used when
// they click their already-selected reaction again).
export async function removeReaction(scriptId) {
   if (!state.currentUserId) return {error: new Error("Not logged in")};
   if (!scriptId) return {error: new Error("Invalid script id")};

   const {error} = await supabaseClient
      .from(REACTIONS_TABLE_NAME)
      .delete()
      .eq("script_id", scriptId)
      .eq("user_id", state.currentUserId);

   if (error) {
      console.error("Reaction error:", error);
   }
   return {error};
}
