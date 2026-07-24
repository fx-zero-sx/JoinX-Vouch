/**
 * Discord modals only support text inputs, so an attached image can't travel
 * through the modal itself. Instead we capture it from the /vouch command's
 * attachment option and stash it here (keyed by user) until the modal is
 * submitted a few seconds later. Entries expire on their own so a user who
 * opens the modal and never submits doesn't leak memory or leftover state.
 */

const TTL_MS = 15 * 60 * 1000; // matches Discord's modal submission window
const pending = new Map();

function setPendingImage(userId, imageUrl) {
  const timeout = setTimeout(() => pending.delete(userId), TTL_MS);
  timeout.unref?.();
  pending.set(userId, { imageUrl, timeout });
}

function takePendingImage(userId) {
  const entry = pending.get(userId);
  if (!entry) return null;
  clearTimeout(entry.timeout);
  pending.delete(userId);
  return entry.imageUrl;
}

module.exports = { setPendingImage, takePendingImage };
