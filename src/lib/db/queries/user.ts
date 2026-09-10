import { count, eq } from "drizzle-orm";
import type { UserRole } from "~/lib/auth/roles";
import type { Database } from "~/lib/db";
import { user } from "~/lib/db/schema";

export async function getUsers(db: Database) {
  return await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: (users, { asc }) => [asc(users.createdAt)],
  });
}

export async function countUsersByRole(db: Database, role: UserRole) {
  const [row] = await db.select({ value: count() }).from(user).where(eq(user.role, role));
  return row?.value ?? 0;
}

export async function updateUserRole(db: Database, userId: string, role: UserRole) {
  const [updated] = await db
    .update(user)
    .set({ role })
    .where(eq(user.id, userId))
    .returning({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

  return updated ?? null;
}
