// Shared state between modules
let actionToPerform = null;

/**
 * Sets the action to perform
 * @param {string} action - The action to perform
 */
export function setActionToPerform(action) {
    actionToPerform = action;
}

/**
 * Gets the action to perform
 * @returns {string} - The action to perform
 */
export function getActionToPerform() {
    return actionToPerform;
}
