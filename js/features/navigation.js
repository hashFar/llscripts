import {renderHomeList} from "../views/home.view.js";
import {renderScriptsList} from "../views/scripts.view.js";
import {renderArchiveList} from "../views/archive.view.js";

/* ============================================================
   TABS
   Switching tabs never re-fetches from Supabase — it just
   re-renders from the local `allScripts` cache.
============================================================ */
export function initNavigation() {
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
}
