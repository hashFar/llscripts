import {state} from "../state/store.js";
import {getDayKey, formatDayHeading} from "../ui/helpers.js";
import {buildCardElement} from "../ui/script-card.js";

/* ============================================================
   HOME VIEW
   Rendered entirely from the local `allScripts` cache, grouped by
   calendar day. Shows only the two most recent days that actually
   contain at least one (non-archived) script — not necessarily
   calendar-consecutive days.
============================================================ */
export const homeList = document.getElementById("homeList");

export function renderHomeList() {
   const activeScripts = state.allScripts.filter(s => !s.archived);

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
