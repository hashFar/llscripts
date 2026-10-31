/* ============================================================
   MODAL — confirmation prompts.
   Uses the browser's built-in confirm dialog, exactly as before.
   Kept in one place so a custom modal can replace it later without
   touching the feature code.
============================================================ */
export function confirmAction(message) {
   return window.confirm(message);
}
