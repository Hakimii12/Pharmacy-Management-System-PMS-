/**
 * Role gate. Must run after `Authenticated()`, which is what populates `req.user`.
 *
 * Usage: router.post("/x", Authenticated(), allowedUsers(...MANAGERS), handler)
 */
const allowedUsers = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};

/** Every approved account. */
export const ALL_ROLES = ["superAdmin", "admin", "pharmacist"];
/** Inventory, catalog and credit administration. */
export const MANAGERS = ["superAdmin", "admin"];
/** Who may ring up a sale (prepares and completes cash & credit sales directly). */
export const SELLERS = ["superAdmin", "admin", "pharmacist"];
/** Maintained for backwards compatibility with any remaining cashier-scoped endpoints. */
export const CASHIERS = ["superAdmin", "admin", "pharmacist"];
/** User administration. */
export const SUPER_ADMIN = ["superAdmin"];

export default allowedUsers;
