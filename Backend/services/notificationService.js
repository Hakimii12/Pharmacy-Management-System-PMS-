import Notification from "../models/NotificationModel.js"

/**
 * Expiry notification sync.
 *
 * This used to live in a `post('save')` hook on ProductModel, where every single
 * product save fired three to four sequential awaited notification queries. A
 * 500-product import therefore issued ~2000 round-trips before it returned.
 *
 * Controllers now call these functions explicitly, and every product in the batch
 * is collapsed into one `bulkWrite`.
 */

const NEAR_EXPIRY_MONTHS = 3
const MS_PER_DAY = 1000 * 60 * 60 * 24

function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function upsertOp({ product, type, location, message }) {
  return {
    updateOne: {
      filter: { product, type, location, read: false },
      update: { $setOnInsert: { type, message, product, location, read: false }, $set: { message } },
      upsert: true,
    },
  }
}

function clearOp({ product, type, location }) {
  return {
    deleteMany: {
      filter: { product, type, location, read: false },
    },
  }
}

/**
 * Turns a list of products into the bulk operations needed to bring their
 * expiry/near-expiry notifications up to date. Exported so callers can merge
 * these ops into a larger bulkWrite if they already have one.
 *
 * @param {Array<{_id: any, name: string, expiryDate: Date}>} products
 */
export function buildExpiryNotificationOps(products, now = startOfToday()) {
  const nearExpiryCutoff = new Date(now)
  nearExpiryCutoff.setMonth(nearExpiryCutoff.getMonth() + NEAR_EXPIRY_MONTHS)

  const ops = []

  for (const product of products) {
    if (!product?.expiryDate) continue
    const expiry = new Date(product.expiryDate)
    const productId = product._id

    if (expiry <= now) {
      const message = `Product ${product.name} has expired!`
      ops.push(upsertOp({ product: productId, type: "Expired", location: "store", message }))
      ops.push(upsertOp({ product: productId, type: "Expired", location: "dispensary", message }))
      ops.push(clearOp({ product: productId, type: "NearExpiry", location: "both" }))
      continue
    }

    if (expiry <= nearExpiryCutoff) {
      const daysLeft = Math.ceil((expiry - now) / MS_PER_DAY)
      ops.push(
        upsertOp({
          product: productId,
          type: "NearExpiry",
          location: "both",
          message: `Product ${product.name} expires in ${daysLeft} days!`,
        }),
      )
      continue
    }

    ops.push(clearOp({ product: productId, type: "NearExpiry", location: "both" }))
  }

  return ops
}

/** Sync expiry notifications for any number of products in a single bulkWrite. */
export async function syncExpiryNotifications(products, { session } = {}) {
  const list = Array.isArray(products) ? products : [products]
  if (list.length === 0) return { modified: 0 }

  const ops = buildExpiryNotificationOps(list)
  if (ops.length === 0) return { modified: 0 }

  return Notification.bulkWrite(ops, { ordered: false, ...(session ? { session } : {}) })
}

/**
 * Fire-and-forget variant for request paths where the notification write should
 * never block or fail the response (product create/update).
 */
export function syncExpiryNotificationsInBackground(products) {
  Promise.resolve(syncExpiryNotifications(products)).catch((error) => {
    console.error("Expiry notification sync failed:", error)
  })
}
