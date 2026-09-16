 /* ============================================================
         CONFIG
      ============================================================ */


      /* ============================================================
         THEME
         Applies and persists the dark/light theme. Runs immediately
         so the correct theme is set before the login screen shows.
      ============================================================ */
      const THEME_STORAGE_KEY = "logicLagaoTheme";

      const MOON_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      const SUN_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

      function getSavedTheme() {
         const saved = localStorage.getItem(THEME_STORAGE_KEY);
         return saved === "light" ? "light" : "dark"; // default to dark
      }

      function applyTheme(theme) {
         if (theme === "light") {
            document.documentElement.setAttribute("data-theme", "light");
         } else {
            document.documentElement.removeAttribute("data-theme");
         }
         localStorage.setItem(THEME_STORAGE_KEY, theme);

         const btn = document.getElementById("themeToggleBtn");
         if (btn) {
            // Icon shows the theme the click will switch TO,
            // per the requirement: moon while dark, sun while light.
            btn.innerHTML = theme === "light" ? SUN_ICON : MOON_ICON;
         }
      }

      let currentTheme = getSavedTheme();
      applyTheme(currentTheme);


      /* ============================================================
         DATA LAYER
         All data operations live here, backed by Supabase. The UI
         code below only calls these functions and never talks to
         Supabase directly, so the backend can be swapped again later
         without touching the UI. Every mutating function returns
         { error } (and, where relevant, the created/updated data) so
         the UI layer can do optimistic updates and roll back on
         failure without re-fetching everything.
      ============================================================ */
      const SUPABASE_URL = "https://lvsohmtmydjvuwiptvvs.supabase.co";
      const SUPABASE_ANON_KEY = "sb_publishable_07ljO6sChQRYpMyQGDEgLg_7RGz37RL";

      const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const TABLE_NAME = "scripts";
      const COMMENTS_TABLE_NAME = "comments";
      const REACTIONS_TABLE_NAME = "script_reactions";

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

      // Returns every script (active AND archived), newest first. Used
      // only for the initial load — Home/Scripts/Archive are all derived
      // from this single cached array by filtering on `archived` client-side,
      // the same pattern already used for comments/reactions/names.
      async function getScripts() {
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
      async function addScript(title, description) {
         const {data: userData} = await supabaseClient.auth.getUser();
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
      async function toggleDone(id, currentDone) {
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
      async function toggleApproved(id, currentApproved) {
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
      async function toggleRejected(id, currentRejected) {
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
      async function deleteScript(id) {
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
      async function restoreScript(id) {
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
      async function updateScript(id, title, description) {
         const {error} = await supabaseClient
            .from(TABLE_NAME)
            .update({title: title, description: description})
            .eq("id", id);

         if (error) {
            console.error("updateScript error:", error.message);
         }
         return {error};
      }

      // Returns all comments for a script, oldest first, with the
      // commenter's display name resolved from the profiles table.
      async function getComments(scriptId) {
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
      async function addComment(scriptId, text) {
         const {data: userData, error: userError} = await supabaseClient.auth.getUser();
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
      async function updateComment(id, text) {
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
      async function deleteComment(id) {
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
      async function getCommentCounts() {
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

      // Returns a map of { scriptId: "like" | "dislike" } for every
      // reaction the current logged-in user has made. One request for
      // everything, used only on initial load.
      async function getMyReactions() {
         if (!currentUserId) return {};

         const {data, error} = await supabaseClient
            .from(REACTIONS_TABLE_NAME)
            .select("script_id, reaction")
            .eq("user_id", currentUserId);

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
      async function setReaction(scriptId, reaction) {
         if (!currentUserId) return {error: new Error("Not logged in")};
         if (!scriptId) return {error: new Error("Invalid script id")};

         const {error} = await supabaseClient
            .from(REACTIONS_TABLE_NAME)
            .upsert(
               {script_id: scriptId, user_id: currentUserId, reaction: reaction},
               {onConflict: "script_id,user_id"}
            );

         if (error) {
            console.error("Reaction error:", error);
         }
         return {error};
      }

      // Removes the current user's reaction from a script (used when
      // they click their already-selected reaction again).
      async function removeReaction(scriptId) {
         if (!currentUserId) return {error: new Error("Not logged in")};
         if (!scriptId) return {error: new Error("Invalid script id")};

         const {error} = await supabaseClient
            .from(REACTIONS_TABLE_NAME)
            .delete()
            .eq("script_id", scriptId)
            .eq("user_id", currentUserId);

         if (error) {
            console.error("Reaction error:", error);
         }
         return {error};
      }

      // Returns a map of { email: displayName } built from the profiles
      // table, so script cards can show "Added by: Name" instead of an
      // email address. One request, cached, refreshed on each login.
      async function getEmailToNameMap() {
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

      /* ============================================================
         UI STATE
         `allScripts` is the local, in-memory cache of every script,
         always kept newest-first. Supabase is only queried on
         initial load; every other operation reads/writes this array
         and patches the DOM directly.
         `commentsCache` holds comments per script id, lazily loaded
         the first time a script's comments panel is opened.
      ============================================================ */
      let allScripts = [];
      let currentFilter = "all"; // all | approved | not-approved | done | not-done | rejected
      let editingId = null; // id of the script currently being edited, or null
      let commentsCache = {}; // scriptId -> array of comments
      let currentUserId = null; // Supabase auth id of the logged-in user, used for comment ownership checks
      let reactionsCache = {}; // scriptId -> "like" | "dislike" for the current user's own reaction
      let emailToNameMap = {}; // email -> display name, built from the profiles table
      let commentCountsCache = {}; // scriptId -> number of comments
      let nameFilter = "all"; // "all" or a specific creator's display name
      let dateFilter = "all"; // all | today | yesterday | last7 | last30

      /* ============================================================
LOGIN SCREEN - SUPABASE AUTH
============================================================ */

      const passwordScreen = document.getElementById("passwordScreen");
      const appEl = document.getElementById("app");

      const emailInput = document.getElementById("emailInput");
      const passwordInput = document.getElementById("passwordInput");
      const enterBtn = document.getElementById("enterBtn");
      const pwError = document.getElementById("pwError");
      const logoutBtn = document.getElementById("logoutBtn");
      const themeToggleBtn = document.getElementById("themeToggleBtn");

      themeToggleBtn.addEventListener("click", () => {
         currentTheme = currentTheme === "light" ? "dark" : "light";
         applyTheme(currentTheme);
      });

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

         const {error} = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
         });

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

         const {data: userData, error: userError} = await supabaseClient.auth.getUser();
         if (userError) {
            console.error("Reaction error:", userError); // surfaced here too since it affects reaction loading
         }
         currentUserId = userData && userData.user ? userData.user.id : null;

         await loadInitialData();
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
         await supabaseClient.auth.signOut();
         currentUserId = null;
         reactionsCache = {};
         emailToNameMap = {};
         commentCountsCache = {};
         logoutBtn.disabled = false;
         showLogin();
      });

      /* Check if user is already logged in */
      async function checkExistingSession() {
         const {data} = await supabaseClient.auth.getSession();

         if (data.session) {
            showApp();
         }
      }

      checkExistingSession();

      /* ============================================================
         TABS
         Switching tabs never re-fetches from Supabase — it just
         re-renders from the local `allScripts` cache.
      ============================================================ */
      const tabButtons = document.querySelectorAll(".tab-btn");
      const views = {
         home: document.getElementById("homeView"),
         scripts: document.getElementById("scriptsView"),
         archive: document.getElementById("archiveView")
      };

      tabButtons.forEach(btn => {
         btn.addEventListener("click", () => {
            tabButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            Object.values(views).forEach(v => v.classList.remove("active"));
            views[btn.dataset.tab].classList.add("active");
            if (btn.dataset.tab === "home") renderHomeList();
            if (btn.dataset.tab === "scripts") renderScriptsList();
            if (btn.dataset.tab === "archive") renderArchiveList();
         });
      });

      /* ============================================================
         RENDER HELPERS
      ============================================================ */
      function formatDate(timestamp) {
         const d = new Date(timestamp);
         return d.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
      }

      function formatDateTime(timestamp) {
         const d = new Date(timestamp);
         return d.toLocaleString(undefined, {year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"});
      }

      function escapeHtml(str) {
         const div = document.createElement("div");
         div.textContent = str;
         return div.innerHTML;
      }

      function commentHtml(c) {
         const isOwner = c.userId === currentUserId;
         return `
        <div class="comment-item" data-comment-id="${c.id}" data-user-id="${c.userId}">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.authorName)}</span>
            <span class="comment-date">${formatDateTime(c.createdAt)}</span>
          </div>
          <p class="comment-text">${escapeHtml(c.text)}</p>
          ${isOwner ? `
          <div class="comment-actions">
            <button class="comment-edit-btn" type="button">Edit</button>
            <button class="comment-delete-btn" type="button">Delete</button>
          </div>
          ` : ""}
        </div>
      `;
      }

      // Same comment, but rendered as an inline edit form (textarea + Save/Cancel).
      function commentEditHtml(c) {
         return `
        <div class="comment-item" data-comment-id="${c.id}" data-user-id="${c.userId}">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(c.authorName)}</span>
            <span class="comment-date">${formatDateTime(c.createdAt)}</span>
          </div>
          <textarea class="comment-edit-input" rows="2">${escapeHtml(c.text)}</textarea>
          <div class="comment-actions">
            <button class="comment-save-btn" type="button">Save</button>
            <button class="comment-cancel-btn" type="button">Cancel</button>
          </div>
        </div>
      `;
      }

      // Builds a detached DOM element for a single comment, in either
      // display or edit mode (used for in-place edit/cancel/save).
      function buildCommentElement(comment, editing) {
         const wrapper = document.createElement("div");
         wrapper.innerHTML = (editing ? commentEditHtml(comment) : commentHtml(comment)).trim();
         return wrapper.firstElementChild;
      }

      function showCommentError(commentItem, message) {
         let err = commentItem.querySelector(".inline-error");
         if (!err) {
            err = document.createElement("div");
            err.className = "inline-error";
            commentItem.appendChild(err);
         }
         err.textContent = message;
         setTimeout(() => {
            if (err && err.parentNode) err.remove();
         }, 3000);
      }

      // Finds a cached comment object by id for a given script.
      function findCachedComment(scriptId, commentId) {
         const comments = commentsCache[scriptId];
         if (!comments) return null;
         return comments.find(c => String(c.id) === String(commentId)) || null;
      }

      // Formats a comment count with correct singular/plural wording.
      function commentCountLabel(count) {
         return count === 1 ? "1 Comment" : `${count} Comments`;
      }

      // Updates just the Comments button's label on a single card,
      // without touching anything else.
      function updateCommentCountButton(cardEl, scriptId) {
         const toggleBtn = cardEl.querySelector(".comments-toggle-btn");
         if (toggleBtn) {
            toggleBtn.innerHTML = `&#128172; ${commentCountLabel(commentCountsCache[scriptId] || 0)}`;
         }
      }

      // Returns the display name for whoever created a script, falling
      // back to their email if no profile name could be found.
      function getCreatorDisplayName(script) {
         if (!script.createdByEmail) return null;
         return emailToNameMap[script.createdByEmail] || script.createdByEmail;
      }

      function scriptCardHtml(script, {withCheckboxes, withDelete, withEdit, withComments, withReactions, editing}) {
         const doneClass = script.done ? "done" : "not-done";
         const doneText = script.done ? "Done" : "Not Done";

         if (withEdit && editing) {
            return `
        <div class="script-card" data-id="${script.id}">
          <div class="edit-form">
            <input type="text" class="edit-title-input" value="${escapeHtml(script.title)}">
            <textarea class="edit-desc-input" rows="3">${escapeHtml(script.description)}</textarea>
            <div class="edit-form-actions">
              <button class="btn btn-secondary edit-cancel-btn">Cancel</button>
              <button class="btn btn-primary edit-save-btn">Save</button>
            </div>
          </div>
        </div>
      `;
         }

         const cachedComments = commentsCache[script.id];
         const commentsListHtml = cachedComments
            ? (cachedComments.length ? cachedComments.map(commentHtml).join("") : `<div class="comments-empty">No comments yet.</div>`)
            : "";
         const commentsLoadedAttr = cachedComments ? "true" : "false";

         const myReaction = reactionsCache[script.id]; // "like" | "dislike" | undefined
         const creatorName = getCreatorDisplayName(script) || "Unknown";

         return `
      <div class="script-card" data-id="${script.id}">
        ${withCheckboxes ? `
        <div class="status-checks">
          <div class="status-check-item">
            <input type="checkbox" class="done-checkbox" id="done-${script.id}" ${script.done ? "checked" : ""}>
            <label for="done-${script.id}">Done</label>
          </div>
        </div>
        ` : ""}
        <div class="script-body">
          <p class="script-title ${script.done ? "done" : ""}">${escapeHtml(script.title)}</p>
          <p class="script-desc">${escapeHtml(script.description)}</p>
          <div class="script-meta">
            <span class="status-badge done-badge ${doneClass}">${doneText}</span>
            <span class="date-text">${formatDate(script.createdAt)}</span>
          </div>
          <p class="added-by">Added by: ${escapeHtml(creatorName)}</p>
          ${(withReactions || withComments) ? `
          <div class="reaction-comment-row">
            ${withReactions ? `
            <button class="reaction-btn like-btn ${myReaction === "like" ? "active-like" : ""}" type="button" title="Like">&#128077;</button>
            <button class="reaction-btn dislike-btn ${myReaction === "dislike" ? "active-dislike" : ""}" type="button" title="Dislike">&#128078;</button>
            ` : ""}
            ${withComments ? `
            <button class="comments-toggle-btn" type="button">&#128172; ${commentCountLabel(commentCountsCache[script.id] || 0)}</button>
            ` : ""}
          </div>
          ` : ""}
          ${withComments ? `
          <div class="comments-panel" data-loaded="${commentsLoadedAttr}">
            <div class="comments-list">${commentsListHtml}</div>
            <div class="comment-add">
              <textarea class="comment-input" rows="2" placeholder="Add a comment..."></textarea>
              <button class="btn btn-primary comment-submit-btn" type="button">Post</button>
            </div>
          </div>
          ` : ""}
        </div>
        <div class="card-actions">
          ${withEdit ? `<button class="edit-btn" title="Edit">&#9998;</button>` : ""}
          ${withDelete ? `<button class="delete-btn" title="Delete">&times;</button>` : ""}
        </div>
      </div>
    `;
      }

      // Builds a detached DOM element for a script card (used for
      // inserting/replacing single cards without rebuilding lists).
      function buildCardElement(script, opts) {
         const wrapper = document.createElement("div");
         wrapper.innerHTML = scriptCardHtml(script, opts).trim();
         return wrapper.firstElementChild;
      }

      function showCardError(cardEl, message) {
         const container = cardEl.querySelector(".script-body") || cardEl.querySelector(".edit-form") || cardEl;
         let err = container.querySelector(".inline-error");
         if (!err) {
            err = document.createElement("div");
            err.className = "inline-error";
            container.appendChild(err);
         }
         err.textContent = message;
         setTimeout(() => {
            if (err && err.parentNode) err.remove();
         }, 3000);
      }

      function showFormError(message) {
         let err = addForm.querySelector(".inline-error");
         if (!err) {
            err = document.createElement("div");
            err.className = "inline-error";
            addForm.insertBefore(err, addForm.querySelector(".form-actions"));
         }
         err.textContent = message;
         setTimeout(() => {
            if (err && err.parentNode) err.remove();
         }, 3000);
      }

      function scriptMatchesCurrentFilter(script) {
         if (currentFilter === "done") return script.done;
         if (currentFilter === "not-done") return !script.done;
         if (currentFilter === "approved") return script.approved;
         if (currentFilter === "not-approved") return !script.approved;
         if (currentFilter === "rejected") return script.rejected;
         return true; // all
      }

      function updateBadgesAndTitle(cardEl, script) {
         const titleEl = cardEl.querySelector(".script-title");
         if (titleEl) titleEl.classList.toggle("done", script.done);

         const doneBadge = cardEl.querySelector(".done-badge");
         if (doneBadge) {
            doneBadge.classList.remove("done", "not-done");
            doneBadge.classList.add(script.done ? "done" : "not-done");
            doneBadge.textContent = script.done ? "Done" : "Not Done";
         }
      }

      // Updates the badges/title on this script's card in both Home
      // and Scripts views (whichever of them currently exist in the DOM).
      function syncCardEverywhere(script) {
         const scriptsCard = scriptsList.querySelector(`.script-card[data-id="${script.id}"]`);
         if (scriptsCard) updateBadgesAndTitle(scriptsCard, script);

         const homeCard = homeList.querySelector(`.script-card[data-id="${script.id}"]`);
         if (homeCard) updateBadgesAndTitle(homeCard, script);
      }

      function removeEmptyState(container) {
         const empty = container.querySelector(".empty-state");
         if (empty) empty.remove();
      }

      function ensureEmptyStateIfNeeded(container, message) {
         if (!container.querySelector(".script-card")) {
            container.innerHTML = `<div class="empty-state">${message}</div>`;
         }
      }

      /* ============================================================
         HOME VIEW
         Rendered entirely from the local `allScripts` cache, grouped by
         calendar day. Shows only the two most recent days that actually
         contain at least one (non-archived) script — not necessarily
         calendar-consecutive days.
      ============================================================ */
      const homeList = document.getElementById("homeList");

      // A stable per-day key based on the user's local calendar day.
      function getDayKey(timestamp) {
         const d = new Date(timestamp);
         return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      }

      // "Today" / "Yesterday" / "10 September 2026"
      function formatDayHeading(timestamp) {
         const d = new Date(timestamp);
         const now = new Date();
         const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
         const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
         const diffDays = Math.round((startOfToday - startOfThatDay) / (1000 * 60 * 60 * 24));

         if (diffDays === 0) return "Today";
         if (diffDays === 1) return "Yesterday";
         return d.toLocaleDateString(undefined, {day: "numeric", month: "long", year: "numeric"});
      }

      function renderHomeList() {
         const activeScripts = allScripts.filter(s => !s.archived);

         if (activeScripts.length === 0) {
            homeList.innerHTML = `<div class="empty-state">No scripts added yet.</div>`;
            return;
         }

         // Group by calendar day.
         const groups = {}; // dayKey -> { sampleTimestamp, scripts: [] }
         activeScripts.forEach(script => {
            const key = getDayKey(script.createdAt);
            if (!groups[key]) {
               groups[key] = {sampleTimestamp: script.createdAt, scripts: []};
            }
            groups[key].scripts.push(script);
         });

         // Newest day first, then only the two most recent days that have scripts.
         const sortedKeys = Object.keys(groups).sort(
            (a, b) => new Date(groups[b].sampleTimestamp) - new Date(groups[a].sampleTimestamp)
         );
         const topKeys = sortedKeys.slice(0, 2);

         homeList.innerHTML = "";
         topKeys.forEach(key => {
            const group = groups[key];
            const scriptsForDay = group.scripts
               .slice()
               .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first within the day

            const heading = document.createElement("h2");
            heading.className = "section-heading home-date-heading";
            heading.textContent = formatDayHeading(group.sampleTimestamp);
            homeList.appendChild(heading);

            scriptsForDay.forEach(script => {
               const cardEl = buildCardElement(script, {withCheckboxes: false, withDelete: false, withEdit: false, withComments: false, withReactions: false, editing: false});
               homeList.appendChild(cardEl);
            });
         });
      }

      /* ============================================================
         SCRIPTS VIEW
         Rendered entirely from the local `allScripts` cache, filtered
         in memory. Individual operations (toggle/add/edit/delete)
         patch this list directly instead of calling this function.
      ============================================================ */
      const scriptsList = document.getElementById("scriptsList");

      function getFilteredFromState() {
         return allScripts.filter(script => scriptMatchesAllFilters(script));
      }

      function scriptMatchesNameFilter(script) {
         if (nameFilter === "all") return true;
         return getCreatorDisplayName(script) === nameFilter;
      }

      function scriptMatchesDateFilter(script) {
         if (dateFilter === "all") return true;

         const created = new Date(script.createdAt);
         const now = new Date();
         const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
         const startOfTomorrow = new Date(startOfToday);
         startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

         if (dateFilter === "today") {
            return created >= startOfToday && created < startOfTomorrow;
         }

         if (dateFilter === "yesterday") {
            const startOfYesterday = new Date(startOfToday);
            startOfYesterday.setDate(startOfYesterday.getDate() - 1);
            return created >= startOfYesterday && created < startOfToday;
         }

         if (dateFilter === "last7") {
            const sevenDaysAgo = new Date(startOfToday);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // includes today
            return created >= sevenDaysAgo && created < startOfTomorrow;
         }

         if (dateFilter === "last30") {
            const oneMonthAgo = new Date(now);
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            return created >= oneMonthAgo && created <= now;
         }

         return true;
      }

      function renderScriptsList() {
         const scripts = getFilteredFromState();

         if (scripts.length === 0) {
            scriptsList.innerHTML = `<div class="empty-state">No scripts here.</div>`;
            return;
         }

         scriptsList.innerHTML = "";
         scripts.forEach(script => {
            const cardEl = buildCardElement(script, {
               withCheckboxes: true,
               withDelete: true,
               withEdit: true,
               withComments: true,
               withReactions: true,
               editing: script.id === editingId
            });
            attachCardListeners(cardEl, script);
            scriptsList.appendChild(cardEl);
         });
      }

      /* ============================================================
         ARCHIVE VIEW
         Read-only display of archived scripts (moved here either via
         Delete or automatically when marked Done), plus a Restore
         button. Rendered entirely from the local `allScripts` cache.
      ============================================================ */
      const archiveList = document.getElementById("archiveList");

      function archiveCardHtml(script) {
         const doneClass = script.done ? "done" : "not-done";
         const doneText = script.done ? "Done" : "Not Done";
         const creatorName = getCreatorDisplayName(script) || "Unknown";
         const myReaction = reactionsCache[script.id];
         const reactionText = myReaction === "like" ? "\uD83D\uDC4D Liked" : myReaction === "dislike" ? "\uD83D\uDC4E Disliked" : "No reaction";
         const commentLabel = commentCountLabel(commentCountsCache[script.id] || 0);

         return `
      <div class="script-card" data-id="${script.id}">
        <div class="script-body">
          <p class="script-title ${script.done ? "done" : ""}">${escapeHtml(script.title)}</p>
          <p class="script-desc">${escapeHtml(script.description)}</p>
          <div class="script-meta">
            <span class="status-badge done-badge ${doneClass}">${doneText}</span>
            <span class="date-text">${formatDate(script.createdAt)}</span>
          </div>
          <p class="added-by">Added by: ${escapeHtml(creatorName)}</p>
          <p class="added-by">${escapeHtml(reactionText)} &middot; &#128172; ${commentLabel}</p>
        </div>
        <div class="card-actions">
          <button class="restore-btn btn btn-secondary" type="button">Restore</button>
        </div>
      </div>
    `;
      }

      function buildArchiveCardElement(script) {
         const wrapper = document.createElement("div");
         wrapper.innerHTML = archiveCardHtml(script).trim();
         const cardEl = wrapper.firstElementChild;

         const restoreBtn = cardEl.querySelector(".restore-btn");
         if (restoreBtn) {
            restoreBtn.addEventListener("click", () => handleRestore(script.id, cardEl));
         }

         return cardEl;
      }

      function renderArchiveList() {
         const archivedScripts = allScripts
            .filter(s => s.archived)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

         if (archivedScripts.length === 0) {
            archiveList.innerHTML = `<div class="empty-state">Archive is empty.</div>`;
            return;
         }

         archiveList.innerHTML = "";
         archivedScripts.forEach(script => {
            archiveList.appendChild(buildArchiveCardElement(script));
         });
      }

      async function handleRestore(id, cardEl) {
         const restoreBtn = cardEl.querySelector(".restore-btn");
         if (restoreBtn) restoreBtn.disabled = true;

         const {error} = await restoreScript(id);

         if (error) {
            if (restoreBtn) restoreBtn.disabled = false;
            showCardError(cardEl, "Couldn't restore script.");
            return;
         }

         const script = allScripts.find(s => s.id === id);
         if (script) script.archived = false;

         cardEl.remove();
         ensureEmptyStateIfNeeded(archiveList, "Archive is empty.");

         // Restoring can change what Scripts/Home should show, and Home's
         // date grouping may shift too — both are cheap in-memory re-renders.
         renderScriptsList();
         renderHomeList();
      }

      /* ============================================================
         PER-CARD EVENT HANDLERS
         Each handler updates local state + the DOM directly, and
         only re-syncs with Supabase for its own single operation.
      ============================================================ */
      function attachCardListeners(cardEl, script) {
         const id = script.id;

         const doneCheckbox = cardEl.querySelector(".done-checkbox");
         if (doneCheckbox) {
            doneCheckbox.addEventListener("change", () => handleToggleDone(id, cardEl));
         }

         const likeBtn = cardEl.querySelector(".like-btn");
         if (likeBtn) {
            likeBtn.addEventListener("click", () => handleReactionClick(id, cardEl, "like"));
         }

         const dislikeBtn = cardEl.querySelector(".dislike-btn");
         if (dislikeBtn) {
            dislikeBtn.addEventListener("click", () => handleReactionClick(id, cardEl, "dislike"));
         }

         const deleteBtn = cardEl.querySelector(".delete-btn");
         if (deleteBtn) {
            deleteBtn.addEventListener("click", () => handleDelete(id, cardEl));
         }

         const editBtn = cardEl.querySelector(".edit-btn");
         if (editBtn) {
            editBtn.addEventListener("click", () => handleEditStart(id));
         }

         const editCancelBtn = cardEl.querySelector(".edit-cancel-btn");
         if (editCancelBtn) {
            editCancelBtn.addEventListener("click", () => handleEditCancel(id));
         }

         const editSaveBtn = cardEl.querySelector(".edit-save-btn");
         if (editSaveBtn) {
            editSaveBtn.addEventListener("click", () => handleEditSave(id, cardEl));
         }

         const commentsToggleBtn = cardEl.querySelector(".comments-toggle-btn");
         if (commentsToggleBtn) {
            commentsToggleBtn.addEventListener("click", () => handleToggleComments(id, cardEl));
         }

         const commentSubmitBtn = cardEl.querySelector(".comment-submit-btn");
         if (commentSubmitBtn) {
            commentSubmitBtn.addEventListener("click", () => handleAddComment(id, cardEl));
         }

         // Event delegation for comment Edit/Delete/Save/Cancel — a single
         // listener on the list handles every comment, including ones
         // added or re-rendered later, so no duplicate listeners pile up.
         const commentsListEl = cardEl.querySelector(".comments-list");
         if (commentsListEl) {
            commentsListEl.addEventListener("click", (e) => handleCommentsListClick(e, id));
         }
      }

      function handleCommentsListClick(e, scriptId) {
         const editBtn = e.target.closest(".comment-edit-btn");
         if (editBtn) {
            const commentItem = editBtn.closest(".comment-item");
            handleCommentEditStart(scriptId, commentItem);
            return;
         }

         const deleteBtn = e.target.closest(".comment-delete-btn");
         if (deleteBtn) {
            const commentItem = deleteBtn.closest(".comment-item");
            handleCommentDelete(scriptId, commentItem);
            return;
         }

         const saveBtn = e.target.closest(".comment-save-btn");
         if (saveBtn) {
            const commentItem = saveBtn.closest(".comment-item");
            handleCommentSave(scriptId, commentItem);
            return;
         }

         const cancelBtn = e.target.closest(".comment-cancel-btn");
         if (cancelBtn) {
            const commentItem = cancelBtn.closest(".comment-item");
            handleCommentCancel(scriptId, commentItem);
            return;
         }
      }

      function handleCommentEditStart(scriptId, commentItem) {
         if (!commentItem) return;
         const commentId = commentItem.dataset.commentId;
         const comment = findCachedComment(scriptId, commentId);
         if (!comment) return;

         const newItem = buildCommentElement(comment, true);
         commentItem.replaceWith(newItem);
      }

      function handleCommentCancel(scriptId, commentItem) {
         if (!commentItem) return;
         const commentId = commentItem.dataset.commentId;
         const comment = findCachedComment(scriptId, commentId);
         if (!comment) return;

         const newItem = buildCommentElement(comment, false);
         commentItem.replaceWith(newItem);
      }

      async function handleCommentSave(scriptId, commentItem) {
         if (!commentItem) return;
         const commentId = commentItem.dataset.commentId;
         const textarea = commentItem.querySelector(".comment-edit-input");
         const newText = textarea.value.trim();

         if (!newText) {
            textarea.focus();
            return;
         }

         const saveBtn = commentItem.querySelector(".comment-save-btn");
         const cancelBtn = commentItem.querySelector(".comment-cancel-btn");
         if (saveBtn) saveBtn.disabled = true;
         if (cancelBtn) cancelBtn.disabled = true;

         const {error} = await updateComment(commentId, newText);

         if (error) {
            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            showCommentError(commentItem, "Couldn't save comment.");
            return;
         }

         const comment = findCachedComment(scriptId, commentId);
         if (comment) comment.text = newText;

         const newItem = buildCommentElement(comment, false);
         commentItem.replaceWith(newItem);
      }

      async function handleCommentDelete(scriptId, commentItem) {
         if (!commentItem) return;
         const commentId = commentItem.dataset.commentId;

         const confirmed = window.confirm("Delete this comment?");
         if (!confirmed) return;

         const deleteBtn = commentItem.querySelector(".comment-delete-btn");
         if (deleteBtn) deleteBtn.disabled = true;

         const {error} = await deleteComment(commentId);

         if (error) {
            if (deleteBtn) deleteBtn.disabled = false;
            showCommentError(commentItem, "Couldn't delete comment.");
            return;
         }

         if (commentsCache[scriptId]) {
            commentsCache[scriptId] = commentsCache[scriptId].filter(c => String(c.id) !== String(commentId));
         }

         commentCountsCache[scriptId] = Math.max(0, (commentCountsCache[scriptId] || 1) - 1);
         const cardEl = commentItem.closest(".script-card");
         if (cardEl) updateCommentCountButton(cardEl, scriptId);

         const listEl = commentItem.parentElement;
         commentItem.remove();

         if (listEl && listEl.children.length === 0) {
            listEl.innerHTML = `<div class="comments-empty">No comments yet.</div>`;
         }
      }

      async function handleReactionClick(scriptId, cardEl, clickedReaction) {
         if (!scriptId) {
            console.error("Reaction error:", new Error("Missing script id"));
            return;
         }

         // Re-check the live session on every click rather than trusting
         // the cached currentUserId — if the session ever expired, this
         // catches it and tells the user instead of failing silently.
         const {data: userData, error: userError} = await supabaseClient.auth.getUser();
         if (userError) {
            console.error("Reaction error:", userError);
         }
         const liveUserId = userData && userData.user ? userData.user.id : null;

         if (!liveUserId) {
            showCardError(cardEl, "Please login first.");
            return;
         }
         currentUserId = liveUserId; // keep the cache in sync with the live session

         const likeBtn = cardEl.querySelector(".like-btn");
         const dislikeBtn = cardEl.querySelector(".dislike-btn");
         const previousReaction = reactionsCache[scriptId]; // "like" | "dislike" | undefined

         // Clicking the already-selected reaction clears it; otherwise
         // it becomes the newly clicked one (like <-> dislike switches).
         const nextReaction = previousReaction === clickedReaction ? null : clickedReaction;

         // Optimistic update
         if (nextReaction) {
            reactionsCache[scriptId] = nextReaction;
         } else {
            delete reactionsCache[scriptId];
         }
         applyReactionUI(cardEl, nextReaction);
         if (likeBtn) likeBtn.disabled = true;
         if (dislikeBtn) dislikeBtn.disabled = true;

         let result;
         if (nextReaction === null) {
            result = await removeReaction(scriptId);
         } else {
            result = await setReaction(scriptId, nextReaction);
         }

         if (likeBtn) likeBtn.disabled = false;
         if (dislikeBtn) dislikeBtn.disabled = false;

         if (result.error) {
            console.error("Reaction error:", result.error);
            // Revert on failure
            if (previousReaction) {
               reactionsCache[scriptId] = previousReaction;
            } else {
               delete reactionsCache[scriptId];
            }
            applyReactionUI(cardEl, previousReaction);
            showCardError(cardEl, "Couldn't save your reaction.");
         }
      }

      function applyReactionUI(cardEl, reaction) {
         const likeBtn = cardEl.querySelector(".like-btn");
         const dislikeBtn = cardEl.querySelector(".dislike-btn");
         if (likeBtn) likeBtn.classList.toggle("active-like", reaction === "like");
         if (dislikeBtn) dislikeBtn.classList.toggle("active-dislike", reaction === "dislike");
      }

      async function handleToggleDone(id, cardEl) {
         const script = allScripts.find(s => s.id === id);
         if (!script) return;

         const checkbox = cardEl.querySelector(".done-checkbox");
         const previousDone = script.done;
         const previousArchived = script.archived;
         const nextDone = !previousDone;
         const nextArchived = nextDone ? true : previousArchived; // completing a script also archives it

         // Optimistic update
         script.done = nextDone;
         script.archived = nextArchived;
         if (checkbox) checkbox.disabled = true;
         syncCardEverywhere(script);

         const {error} = await toggleDone(id, previousDone);

         if (checkbox) checkbox.disabled = false;

         if (error) {
            // Revert on failure
            script.done = previousDone;
            script.archived = previousArchived;
            if (checkbox) checkbox.checked = previousDone;
            syncCardEverywhere(script);
            showCardError(cardEl, "Couldn't update Done status.");
            return;
         }

         if (!scriptMatchesAllFilters(script)) {
            cardEl.remove();
            ensureEmptyStateIfNeeded(scriptsList, "No scripts here.");
         }

         // Marking Done archives the script, which can change Home's
         // date groupings (the script disappears from Home entirely).
         renderHomeList();
      }

      async function handleDelete(id, cardEl) {
         const confirmed = window.confirm("Move this script to Archive?");
         if (!confirmed) return;

         const deleteBtn = cardEl.querySelector(".delete-btn");
         if (deleteBtn) deleteBtn.disabled = true;

         const {error} = await deleteScript(id); // soft-archives, does not delete the row

         if (error) {
            if (deleteBtn) deleteBtn.disabled = false;
            showCardError(cardEl, "Couldn't archive script.");
            return;
         }

         const script = allScripts.find(s => s.id === id);
         if (script) script.archived = true;

         cardEl.remove();
         ensureEmptyStateIfNeeded(scriptsList, "No scripts here.");

         // The script leaves Home too (archived scripts never show there),
         // which can also change which two days Home displays.
         renderHomeList();
      }

      function handleEditStart(id) {
         const script = allScripts.find(s => s.id === id);
         const oldCard = scriptsList.querySelector(`.script-card[data-id="${id}"]`);
         if (!script || !oldCard) return;

         editingId = id;
         const newCard = buildCardElement(script, {withCheckboxes: true, withDelete: true, withEdit: true, withComments: true, withReactions: true, editing: true});
         attachCardListeners(newCard, script);
         oldCard.replaceWith(newCard);
      }

      function handleEditCancel(id) {
         const script = allScripts.find(s => s.id === id);
         const oldCard = scriptsList.querySelector(`.script-card[data-id="${id}"]`);
         if (!script || !oldCard) return;

         editingId = null;
         const newCard = buildCardElement(script, {withCheckboxes: true, withDelete: true, withEdit: true, withComments: true, withReactions: true, editing: false});
         attachCardListeners(newCard, script);
         oldCard.replaceWith(newCard);
      }

      async function handleEditSave(id, cardEl) {
         const titleInput = cardEl.querySelector(".edit-title-input");
         const descInput = cardEl.querySelector(".edit-desc-input");
         const newTitle = titleInput.value.trim();
         const newDesc = descInput.value.trim();

         if (!newTitle) {
            titleInput.focus();
            return;
         }

         const saveBtn = cardEl.querySelector(".edit-save-btn");
         const cancelBtn = cardEl.querySelector(".edit-cancel-btn");
         if (saveBtn) saveBtn.disabled = true;
         if (cancelBtn) cancelBtn.disabled = true;

         const {error} = await updateScript(id, newTitle, newDesc);

         if (error) {
            if (saveBtn) saveBtn.disabled = false;
            if (cancelBtn) cancelBtn.disabled = false;
            showCardError(cardEl, "Couldn't save changes.");
            return;
         }

         const script = allScripts.find(s => s.id === id);
         if (script) {
            script.title = newTitle;
            script.description = newDesc;
         }
         editingId = null;

         const newCard = buildCardElement(script, {withCheckboxes: true, withDelete: true, withEdit: true, withComments: true, withReactions: true, editing: false});
         attachCardListeners(newCard, script);
         cardEl.replaceWith(newCard);

         const homeCard = homeList.querySelector(`.script-card[data-id="${id}"]`);
         if (homeCard) {
            const newHomeCard = buildCardElement(script, {withCheckboxes: false, withDelete: false, withEdit: false, withComments: false, withReactions: false, editing: false});
            homeCard.replaceWith(newHomeCard);
         }
      }

      /* ============================================================
         COMMENTS
         Comments are lazily loaded the first time a script's panel is
         opened, then cached in `commentsCache`. Posting a comment only
         updates that script's own panel — never the whole list.
      ============================================================ */
      async function handleToggleComments(scriptId, cardEl) {
         const panel = cardEl.querySelector(".comments-panel");
         if (!panel) return;

         const isOpening = !panel.classList.contains("active");
         panel.classList.toggle("active");

         if (isOpening && panel.dataset.loaded !== "true") {
            const list = panel.querySelector(".comments-list");
            list.innerHTML = `<div class="comments-empty">Loading comments...</div>`;

            const comments = await getComments(scriptId);
            commentsCache[scriptId] = comments;
            panel.dataset.loaded = "true";

            list.innerHTML = comments.length
               ? comments.map(commentHtml).join("")
               : `<div class="comments-empty">No comments yet.</div>`;
         }
      }

      async function handleAddComment(scriptId, cardEl) {
         const panel = cardEl.querySelector(".comments-panel");
         if (!panel) return;

         const input = panel.querySelector(".comment-input");
         const submitBtn = panel.querySelector(".comment-submit-btn");
         const text = input.value.trim();

         if (!text) {
            input.focus();
            return;
         }

         submitBtn.disabled = true;
         const newComment = await addComment(scriptId, text);
         submitBtn.disabled = false;

         if (!newComment) {
            showCardError(cardEl, "Couldn't post comment.");
            return;
         }

         input.value = "";

         if (!commentsCache[scriptId]) commentsCache[scriptId] = [];
         commentsCache[scriptId].push(newComment);
         panel.dataset.loaded = "true";

         commentCountsCache[scriptId] = (commentCountsCache[scriptId] || 0) + 1;
         updateCommentCountButton(cardEl, scriptId);

         const list = panel.querySelector(".comments-list");
         const emptyMsg = list.querySelector(".comments-empty");
         if (emptyMsg) emptyMsg.remove();
         list.insertAdjacentHTML("beforeend", commentHtml(newComment));
      }

      /* Filter buttons — re-render Scripts view from local state, no fetch. */
      document.querySelectorAll(".filter-btn").forEach(btn => {
         btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.dataset.filter;
            renderScriptsList();
         });
      });

      /* ============================================================
         EXTRA FILTER PANEL (Name + Date)
         A separate popover next to the existing status tray. It never
         touches `currentFilter` — it only sets `nameFilter`/`dateFilter`,
         which combine with the status tray via scriptMatchesAllFilters.
      ============================================================ */
      const filterPanelBtn = document.getElementById("filterPanelBtn");
      const filterPanel = document.getElementById("filterPanel");
      const nameFilterSelect = document.getElementById("nameFilterSelect");
      const dateFilterSelect = document.getElementById("dateFilterSelect");
      const filterApplyBtn = document.getElementById("filterApplyBtn");
      const filterClearBtn = document.getElementById("filterClearBtn");

      // Rebuilds the Name dropdown from whichever creators currently
      // exist in `allScripts`, without hardcoding any names.
      function populateNameFilterOptions() {
         const previousValue = nameFilterSelect.value;
         const names = new Set();

         allScripts.forEach(script => {
            const name = getCreatorDisplayName(script);
            if (name) names.add(name);
         });

         const sortedNames = Array.from(names).sort((a, b) => a.localeCompare(b));

         nameFilterSelect.innerHTML = `<option value="all">All</option>` +
            sortedNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");

         const stillExists = Array.from(nameFilterSelect.options).some(opt => opt.value === previousValue);
         nameFilterSelect.value = stillExists ? previousValue : "all";
      }

      filterPanelBtn.addEventListener("click", (e) => {
         e.stopPropagation();
         const opening = !filterPanel.classList.contains("active");
         if (opening) populateNameFilterOptions();
         filterPanel.classList.toggle("active");
      });

      // Close the panel when clicking anywhere outside it.
      document.addEventListener("click", (e) => {
         if (!e.target.closest(".filter-panel-wrapper")) {
            filterPanel.classList.remove("active");
         }
      });

      filterApplyBtn.addEventListener("click", () => {
         nameFilter = nameFilterSelect.value;
         dateFilter = dateFilterSelect.value;
         filterPanel.classList.remove("active");
         renderScriptsList();
      });

      filterClearBtn.addEventListener("click", () => {
         nameFilter = "all";
         dateFilter = "all";
         nameFilterSelect.value = "all";
         dateFilterSelect.value = "all";
         filterPanel.classList.remove("active");
         renderScriptsList();
      });

      /* ============================================================
         ADD SCRIPT FORM
      ============================================================ */
      const addForm = document.getElementById("addForm");
      const showAddFormBtn = document.getElementById("showAddFormBtn");
      const cancelAddBtn = document.getElementById("cancelAddBtn");
      const submitAddBtn = document.getElementById("submitAddBtn");
      const newTitleInput = document.getElementById("newTitle");
      const newDescInput = document.getElementById("newDesc");

      showAddFormBtn.addEventListener("click", () => {
         addForm.classList.add("active");
         newTitleInput.focus();
      });

      cancelAddBtn.addEventListener("click", closeAddForm);

      function closeAddForm() {
         addForm.classList.remove("active");
         newTitleInput.value = "";
         newDescInput.value = "";
      }

      function scriptMatchesAllFilters(script) {
         if (script.archived) return false; // active Scripts view never shows archived scripts
         return scriptMatchesCurrentFilter(script) && scriptMatchesNameFilter(script) && scriptMatchesDateFilter(script);
      }

      submitAddBtn.addEventListener("click", async () => {
         const title = newTitleInput.value.trim();
         const description = newDescInput.value.trim();

         if (!title) {
            newTitleInput.focus();
            return;
         }

         submitAddBtn.disabled = true;
         const newScript = await addScript(title, description);
         submitAddBtn.disabled = false;

         if (!newScript) {
            showFormError("Couldn't add script. Please try again.");
            return;
         }

         closeAddForm();

         // Newest first — this script is the newest, so it goes at the front.
         allScripts.unshift(newScript);

         if (scriptMatchesAllFilters(newScript)) {
            removeEmptyState(scriptsList);
            const newCard = buildCardElement(newScript, {withCheckboxes: true, withDelete: true, withEdit: true, withComments: true, withReactions: true, editing: false});
            attachCardListeners(newCard, newScript);
            scriptsList.prepend(newCard);
         }

         // Home is grouped by date, so a fresh in-memory re-render (no
         // network call) is simpler and safer than patching one card in.
         renderHomeList();
      });

      /* ============================================================
         INITIAL LOAD
         The only place that fetches everything from Supabase.
      ============================================================ */
      async function loadInitialData() {
         homeList.innerHTML = `<div class="empty-state">Loading...</div>`;
         scriptsList.innerHTML = `<div class="empty-state">Loading...</div>`;
         commentsCache = {};

         const [scripts, reactions, nameMap, commentCounts] = await Promise.all([
            getScripts(),
            getMyReactions(),
            getEmailToNameMap(),
            getCommentCounts()
         ]);

         allScripts = scripts; // already newest first
         reactionsCache = reactions;
         emailToNameMap = nameMap;
         commentCountsCache = commentCounts;

         renderHomeList();
         renderScriptsList();
         renderArchiveList();
      }