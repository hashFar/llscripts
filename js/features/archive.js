import {state} from "../state/store.js";
import {restoreScript} from "../services/scripts.service.js";
import {showCardError, ensureEmptyStateIfNeeded} from "../ui/helpers.js";
import {archiveList} from "../views/archive.view.js";
import {renderScriptsList} from "../views/scripts.view.js";
import {renderHomeList} from "../views/home.view.js";

/* ============================================================
   ARCHIVE — restoring archived scripts.
============================================================ */
export async function handleRestore(id, cardEl) {
   const restoreBtn = cardEl.querySelector(".restore-btn");
   if (restoreBtn) restoreBtn.disabled = true;

   const {error} = await restoreScript(id);

   if (error) {
      if (restoreBtn) restoreBtn.disabled = false;
      showCardError(cardEl, "Couldn't restore script.");
      return;
   }

   const script = state.allScripts.find(s => s.id === id);
   if (script) script.archived = false;

   cardEl.remove();
   ensureEmptyStateIfNeeded(archiveList, "Archive is empty.");

   // Restoring can change what Scripts/Home should show, and Home's
   // date grouping may shift too — both are cheap in-memory re-renders.
   renderScriptsList();
   renderHomeList();
}
