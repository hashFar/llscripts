import {state} from "../state/store.js";
import {buildCardElement} from "../ui/script-card.js";
import {scriptMatchesAllFilters} from "../features/filters.js";
import {attachCardListeners} from "../features/scripts.js";

/* ============================================================
   SCRIPTS VIEW
   Rendered entirely from the local `allScripts` cache, filtered
   in memory. Individual operations (toggle/add/edit/delete)
   patch this list directly instead of calling this function.
============================================================ */
export const scriptsList = document.getElementById("scriptsList");

function getFilteredFromState() {
   return state.allScripts.filter(script => scriptMatchesAllFilters(script));
}

export function renderScriptsList() {
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
         editing: script.id === state.editingId
      });
      attachCardListeners(cardEl, script);
      scriptsList.appendChild(cardEl);
   });
}
