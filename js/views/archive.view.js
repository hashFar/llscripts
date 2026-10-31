import {state} from "../state/store.js";
import {archiveCardHtml} from "../ui/script-card.js";
import {handleRestore} from "../features/archive.js";

/* ============================================================
   ARCHIVE VIEW
   Read-only display of archived scripts (moved here either via
   Delete or automatically when marked Done), plus a Restore
   button. Rendered entirely from the local `allScripts` cache.
============================================================ */
export const archiveList = document.getElementById("archiveList");

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

export function renderArchiveList() {
   const archivedScripts = state.allScripts
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
