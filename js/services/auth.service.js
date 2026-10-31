import {supabaseClient} from "../config/supabase.js";

/* ============================================================
   AUTH SERVICE — Supabase authentication calls only.
============================================================ */

// Signs in with email + password. Returns { error }.
export async function signIn(email, password) {
   const {error} = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
   });
   return {error};
}

// Signs the current user out.
export async function signOut() {
   await supabaseClient.auth.signOut();
}

// Returns { data, error } for the live logged-in user.
export async function getCurrentUser() {
   return await supabaseClient.auth.getUser();
}

// Returns the current session (or null if nobody is logged in).
export async function getSession() {
   const {data} = await supabaseClient.auth.getSession();
   return data.session;
}
