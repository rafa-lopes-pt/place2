import { SiteApi, generateUUIDv4, ContextStore } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('Comments');

/**
 * Fetches all comments for a specific initiative.
 * @param {string} initiativeUUID
 * @returns {Promise<Array>}
 */
export async function getByInitiative(initiativeUUID) {
  return listApi.getItems({ InitiativeUUID: initiativeUUID });
}

/**
 * Creates a new comment on an initiative.
 * @param {string} initiativeUUID
 * @param {string} body
 * @param {boolean} [isConfidential=false]
 * @param {string} [visibleTo='']
 * @returns {Promise<unknown>}
 */
export async function createComment(initiativeUUID, body, isConfidential = false, visibleTo = '') {
  const user = ContextStore.get('currentUser');
  return listApi.createItem({
    Title: initiativeUUID,
    UUID: generateUUIDv4(),
    InitiativeUUID: initiativeUUID,
    Author: { email: user.get('email'), displayName: user.get('displayName') },
    Body: body,
    IsConfidential: String(isConfidential),
    VisibleTo: visibleTo,
    CommentDate: new Date().toISOString().split('T')[0],
  });
}

/**
 * Hard-deletes a comment record.
 * @param {number} id
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function deleteItem(id, etag) {
  return listApi.deleteItem(id, etag);
}
