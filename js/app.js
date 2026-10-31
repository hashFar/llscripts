import {state} from "./state/store.js";
import {getScripts} from "./services/scripts.service.js";
import {getMyReactions} from "./services/reactions.service.js";
import {getEmailToNameMap} from "./services/profiles.service.js";
import {getCommentCounts} from "./services/comments.service.js";
import {initTheme} from "./features/theme.js";
import {initAuth} from "./features/auth.js";
import {initNavigation} from "./features/navigation.js";
import {initFilters} from "./features/filters.js";
import {initAddScriptForm} from "./features/scripts.js";
import {homeList, renderHomeList} from "./views/home.view.js";
import {scriptsList, renderScriptsList} from "./views/scripts.view.js";
import {renderArchiveList} from "./views/archive.view.js";

/* ============================================================
   APP ENTRY POINT
   Connects every module together and starts the app.
============================================================ */

/* INITIAL LOAD
   The only place that fetches everything from Supabase. */
async function loadInitialData() {
   homeList.innerHTML = `<div class="empty-state">Loading...</div>`;
   scriptsList.innerHTML = `<div class="empty-state">Loading...</div>`;
   state.commentsCache = {};

   const [scripts, reactions, nameMap, commentCounts] = await Promise.all([
      getScripts(),
      getMyReactions(),
      getEmailToNameMap(),
      getCommentCounts()
   ]);

   state.allScripts = scripts; // already newest first
   state.reactionsCache = reactions;
   state.emailToNameMap = nameMap;
   state.commentCountsCache = commentCounts;

   renderHomeList();
   renderScriptsList();
   renderArchiveList();
}

// Theme first, so the right colours show before anything else appears.
initTheme();
initNavigation();
initFilters();
initAddScriptForm();
// Auth last: it checks for an existing session and may load data right away.
initAuth(loadInitialData);
