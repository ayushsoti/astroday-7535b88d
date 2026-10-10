import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { customers, predictions, upgradeRequests, users } from "../db/schema";
import { toPublicUser } from "../auth/session";
import type { AdminUserRow, Plan, Role, UpgradeRequest, UpgradeStatus } from "../contract";

export async function listUsers(): Promise<AdminUserRow[]> {
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));
  const counts = await db
    .select({ userId: customers.userId, count: sql<number>`count(*)` })
    .from(customers)
    .groupBy(customers.userId);
  const countMap = new Map(counts.map((c) => [c.userId, Number(c.count)]));
  return rows.map((r) => ({ ...toPublicUser(r), customerCount: countMap.get(r.id) ?? 0 }));
}

export async function updateUser(id: string, patch: { role?: Role; plan?: Plan }): Promise<AdminUserRow | null> {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (rows.length === 0) return null;
  await db
    .update(users)
    .set({ ...(patch.role ? { role: patch.role } : {}), ...(patch.plan ? { plan: patch.plan } : {}) })
    .where(eq(users.id, id));
  const updated = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(customers)
    .where(eq(customers.userId, id));
  return { ...toPublicUser(updated), customerCount: Number(count[0]?.count ?? 0) };
}

export async function listUpgradeRequests(): Promise<UpgradeRequest[]> {
  const rows = await db.select().from(upgradeRequests).orderBy(desc(upgradeRequests.createdAt));
  const userRows = await db.select().from(users);
  const userMap = new Map(userRows.map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = userMap.get(r.userId);
    return {
      id: r.id,
      userId: r.userId,
      userEmail: u?.email ?? "unknown",
      userName: u?.name ?? "Unknown",
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    };
  });
}

export async function createUpgradeRequest(userId: string, message: string): Promise<UpgradeRequest> {
  const id = crypto.randomUUID();
  await db.insert(upgradeRequests).values({ id, userId, message });
  const u = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  return {
    id,
    userId,
    userEmail: u.email,
    userName: u.name,
    message,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

export async function updateUpgradeRequest(id: string, status: UpgradeStatus): Promise<UpgradeRequest | null> {
  const rows = await db.select().from(upgradeRequests).where(eq(upgradeRequests.id, id)).limit(1);
  if (rows.length === 0) return null;
  await db.update(upgradeRequests).set({ status }).where(eq(upgradeRequests.id, id));
  if (status === "approved") {
    await db.update(users).set({ plan: "paid" }).where(eq(users.id, rows[0].userId));
  }
  const all = await listUpgradeRequests();
  return all.find((r) => r.id === id) ?? null;
}

export interface AdminStats {
  totalUsers: number;
  paidUsers: number;
  freeUsers: number;
  totalCustomers: number;
  pendingUpgrades: number;
  predictionsPending: number;
}

export async function adminStats(): Promise<AdminStats> {
  const allUsers = await db.select().from(users);
  const allCustomers = await db.select({ id: customers.id }).from(customers);
  const pending = await db.select({ id: upgradeRequests.id }).from(upgradeRequests).where(eq(upgradeRequests.status, "pending"));
  const preds = await db.select({ id: predictions.id }).from(predictions).where(eq(predictions.outcome, "pending"));
  return {
    totalUsers: allUsers.length,
    paidUsers: allUsers.filter((u) => u.plan === "paid").length,
    freeUsers: allUsers.filter((u) => u.plan === "free").length,
    totalCustomers: allCustomers.length,
    pendingUpgrades: pending.length,
    predictionsPending: preds.length,
  };
}
