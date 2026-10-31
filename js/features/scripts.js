import {state} from "../state/store.js";
import {addScript, toggleDone, deleteScript, updateScript} from "../services/scripts.service.js";
import {showCardError, removeEmptyState, ensureEmptyStateIfNeeded} from "../ui/helpers.js";
import {buildCardElement, updateBadgesAndTitle} from "../ui/script-card.js";
import {confirmAction} from "../ui/modal.js";
import {scriptMatchesAllFilters} from "./filters.js";
import {attachReactionListeners} from "./reactions.js";
import {attachCommentListeners} from "./comments.js";
import {homeList, renderHomeList} from "../views/home.view.js";
import {scriptsList} from "../views/scripts.view.js";

/* ============================================================
   SCRIPTS — per-card event handlers and the Add Script form.
   Each handler updates local state + the DOM directly, and
   only re-syncs with Supabase for its own single operation.
============================================================ */

const FULL_CARD_OPTIONS = {withCheckboxes: true, withDelete: true, withEdit: true, withComments: true, withReactions: true};

export function attachCardListeners(cardEl, script) {
   const id = script.id;

   const doneCheckbox = cardEl.querySelector(".done-checkbox");
   if (doneCheckbox) {
      doneCheckbox.addEventListener("change", () => handleToggleDone(id, cardEl));
   }

   attachReactionListeners(cardEl, id);

   const deleteBtn = cardEl.querySelector(".delete-btn");
   if (deleteBtn) {
      deleteBtn.addEventListener("click", () => handleDelete(id, cardEl));
   }

   const editBtn = cardEl.querySelector(".edit-btn");
   if (editBtn) {
      editBtn.addEventListener("click", () => handleEditStart(id));
   }

   const editCancelBtn = cardEl.querySelector(".edit-cancel-btn");
   if (editCancelBtn) {
      editCancelBtn.addEventListener("click", () => handleEditCancel(id));
   }

   const editSaveBtn = cardEl.querySelector(".edit-save-btn");
   if (editSaveBtn) {
      editSaveBtn.addEventListener("click", () => handleEditSave(id, cardEl));
   }

   attachCommentListeners(cardEl, id);
}

// Updates the badges/title on this script's card in both Home
// and Scripts views (whichever of them currently exist in the DOM).
function syncCardEverywhere(script) {
   const scriptsCard = scriptsList.querySelector(`.script-card[data-id="${script.id}"]`);
   if (scriptsCard) updateBadgesAndTitle(scriptsCard, script);

   const homeCard = homeList.querySelector(`.script-card[data-id="${script.id}"]`);
   if (homeCard) updateBadgesAndTitle(homeCard, script);
}

async function handleToggleDone(id, cardEl) {
   const script = state.allScripts.find(s => s.id === id);
   if (!script) return;

   const checkbox = cardEl.querySelector(".done-checkbox");
   const previousDone = script.done;
   const previousArchived = script.archived;
   const nextDone = !previousDone;
   const nextArchived = nextDone ? true : previousArchived; // completing a script also archives it

   // Optimistic update
   script.done = nextDone;
   script.archived = nextArchived;
   if (checkbox) checkbox.disabled = true;
   syncCardEverywhere(script);

   const {error} = await toggleDone(id, previousDone);

   if (checkbox) checkbox.disabled = false;

   if (error) {
      // Revert on failure
      script.done = previousDone;
      script.archived = previousArchived;
      if (checkbox) checkbox.checked = previousDone;
      syncCardEverywhere(script);
      showCardError(cardEl, "Couldn't update Done status.");
      return;
   }

   if (!scriptMatchesAllFilters(script)) {
      cardEl.remove();
      ensureEmptyStateIfNeeded(scriptsList, "No scripts here.");
   }

   // Marking Done archives the script, which can change Home's
   // date groupings (the script disappears from Home entirely).
   renderHomeList();
}

async function handleDelete(id, cardEl) {
   const confirmed = confirmAction("Move this script to Archive?");
   if (!confirmed) return;

   const deleteBtn = cardEl.querySelector(".delete-btn");
   if (deleteBtn) deleteBtn.disabled = true;

   const {error} = await deleteScript(id); // soft-archives, does not delete the row

   if (error) {
      if (deleteBtn) deleteBtn.disabled = false;
      showCardError(cardEl, "Couldn't archive script.");
      return;
   }

   const script = state.allScripts.find(s => s.id === id);
   if (script) script.archived = true;

   cardEl.remove();
   ensureEmptyStateIfNeeded(scriptsList, "No scripts here.");

   // The script leaves Home too (archived scripts never show there),
   // which can also change which two days Home displays.
   renderHomeList();
}

function handleEditStart(id) {
   const script = state.allScripts.find(s => s.id === id);
   const oldCard = scriptsList.querySelector(`.script-card[data-id="${id}"]`);
   if (!script || !oldCard) return;

   state.editingId = id;
   const newCard = buildCardElement(script, {...FULL_CARD_OPTIONS, editing: true});
   attachCardListeners(newCard, script);
   oldCard.replaceWith(newCard);
}

function handleEditCancel(id) {
   const script = state.allScripts.find(s => s.id === id);
   const oldCard = scriptsList.querySelector(`.script-card[data-id="${id}"]`);
   if (!script || !oldCard) return;

   state.editingId = null;
   const newCard = buildCardElement(script, {...FULL_CARD_OPTIONS, editing: false});
   attachCardListeners(newCard, script);
   oldCard.replaceWith(newCard);
}

async function handleEditSave(id, cardEl) {
   const titleInput = cardEl.querySelector(".edit-title-input");
   const descInput = cardEl.querySelector(".edit-desc-input");
   const newTitle = titleInput.value.trim();
   const newDesc = descInput.value.trim();

   if (!newTitle) {
      titleInput.focus();
      return;
   }

   const saveBtn = cardEl.querySelector(".edit-save-btn");
   const cancelBtn = cardEl.querySelector(".edit-cancel-btn");
   if (saveBtn) saveBtn.disabled = true;
   if (cancelBtn) cancelBtn.disabled = true;

   const {error} = await updateScript(id, newTitle, newDesc);

   if (error) {
      if (saveBtn) saveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
      showCardError(cardEl, "Couldn't save changes.");
      return;
   }

   const script = state.allScripts.find(s => s.id === id);
   if (script) {
      script.title = newTitle;
      script.description = newDesc;
   }
   state.editingId = null;

   const newCard = buildCardElement(script, {...FULL_CARD_OPTIONS, editing: false});
   attachCardListeners(newCard, script);
   cardEl.replaceWith(newCard);

   const homeCard = homeList.querySelector(`.script-card[data-id="${id}"]`);
   if (homeCard) {
      const newHomeCard = buildCardElement(script, {withCheckboxes: false, withDelete: false, withEdit: false, withComments: false, withReactions: false, editing: false});
      homeCard.replaceWith(newHomeCard);
   }
}

/* ============================================================
   ADD SCRIPT FORM
============================================================ */
export function initAddScriptForm() {
   const addForm = document.getElementById("addForm");
   const showAddFormBtn = document.getElementById("showAddFormBtn");
   const cancelAddBtn = document.getElementById("cancelAddBtn");
   const submitAddBtn = document.getElementById("submitAddBtn");
   const newTitleInput = document.getElementById("newTitle");
   const newDescInput = document.getElementById("newDesc");

   function closeAddForm() {
      addForm.classList.remove("active");
      newTitleInput.value = "";
      newDescInput.value = "";
   }

   function showFormError(message) {
      let err = addForm.querySelector(".inline-error");
      if (!err) {
         err = document.createElement("div");
         err.className = "inline-error";
         addForm.insertBefore(err, addForm.querySelector(".form-actions"));
      }
      err.textContent = message;
      setTimeout(() => {
         if (err && err.parentNode) err.remove();
      }, 3000);
   }

   showAddFormBtn.addEventListener("click", () => {
      addForm.classList.add("active");
      newTitleInput.focus();
   });

   cancelAddBtn.addEventListener("click", closeAddForm);

   submitAddBtn.addEventListener("click", async () => {
      const title = newTitleInput.value.trim();
      const description = newDescInput.value.trim();

      if (!title) {
         newTitleInput.focus();
         return;
      }

      submitAddBtn.disabled = true;
      const newScript = await addScript(title, description);
      submitAddBtn.disabled = false;

      if (!newScript) {
         showFormError("Couldn't add script. Please try again.");
         return;
      }

      closeAddForm();

      // Newest first — this script is the newest, so it goes at the front.
      state.allScripts.unshift(newScript);

      if (scriptMatchesAllFilters(newScript)) {
         removeEmptyState(scriptsList);
         const newCard = buildCardElement(newScript, {...FULL_CARD_OPTIONS, editing: false});
         attachCardListeners(newCard, newScript);
         scriptsList.prepend(newCard);
      }

      // Home is grouped by date, so a fresh in-memory re-render (no
      // network call) is simpler and safer than patching one card in.
      renderHomeList();
   });
}
