import {supabaseClient} from "../config/supabase.js";

/* ============================================================
   PROFILES SERVICE — database operations for the `profiles` table.
============================================================ */

// Returns a map of { email: displayName } built from the profiles
// table, so script cards can show "Added by: Name" instead of an
// email address. One request, cached, refreshed on each login.
export async function getEmailToNameMap() {
   const {data, error} = await supabaseClient
      .from("profiles")
      .select("name, email");

   if (error) {
      console.error("getEmailToNameMap error:", error.message);
      return {};
   }

   const map = {};
   data.forEach(row => {
      if (row.email) {
         map[row.email] = row.name || row.email;
      }
   });
   return map;
}
