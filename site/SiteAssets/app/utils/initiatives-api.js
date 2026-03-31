import { SiteApi, generateUUIDv4 } from '../libs/nofbiz/nofbiz.base.js';

const siteApi = new SiteApi();
const listApi = siteApi.list('Initiatives');

/**
 * Fetches all initiatives from the Initiatives list.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  return listApi.getItems(undefined, { limit: Infinity });
}

/**
 * Fetches a single initiative by UUID.
 * @param {string} uuid
 * @returns {Promise<Array>}
 */
export async function getByUUID(uuid) {
  return listApi.getItemByUUID(uuid);
}

/**
 * Fetches initiatives owned by the current user.
 * @returns {Promise<Array>}
 */
export async function getOwned() {
  return listApi.getOwnedItems();
}

/**
 * Fetches initiatives filtered by Status.
 * @param {string} status
 * @returns {Promise<Array>}
 */
export async function getByStatus(status) {
  return listApi.getItems({ Status: status });
}

/**
 * Fetches personal initiatives owned by the given email.
 * SubmittedBy is the owner from day one (set on creation, even for drafts).
 * @param {string} email
 * @returns {Promise<Array>}
 */
export async function getPersonal(email) {
  return listApi.getItems({ SubmittedByEmail: email }, { limit: Infinity });
}

/**
 * Fetches initiatives by team scope (array of OUIDs).
 * Uses CAML multi-value OR on ImpactedTeamOUID.
 * @param {string[]} ouids
 * @returns {Promise<Array>}
 */
export async function getByTeamScope(ouids) {
  return listApi.getItems({
    ImpactedTeamOUID: { value: ouids, operator: 'Or' },
  }, { limit: Infinity });
}

/**
 * Fetches initiatives by an array of UUIDs.
 * @param {string[]} uuids
 * @returns {Promise<Array>}
 */
export async function getByUUIDs(uuids) {
  if (uuids.length === 0) return [];
  return listApi.getItems({
    UUID: { value: uuids, operator: 'Or' },
  }, { limit: Infinity });
}

/**
 * Fetches personal initiatives + specific shared initiatives in one query.
 * @param {string} email
 * @param {string[]} sharedUUIDs
 * @returns {Promise<Array>}
 */
export async function getPersonalAndShared(email, sharedUUIDs) {
  if (!sharedUUIDs?.length) return getPersonal(email);
  return listApi.getItems({
    $or: [
      { SubmittedByEmail: email },
      { UUID: { value: sharedUUIDs, operator: 'Or' } }
    ]
  }, { limit: Infinity });
}

/**
 * Fetches initiatives matching any of the given statuses.
 * @param {string[]} statuses
 * @returns {Promise<Array>}
 */
export async function getByStatuses(statuses) {
  return listApi.getItems({
    Status: { value: statuses, operator: 'Or' }
  }, { limit: Infinity });
}

/**
 * Fetches unassigned initiatives (no mentor) matching any of the given statuses.
 * @param {string[]} statuses
 * @returns {Promise<Array>}
 */
export async function getUnassignedByStatuses(statuses) {
  return listApi.getItems({
    Status: { value: statuses, operator: 'Or' },
    MentorEmail: { operator: 'IsNull' },
  }, { limit: Infinity });
}

/**
 * Fetches initiatives matching any of the given statuses assigned to a specific mentor.
 * @param {string[]} statuses
 * @param {string} mentorEmail
 * @returns {Promise<Array>}
 */
export async function getByStatusesAndMentor(statuses, mentorEmail) {
  return listApi.getItems({
    Status: { value: statuses, operator: 'Or' },
    MentorEmail: mentorEmail,
  }, { limit: Infinity });
}

/**
 * Fetches initiatives matching any of the given statuses assigned to a specific gestor.
 * @param {string[]} statuses
 * @param {string} gestorEmail
 * @returns {Promise<Array>}
 */
export async function getByStatusesAndGestor(statuses, gestorEmail) {
  return listApi.getItems({
    Status: { value: statuses, operator: 'Or' },
    GestorValidatorEmail: gestorEmail,
  }, { limit: Infinity });
}

/**
 * Fetches initiatives by status and gestor email.
 * @param {string} status
 * @param {string} gestorEmail
 * @returns {Promise<Array>}
 */
export async function getByStatusAndGestor(status, gestorEmail) {
  return listApi.getItems({
    Status: status,
    GestorValidatorEmail: gestorEmail,
  }, { limit: Infinity });
}

/**
 * Creates a new initiative with auto-generated UUID.
 * @param {Record<string, unknown>} fields
 * @returns {Promise<unknown>}
 */
export async function create(fields) {
  return listApi.createItem({
    ...fields,
    UUID: fields.UUID || generateUUIDv4(),
  });
}

/**
 * Updates an existing initiative.
 * @param {number} id
 * @param {Record<string, unknown>} fields
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function update(id, fields, etag) {
  return listApi.updateItem(id, fields, etag);
}

/**
 * Transitions an initiative to a new status, optionally setting extra fields.
 * @param {number} id
 * @param {string} newStatus
 * @param {string} etag
 * @param {Record<string, unknown>} [extraFields={}]
 * @returns {Promise<unknown>}
 */
export async function transitionStatus(id, newStatus, etag, extraFields = {}) {
  return listApi.updateItem(id, { Status: newStatus, ...extraFields }, etag);
}

/**
 * Hard-deletes an initiative record.
 * @param {number} id
 * @param {string} etag
 * @returns {Promise<unknown>}
 */
export async function deleteItem(id, etag) {
  return listApi.deleteItem(id, etag);
}
