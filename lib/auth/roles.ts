/**
 * Staff role enum — mirrors the CHECK constraint in `user_profiles.role`
 * (PRD §5). Centralised so route handlers and UI agree on the set.
 */
export const STAFF_ROLES = ['owner', 'manager', 'kitchen', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** Role helpers — single source of truth for permission checks. */
export const can = {
  viewLiveOrders: (role: StaffRole): boolean =>
    STAFF_ROLES.includes(role),
  changeOrderStatus: (role: StaffRole): boolean =>
    STAFF_ROLES.includes(role),
  editMenu: (role: StaffRole): boolean =>
    role === 'owner' || role === 'manager',
  manageTablesRooms: (role: StaffRole): boolean =>
    role === 'owner' || role === 'manager',
  manageStaff: (role: StaffRole): boolean => role === 'owner',
  viewReports: (role: StaffRole): boolean =>
    role === 'owner' || role === 'manager',
  editSettings: (role: StaffRole): boolean => role === 'owner',
} as const;