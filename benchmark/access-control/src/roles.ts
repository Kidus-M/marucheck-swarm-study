export type Role = "viewer" | "editor" | "admin";
export type Action = "read" | "edit" | "delete";

const PERMISSIONS: Readonly<Record<Role, readonly Action[]>> = {
  admin: ["read", "edit", "delete"],
  editor: ["read", "edit"],
  viewer: ["read"],
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].includes(action);
}
