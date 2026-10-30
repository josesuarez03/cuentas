import { and, asc, eq, isNull } from 'drizzle-orm';
import * as s from '@/db/schema';
import type { Db } from '@/db/types';

export interface Catalog {
  categories: { id: string; name: string; kind: 'income' | 'expense' }[];
  accounts: { id: string; name: string; type: 'checking' | 'savings' | 'joint' | 'credit_card' | 'investment' }[];
}

export async function getCatalog(db: Db, userId: string): Promise<Catalog> {
  const categories = await db.select({ id: s.categories.id, name: s.categories.name, kind: s.categories.kind })
    .from(s.categories)
    .where(and(eq(s.categories.userId, userId), isNull(s.categories.parentId)))
    .orderBy(asc(s.categories.sortOrder), asc(s.categories.name));
  const accounts = await db.select({ id: s.bankAccounts.id, name: s.bankAccounts.name, type: s.bankAccounts.type })
    .from(s.bankAccounts).where(eq(s.bankAccounts.userId, userId)).orderBy(asc(s.bankAccounts.name));
  return { categories, accounts };
}
