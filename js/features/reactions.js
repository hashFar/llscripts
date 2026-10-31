import {state} from "../state/store.js";
import {getCurrentUser} from "../services/auth.service.js";
import {setReaction, removeReaction} from "../services/reactions.service.js";
import {showCardError} from "../ui/helpers.js";

/* ============================================================
   REACTIONS (like / dislike)
============================================================ */

export function attachReactionListeners(cardEl, scriptId) {
   const likeBtn = cardEl.querySelector(".like-btn");
   if (likeBtn) {
      likeBtn.addEventListener("click", () => handleReactionClick(scriptId, cardEl, "like"));
   }

   const dislikeBtn = cardEl.querySelector(".dislike-btn");
   if (dislikeBtn) {
      dislikeBtn.addEventListener("click", () => handleReactionClick(scriptId, cardEl, "dislike"));
   }
}

async function handleReactionClick(scriptId, cardEl, clickedReaction) {
   if (!scriptId) {
      console.error("Reaction error:", new Error("Missing script id"));
      return;
   }

   // Re-check the live session on every click rather than trusting
   // the cached currentUserId — if the session ever expired, this
   // catches it and tells the user instead of failing silently.
   const {data: userData, error: userError} = await getCurrentUser();
   if (userError) {
      console.error("Reaction error:", userError);
   }
   const liveUserId = userData && userData.user ? userData.user.id : null;

   if (!liveUserId) {
      showCardError(cardEl, "Please login first.");
      return;
   }
   state.currentUserId = liveUserId; // keep the cache in sync with the live session

   const likeBtn = cardEl.querySelector(".like-btn");
   const dislikeBtn = cardEl.querySelector(".dislike-btn");
   const previousReaction = state.reactionsCache[scriptId]; // "like" | "dislike" | undefined

   // Clicking the already-selected reaction clears it; otherwise
   // it becomes the newly clicked one (like <-> dislike switches).
   const nextReaction = previousReaction === clickedReaction ? null : clickedReaction;

   // Optimistic update
   if (nextReaction) {
      state.reactionsCache[scriptId] = nextReaction;
   } else {
      delete state.reactionsCache[scriptId];
   }
   applyReactionUI(cardEl, nextReaction);
   if (likeBtn) likeBtn.disabled = true;
   if (dislikeBtn) dislikeBtn.disabled = true;

   let result;
   if (nextReaction === null) {
      result = await removeReaction(scriptId);
   } else {
      result = await setReaction(scriptId, nextReaction);
   }

   if (likeBtn) likeBtn.disabled = false;
   if (dislikeBtn) dislikeBtn.disabled = false;

   if (result.error) {
      console.error("Reaction error:", result.error);
      // Revert on failure
      if (previousReaction) {
         state.reactionsCache[scriptId] = previousReaction;
      } else {
         delete state.reactionsCache[scriptId];
      }
      applyReactionUI(cardEl, previousReaction);
      showCardError(cardEl, "Couldn't save your reaction.");
   }
}

function applyReactionUI(cardEl, reaction) {
   const likeBtn = cardEl.querySelector(".like-btn");
   const dislikeBtn = cardEl.querySelector(".dislike-btn");
   if (likeBtn) likeBtn.classList.toggle("active-like", reaction === "like");
   if (dislikeBtn) dislikeBtn.classList.toggle("active-dislike", reaction === "dislike");
}
