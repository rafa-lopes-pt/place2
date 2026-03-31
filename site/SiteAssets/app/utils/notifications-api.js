import { SiteApi, generateUUIDv4, __dayjs } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('Notifications');

/**
 * Fetches all notifications for a user.
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getForUser(email) {
  return listApi.getItems({ Recipient: email });
}

/**
 * Returns the count of unread notifications for a user.
 * @param {string} email
 * @returns {Promise<number>}
 */
export async function getUnreadCount(email) {
  const items = await listApi.getItems({ Recipient: email, IsRead: 'false' });
  return items.length;
}

/**
 * Creates a new notification.
 * @param {string} initiativeUUID
 * @param {string} recipientEmail
 * @param {string} title
 * @param {string} type
 * @returns {Promise<unknown>}
 */
export async function createNotification(initiativeUUID, recipientEmail, title, type) {
  return listApi.createItem({
    Title: title,
    UUID: generateUUIDv4(),
    InitiativeUUID: initiativeUUID,
    Recipient: recipientEmail,
    Type: type,
    IsRead: 'false',
    CreatedDate: new Date().toISOString().split('T')[0],
  });
}

/**
 * Fetches recent notifications for a user (date-filtered via CAML).
 * @param {string} email
 * @param {number} days - how many days back to include
 * @returns {Promise<Array>}
 */
export async function getRecentForUser(email, days = 14) {
  const cutoff = __dayjs().subtract(days, 'day').format('YYYY-MM-DD');
  return listApi.getItems({
    Recipient: email,
    CreatedDate: { value: cutoff, operator: 'Geq' },
  });
}

/**
 * Marks a notification as read.
 * @param {number} id
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function markAsRead(id, etag) {
  return listApi.updateItem(id, { IsRead: 'true' }, etag);
}

/**
 * Fetches all notifications for a specific initiative (for cascade delete).
 * @param {string} initiativeUUID
 * @returns {Promise<Array>}
 */
export async function getByInitiative(initiativeUUID) {
  return listApi.getItems({ InitiativeUUID: initiativeUUID });
}

/**
 * Hard-deletes a notification record.
 * @param {number} id
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function deleteItem(id, etag) {
  return listApi.deleteItem(id, etag);
}
