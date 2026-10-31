import {state} from "../state/store.js";
import {escapeHtml, formatDateTime} from "./helpers.js";

/* ============================================================
   COMMENT CARD — HTML builders for a single comment.
============================================================ */

export function commentHtml(c) {
   const isOwner = c.userId === state.currentUserId;
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
export function commentEditHtml(c) {
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
export function buildCommentElement(comment, editing) {
   const wrapper = document.createElement("div");
   wrapper.innerHTML = (editing ? commentEditHtml(comment) : commentHtml(comment)).trim();
   return wrapper.firstElementChild;
}
