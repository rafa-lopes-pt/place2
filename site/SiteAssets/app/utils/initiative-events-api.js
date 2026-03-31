import { SiteApi, generateUUIDv4, ContextStore } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('InitiativeEvents');

/**
 * Creates a new initiative event record.
 * @param {string} initiativeUUID
 * @param {string} eventType - One of EVENT_TYPES values
 * @param {string} fromStatus
 * @param {string} toStatus
 * @param {string} [comment='']
 * @returns {Promise<unknown>}
 */
export async function createEvent(initiativeUUID, eventType, fromStatus, toStatus, comment = '') {
  const user = ContextStore.get('currentUser');
  return listApi.createItem({
    Title: initiativeUUID,
    UUID: generateUUIDv4(),
    InitiativeUUID: initiativeUUID,
    EventType: eventType,
    FromStatus: fromStatus || '',
    ToStatus: toStatus || '',
    Comment: comment,
    Actor: { email: user.get('email'), displayName: user.get('displayName') },
    ActorEmail: user.get('email'),
    Date: new Date().toISOString(),
  });
}

/**
 * Fetches all events for a specific initiative.
 * @param {string} initiativeUUID
 * @returns {Promise<Array>}
 */
export async function getByInitiative(initiativeUUID) {
  return listApi.getItems({ InitiativeUUID: initiativeUUID });
}

/**
 * Fetches all events of a specific type.
 * @param {string} eventType
 * @returns {Promise<Array>}
 */
export async function getByEventType(eventType) {
  return listApi.getItems({ EventType: eventType });
}

/**
 * Fetches events for a specific initiative filtered by event type.
 * @param {string} initiativeUUID
 * @param {string} eventType
 * @returns {Promise<Array>}
 */
export async function getByInitiativeAndType(initiativeUUID, eventType) {
  return listApi.getItems({ InitiativeUUID: initiativeUUID, EventType: eventType });
}

/**
 * Hard-deletes an event record.
 * @param {number} id
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function deleteItem(id, etag) {
  return listApi.deleteItem(id, etag);
}
