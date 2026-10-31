import {state} from "../state/store.js";
import {getComments, addComment, updateComment, deleteComment} from "../services/comments.service.js";
import {commentCountLabel, showCardError, showCommentError} from "../ui/helpers.js";
import {commentHtml, buildCommentElement} from "../ui/comment-card.js";
import {confirmAction} from "../ui/modal.js";

/* ============================================================
   COMMENTS
   Comments are lazily loaded the first time a script's panel is
   opened, then cached in `state.commentsCache`. Posting a comment
   only updates that script's own panel — never the whole list.
============================================================ */

// Wires up every comment-related control on one script card.
export function attachCommentListeners(cardEl, scriptId) {
   const commentsToggleBtn = cardEl.querySelector(".comments-toggle-btn");
   if (commentsToggleBtn) {
      commentsToggleBtn.addEventListener("click", () => handleToggleComments(scriptId, cardEl));
   }

   const commentSubmitBtn = cardEl.querySelector(".comment-submit-btn");
   if (commentSubmitBtn) {
      commentSubmitBtn.addEventListener("click", () => handleAddComment(scriptId, cardEl));
   }

   // Event delegation for comment Edit/Delete/Save/Cancel — a single
   // listener on the list handles every comment, including ones
   // added or re-rendered later, so no duplicate listeners pile up.
   const commentsListEl = cardEl.querySelector(".comments-list");
   if (commentsListEl) {
      commentsListEl.addEventListener("click", (e) => handleCommentsListClick(e, scriptId));
   }
}

// Finds a cached comment object by id for a given script.
function findCachedComment(scriptId, commentId) {
   const comments = state.commentsCache[scriptId];
   if (!comments) return null;
   return comments.find(c => String(c.id) === String(commentId)) || null;
}

// Updates just the Comments button's label on a single card,
// without touching anything else.
function updateCommentCountButton(cardEl, scriptId) {
   const toggleBtn = cardEl.querySelector(".comments-toggle-btn");
   if (toggleBtn) {
      toggleBtn.innerHTML = `&#128172; ${commentCountLabel(state.commentCountsCache[scriptId] || 0)}`;
   }
}

function handleCommentsListClick(e, scriptId) {
   const editBtn = e.target.closest(".comment-edit-btn");
   if (editBtn) {
      const commentItem = editBtn.closest(".comment-item");
      handleCommentEditStart(scriptId, commentItem);
      return;
   }

   const deleteBtn = e.target.closest(".comment-delete-btn");
   if (deleteBtn) {
      const commentItem = deleteBtn.closest(".comment-item");
      handleCommentDelete(scriptId, commentItem);
      return;
   }

   const saveBtn = e.target.closest(".comment-save-btn");
   if (saveBtn) {
      const commentItem = saveBtn.closest(".comment-item");
      handleCommentSave(scriptId, commentItem);
      return;
   }

   const cancelBtn = e.target.closest(".comment-cancel-btn");
   if (cancelBtn) {
      const commentItem = cancelBtn.closest(".comment-item");
      handleCommentCancel(scriptId, commentItem);
      return;
   }
}

function handleCommentEditStart(scriptId, commentItem) {
   if (!commentItem) return;
   const commentId = commentItem.dataset.commentId;
   const comment = findCachedComment(scriptId, commentId);
   if (!comment) return;

   const newItem = buildCommentElement(comment, true);
   commentItem.replaceWith(newItem);
}

function handleCommentCancel(scriptId, commentItem) {
   if (!commentItem) return;
   const commentId = commentItem.dataset.commentId;
   const comment = findCachedComment(scriptId, commentId);
   if (!comment) return;

   const newItem = buildCommentElement(comment, false);
   commentItem.replaceWith(newItem);
}

async function handleCommentSave(scriptId, commentItem) {
   if (!commentItem) return;
   const commentId = commentItem.dataset.commentId;
   const textarea = commentItem.querySelector(".comment-edit-input");
   const newText = textarea.value.trim();

   if (!newText) {
      textarea.focus();
      return;
   }

   const saveBtn = commentItem.querySelector(".comment-save-btn");
   const cancelBtn = commentItem.querySelector(".comment-cancel-btn");
   if (saveBtn) saveBtn.disabled = true;
   if (cancelBtn) cancelBtn.disabled = true;

   const {error} = await updateComment(commentId, newText);

   if (error) {
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      showCommentError(commentItem, "Couldn't save comment.");
      return;
   }

   const comment = findCachedComment(scriptId, commentId);
   if (comment) comment.text = newText;

   const newItem = buildCommentElement(comment, false);
   commentItem.replaceWith(newItem);
}

async function handleCommentDelete(scriptId, commentItem) {
   if (!commentItem) return;
   const commentId = commentItem.dataset.commentId;

   const confirmed = confirmAction("Delete this comment?");
   if (!confirmed) return;

   const deleteBtn = commentItem.querySelector(".comment-delete-btn");
   if (deleteBtn) deleteBtn.disabled = true;

   const {error} = await deleteComment(commentId);

   if (error) {
      if (deleteBtn) deleteBtn.disabled = false;
      showCommentError(commentItem, "Couldn't delete comment.");
      return;
   }

   if (state.commentsCache[scriptId]) {
      state.commentsCache[scriptId] = state.commentsCache[scriptId].filter(c => String(c.id) !== String(commentId));
   }

   state.commentCountsCache[scriptId] = Math.max(0, (state.commentCountsCache[scriptId] || 1) - 1);
   const cardEl = commentItem.closest(".script-card");
   if (cardEl) updateCommentCountButton(cardEl, scriptId);

   const listEl = commentItem.parentElement;
   commentItem.remove();

   if (listEl && listEl.children.length === 0) {
      listEl.innerHTML = `<div class="comments-empty">No comments yet.</div>`;
   }
}

async function handleToggleComments(scriptId, cardEl) {
   const panel = cardEl.querySelector(".comments-panel");
   if (!panel) return;

   const isOpening = !panel.classList.contains("active");
   panel.classList.toggle("active");

   if (isOpening && panel.dataset.loaded !== "true") {
      const list = panel.querySelector(".comments-list");
      list.innerHTML = `<div class="comments-empty">Loading comments...</div>`;

      const comments = await getComments(scriptId);
      state.commentsCache[scriptId] = comments;
      panel.dataset.loaded = "true";

      list.innerHTML = comments.length
         ? comments.map(commentHtml).join("")
         : `<div class="comments-empty">No comments yet.</div>`;
   }
}

async function handleAddComment(scriptId, cardEl) {
   const panel = cardEl.querySelector(".comments-panel");
   if (!panel) return;

   const input = panel.querySelector(".comment-input");
   const submitBtn = panel.querySelector(".comment-submit-btn");
   const text = input.value.trim();

   if (!text) {
      input.focus();
      return;
   }

   submitBtn.disabled = true;
   const newComment = await addComment(scriptId, text);
   submitBtn.disabled = false;

   if (!newComment) {
      showCardError(cardEl, "Couldn't post comment.");
      return;
   }

   input.value = "";

   if (!state.commentsCache[scriptId]) state.commentsCache[scriptId] = [];
   state.commentsCache[scriptId].push(newComment);
   panel.dataset.loaded = "true";

   state.commentCountsCache[scriptId] = (state.commentCountsCache[scriptId] || 0) + 1;
   updateCommentCountButton(cardEl, scriptId);

   const list = panel.querySelector(".comments-list");
   const emptyMsg = list.querySelector(".comments-empty");
   if (emptyMsg) emptyMsg.remove();
   list.insertAdjacentHTML("beforeend", commentHtml(newComment));
}
