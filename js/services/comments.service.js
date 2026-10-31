import {supabaseClient, COMMENTS_TABLE_NAME} from "../config/supabase.js";
import {getCurrentUser} from "./auth.service.js";

/* ============================================================
   COMMENTS SERVICE — database operations for the `comments` table.
============================================================ */

// Converts a Supabase comment row (with joined profile) into the
// shape the UI expects.
function _mapCommentRow(row) {
   const profile = row.profiles;
   const authorName = (profile && (profile.name || profile.email)) || "Unknown";
   return {
      id: row.id,
      scriptId: row.script_id,
      userId: row.user_id,
      text: row.comment,
      createdAt: row.created_at,
      authorName: authorName
   };
}

// Returns all comments for a script, oldest first, with the
// commenter's display name resolved from the profiles table.
export async function getComments(scriptId) {
   const {data, error} = await supabaseClient
      .from(COMMENTS_TABLE_NAME)
      .select("id, script_id, user_id, comment, created_at, profiles(name, email)")
      .eq("script_id", scriptId)
      .order("created_at", {ascending: true});

   if (error) {
      console.error("getComments error:", error.message);
      return [];
   }
   return data.map(_mapCommentRow);
}

// Adds a comment as the current logged-in user. Returns the
// created comment (with resolved author name) or null on failure.
export async function addComment(scriptId, text) {
   const {data: userData, error: userError} = await getCurrentUser();
   if (userError || !userData || !userData.user) {
      console.error("addComment error: no logged-in user");
      return null;
   }

   const {data, error} = await supabaseClient
      .from(COMMENTS_TABLE_NAME)
      .insert([{script_id: scriptId, user_id: userData.user.id, comment: text}])
      .select("id, script_id, user_id, comment, created_at, profiles(name, email)")
      .single();

   if (error) {
      console.error("addComment error:", error.message);
      return null;
   }
   return _mapCommentRow(data);
}

// Updates the text of an existing comment. Only succeeds (per RLS)
// if the current user owns the comment.
export async function updateComment(id, text) {
   const {error} = await supabaseClient
      .from(COMMENTS_TABLE_NAME)
      .update({comment: text})
      .eq("id", id);

   if (error) {
      console.error("updateComment error:", error.message);
   }
   return {error};
}

// Deletes a comment. Only succeeds (per RLS) if the current user
// owns the comment.
export async function deleteComment(id) {
   const {error} = await supabaseClient
      .from(COMMENTS_TABLE_NAME)
      .delete()
      .eq("id", id);

   if (error) {
      console.error("deleteComment error:", error.message);
   }
   return {error};
}

// Returns a map of { scriptId: commentCount } for every script, in
// a single lightweight query (just the script_id column, not full
// comment rows), instead of querying comments once per script.
export async function getCommentCounts() {
   const {data, error} = await supabaseClient
      .from(COMMENTS_TABLE_NAME)
      .select("script_id");

   if (error) {
      console.error("getCommentCounts error:", error.message);
      return {};
   }

   const counts = {};
   data.forEach(row => {
      counts[row.script_id] = (counts[row.script_id] || 0) + 1;
   });
   return counts;
}
