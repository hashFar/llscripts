import {state} from "../state/store.js";
import {signIn, signOut, getCurrentUser, getSession} from "../services/auth.service.js";

/* ============================================================
   LOGIN SCREEN - SUPABASE AUTH
   initAuth(onLoggedIn) wires up login, logout and the "already
   logged in" check. `onLoggedIn` is called after the user is known
   (app.js passes loadInitialData), which keeps this file free of any
   view/data-loading code.
============================================================ */
export function initAuth(onLoggedIn) {
   const passwordScreen = document.getElementById("passwordScreen");
   const appEl = document.getElementById("app");

   const emailInput = document.getElementById("emailInput");
   const passwordInput = document.getElementById("passwordInput");
   const enterBtn = document.getElementById("enterBtn");
   const pwError = document.getElementById("pwError");
   const logoutBtn = document.getElementById("logoutBtn");

   async function tryEnter() {
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (!email || !password) {
         pwError.textContent = "Enter email and password";
         return;
      }

      pwError.textContent = "";
      enterBtn.disabled = true;
      enterBtn.textContent = "Logging in...";

      const {error} = await signIn(email, password);

      enterBtn.disabled = false;
      enterBtn.textContent = "Enter";

      if (error) {
         pwError.textContent = "Incorrect email or password";
         return;
      }

      showApp();
   }

   async function showApp() {
      passwordScreen.style.display = "none";
      appEl.style.display = "block";

      const {data: userData, error: userError} = await getCurrentUser();
      if (userError) {
         console.error("Reaction error:", userError); // surfaced here too since it affects reaction loading
      }
      state.currentUserId = userData && userData.user ? userData.user.id : null;

      await onLoggedIn();
   }

   function showLogin() {
      appEl.style.display = "none";
      passwordScreen.style.display = "flex";
      emailInput.value = "";
      passwordInput.value = "";
      pwError.textContent = "";
   }

   enterBtn.addEventListener("click", tryEnter);

   passwordInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryEnter();
   });

   emailInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryEnter();
   });

   logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      await signOut();
      state.currentUserId = null;
      state.reactionsCache = {};
      state.emailToNameMap = {};
      state.commentCountsCache = {};
      logoutBtn.disabled = false;
      showLogin();
   });

   /* Check if user is already logged in */
   async function checkExistingSession() {
      const session = await getSession();

      if (session) {
         showApp();
      }
   }

   checkExistingSession();
}
