import {state} from "../state/store.js";

/* ============================================================
   UI HELPERS — small formatting and DOM utilities used everywhere.
============================================================ */

export function formatDate(timestamp) {
   const d = new Date(timestamp);
   return d.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
}

export function formatDateTime(timestamp) {
   const d = new Date(timestamp);
   return d.toLocaleString(undefined, {year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"});
}

export function escapeHtml(str) {
   const div = document.createElement("div");
   div.textContent = str;
   return div.innerHTML;
}

// A stable per-day key based on the user's local calendar day.
export function getDayKey(timestamp) {
   const d = new Date(timestamp);
   return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// "Today" / "Yesterday" / "10 September 2026"
export function formatDayHeading(timestamp) {
   const d = new Date(timestamp);
   const now = new Date();
   const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
   const startOfThatDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
   const diffDays = Math.round((startOfToday - startOfThatDay) / (1000 * 60 * 60 * 24));

   if (diffDays === 0) return "Today";
   if (diffDays === 1) return "Yesterday";
   return d.toLocaleDateString(undefined, {day: "numeric", month: "long", year: "numeric"});
}

// Formats a comment count with correct singular/plural wording.
export function commentCountLabel(count) {
   return count === 1 ? "1 Comment" : `${count} Comments`;
}

// Returns the display name for whoever created a script, falling
// back to their email if no profile name could be found.
export function getCreatorDisplayName(script) {
   if (!script.createdByEmail) return null;
   return state.emailToNameMap[script.createdByEmail] || script.createdByEmail;
}

export function showCardError(cardEl, message) {
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

export function showCommentError(commentItem, message) {
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

export function removeEmptyState(container) {
   const empty = container.querySelector(".empty-state");
   if (empty) empty.remove();
}

export function ensureEmptyStateIfNeeded(container, message) {
   if (!container.querySelector(".script-card")) {
      container.innerHTML = `<div class="empty-state">${message}</div>`;
   }
}
