import {state} from "../state/store.js";
import {escapeHtml, getCreatorDisplayName} from "../ui/helpers.js";
import {renderScriptsList} from "../views/scripts.view.js";

/* ============================================================
   FILTERS
   Status filter buttons plus the extra Name/Date filter panel.
   The panel never touches `currentFilter` — it only sets
   `nameFilter`/`dateFilter`, which combine with the status
   buttons via scriptMatchesAllFilters.
============================================================ */

function scriptMatchesCurrentFilter(script) {
   const filter = state.currentFilter;
   if (filter === "done") return script.done;
   if (filter === "not-done") return !script.done;
   if (filter === "approved") return script.approved;
   if (filter === "not-approved") return !script.approved;
   if (filter === "rejected") return script.rejected;
   return true; // all
}

function scriptMatchesNameFilter(script) {
   if (state.nameFilter === "all") return true;
   return getCreatorDisplayName(script) === state.nameFilter;
}

function scriptMatchesDateFilter(script) {
   const dateFilter = state.dateFilter;
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

export function scriptMatchesAllFilters(script) {
   if (script.archived) return false; // active Scripts view never shows archived scripts
   return scriptMatchesCurrentFilter(script) && scriptMatchesNameFilter(script) && scriptMatchesDateFilter(script);
}

export function initFilters() {
   const filterPanelBtn = document.getElementById("filterPanelBtn");
   const filterPanel = document.getElementById("filterPanel");
   const nameFilterSelect = document.getElementById("nameFilterSelect");
   const dateFilterSelect = document.getElementById("dateFilterSelect");
   const filterApplyBtn = document.getElementById("filterApplyBtn");
   const filterClearBtn = document.getElementById("filterClearBtn");

   /* Filter buttons — re-render Scripts view from local state, no fetch. */
   document.querySelectorAll(".filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
         document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
         btn.classList.add("active");
         state.currentFilter = btn.dataset.filter;
         renderScriptsList();
      });
   });

   // Rebuilds the Name dropdown from whichever creators currently
   // exist in `allScripts`, without hardcoding any names.
   function populateNameFilterOptions() {
      const previousValue = nameFilterSelect.value;
      const names = new Set();

      state.allScripts.forEach(script => {
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
      state.nameFilter = nameFilterSelect.value;
      state.dateFilter = dateFilterSelect.value;
      filterPanel.classList.remove("active");
      renderScriptsList();
   });

   filterClearBtn.addEventListener("click", () => {
      state.nameFilter = "all";
      state.dateFilter = "all";
      nameFilterSelect.value = "all";
      dateFilterSelect.value = "all";
      filterPanel.classList.remove("active");
      renderScriptsList();
   });
}
