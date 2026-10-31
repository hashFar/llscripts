import {supabaseClient, TABLE_NAME} from "../config/supabase.js";
import {getCurrentUser} from "./auth.service.js";

/* ============================================================
   SCRIPTS SERVICE
   All database operations for the `scripts` table. Every mutating
   function returns { error } (and, where relevant, the created data)
   so the UI layer can do optimistic updates and roll back on failure.
============================================================ */

// Converts a Supabase row into the shape the UI expects.
function _mapRow(row) {
   return {
      id: row.id,
      title: row.title,
      description: row.description || "",
      done: row.done,
      approved: row.approved,
      rejected: row.rejected,
      archived: !!row.archived,
      createdAt: row.created_at,
      createdByEmail: row.created_by_email || ""
   };
}

// Returns every script (active AND archived), newest first. Used
// only for the initial load — Home/Scripts/Archive are all derived
// from this single cached array by filtering on `archived` client-side,
// the same pattern already used for comments/reactions/names.
export async function getScripts() {
   const {data, error} = await supabaseClient
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", {ascending: false});

   if (error) {
      console.error("getScripts error:", error.message);
      return [];
   }
   return data.map(_mapRow);
}

// Adds a new script, automatically stamping it with the current
// logged-in user's email. Returns the created script (or null).
export async function addScript(title, description) {
   const {data: userData} = await getCurrentUser();
   const email = userData && userData.user ? userData.user.email : null;

   const {data, error} = await supabaseClient
      .from(TABLE_NAME)
      .insert([{
         title: title,
         description: description,
         done: false,
         approved: false,
         rejected: false,
         created_by_email: email
      }])
      .select()
      .single();

   if (error) {
      console.error("addScript error:", error.message);
      return null;
   }
   return _mapRow(data);
}

// Toggles a script's done status. `currentDone` is the value before
// toggling. Marking a script Done also archives it (per spec) — it
// does NOT get permanently deleted, it just moves to Archive.
export async function toggleDone(id, currentDone) {
   const nextDone = !currentDone;
   const updatePayload = {done: nextDone};
   if (nextDone) {
      updatePayload.archived = true;
   }

   const {error} = await supabaseClient
      .from(TABLE_NAME)
      .update(updatePayload)
      .eq("id", id);

   if (error) {
      console.error("toggleDone error:", error.message);
   }
   return {error};
}

// Toggles a script's approved status. `currentApproved` is the value before toggling.
export async function toggleApproved(id, currentApproved) {
   const {error} = await supabaseClient
      .from(TABLE_NAME)
      .update({approved: !currentApproved})
      .eq("id", id);

   if (error) {
      console.error("toggleApproved error:", error.message);
   }
   return {error};
}

// Toggles a script's rejected status. `currentRejected` is the value before toggling.
export async function toggleRejected(id, currentRejected) {
   const {error} = await supabaseClient
      .from(TABLE_NAME)
      .update({rejected: !currentRejected})
      .eq("id", id);

   if (error) {
      console.error("toggleRejected error:", error.message);
   }
   return {error};
}

// Archives a script (soft delete). Does NOT remove the row —
// clicking "Delete" in the UI now sets archived = true so nothing
// is ever permanently lost.
export async function deleteScript(id) {
   const {error} = await supabaseClient
      .from(TABLE_NAME)
      .update({archived: true})
      .eq("id", id);

   if (error) {
      console.error("deleteScript error:", error.message);
   }
   return {error};
}

// Restores an archived script back to the active Scripts list.
// Deliberately does not touch `done` — a restored completed script
// stays marked Done unless the user changes that separately.
export async function restoreScript(id) {
   const {error} = await supabaseClient
      .from(TABLE_NAME)
      .update({archived: false})
      .eq("id", id);

   if (error) {
      console.error("restoreScript error:", error.message);
   }
   return {error};
}

// Updates a script's title and description.
export async function updateScript(id, title, description) {
   const {error} = await supabaseClient
      .from(TABLE_NAME)
      .update({title: title, description: description})
      .eq("id", id);

   if (error) {
      console.error("updateScript error:", error.message);
   }
   return {error};
}
