import {state} from "../state/store.js";
import {escapeHtml, formatDate, commentCountLabel, getCreatorDisplayName} from "./helpers.js";
import {commentHtml} from "./comment-card.js";

/* ============================================================
   SCRIPT CARD — HTML builders for script cards (Home, Scripts, Archive).
============================================================ */

export function scriptCardHtml(script, {withCheckboxes, withDelete, withEdit, withComments, withReactions, editing}) {
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

   const cachedComments = state.commentsCache[script.id];
   const commentsListHtml = cachedComments
      ? (cachedComments.length ? cachedComments.map(commentHtml).join("") : `<div class="comments-empty">No comments yet.</div>`)
      : "";
   const commentsLoadedAttr = cachedComments ? "true" : "false";

   const myReaction = state.reactionsCache[script.id]; // "like" | "dislike" | undefined
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
            <button class="comments-toggle-btn" type="button">&#128172; ${commentCountLabel(state.commentCountsCache[script.id] || 0)}</button>
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
export function buildCardElement(script, opts) {
   const wrapper = document.createElement("div");
   wrapper.innerHTML = scriptCardHtml(script, opts).trim();
   return wrapper.firstElementChild;
}

// Keeps the Done badge and the strike-through title in sync with the script.
export function updateBadgesAndTitle(cardEl, script) {
   const titleEl = cardEl.querySelector(".script-title");
   if (titleEl) titleEl.classList.toggle("done", script.done);

   const doneBadge = cardEl.querySelector(".done-badge");
   if (doneBadge) {
      doneBadge.classList.remove("done", "not-done");
      doneBadge.classList.add(script.done ? "done" : "not-done");
      doneBadge.textContent = script.done ? "Done" : "Not Done";
   }
}

// Read-only card shown in the Archive tab, with a Restore button.
export function archiveCardHtml(script) {
   const doneClass = script.done ? "done" : "not-done";
   const doneText = script.done ? "Done" : "Not Done";
   const creatorName = getCreatorDisplayName(script) || "Unknown";
   const myReaction = state.reactionsCache[script.id];
   const reactionText = myReaction === "like" ? "👍 Liked" : myReaction === "dislike" ? "👎 Disliked" : "No reaction";
   const commentLabel = commentCountLabel(state.commentCountsCache[script.id] || 0);

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
