// Ролі й права словами глосарію PM (requirements/product.md, «Користувачі й ролі» і «Матриця прав»).
// Лише для пояснення в інтерфейсі; остаточно права тримає RLS у базі.

export type RoleInfo = { label: string; who: string; can: string[]; cannot: string[] };

export const ROLE_INFO: Record<string, RoleInfo> = {
  manager: {
    label: "Manager",
    who: "Property manager",
    can: ["Launch templates", "See runs you manage or have tasks in", "Mark your tasks done, or any task in runs you manage"],
    cannot: ["Create or change templates", "Create users"],
  },
  admin: {
    label: "Admin",
    who: "Administrator",
    can: ["Everything a manager can", "See all runs", "Create and change templates", "Create users and assign roles"],
    cannot: ["Change your own role"],
  },
};

export const roleLabel = (role: string) => ROLE_INFO[role]?.label ?? role;
