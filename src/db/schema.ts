import {
  type AnyPgColumn, boolean, char, index, integer, pgEnum, pgTable, text, timestamp, unique, uuid,
} from 'drizzle-orm/pg-core';

// ---------- Better Auth (tablas núcleo) ----------
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ---------- Dominio ----------
export const bankAccountType = pgEnum('bank_account_type', ['checking', 'savings', 'joint', 'credit_card', 'investment']);
export const itemKind = pgEnum('item_kind', ['income', 'expense']);
export const entryKind = pgEnum('entry_kind', ['income', 'expense', 'loan_out', 'loan_repayment']);
export const frequency = pgEnum('frequency', ['monthly', 'bimonthly', 'annual', 'installments']);
export const monthStatus = pgEnum('month_status', ['open', 'closed']);
export const entryStatus = pgEnum('entry_status', ['pending', 'confirmed']);
export const paydayRule = pgEnum('payday_rule', ['before', 'after']);

const userRef = () => text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' });

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  bank: text('bank').notNull(),
  type: bankAccountType('type').notNull(),
  defaultSavingsPercent: integer('default_savings_percent').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  kind: itemKind('kind').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

export const recurringItems = pgTable('recurring_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  kind: itemKind('kind').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  amountCents: integer('amount_cents').notNull(),
  frequency: frequency('frequency').notNull(),
  startMonth: char('start_month', { length: 7 }).notNull(),
  anchorMonth: integer('anchor_month'),
  installmentsTotal: integer('installments_total'),
  paydayDay: integer('payday_day'),
  paydayRule: paydayRule('payday_rule').notNull().default('before'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const months = pgTable('months', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  yearMonth: char('year_month', { length: 7 }).notNull(),
  status: monthStatus('status').notNull().default('open'),
  reopenedAt: timestamp('reopened_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [unique('months_user_ym').on(t.userId, t.yearMonth)]);

export const monthSavingsSplit = pgTable('month_savings_split', {
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  percent: integer('percent').notNull(),
}, (t) => [unique('split_month_account').on(t.monthId, t.accountId)]);

export const entries = pgTable('entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  recurringItemId: uuid('recurring_item_id').references(() => recurringItems.id, { onDelete: 'set null' }),
  kind: entryKind('kind').notNull(),
  name: text('name').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  amountCents: integer('amount_cents').notNull(),
  installmentNumber: integer('installment_number'),
  status: entryStatus('status'),
  confirmedAt: timestamp('confirmed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  index('entries_month').on(t.monthId),
  unique('entries_month_item').on(t.monthId, t.recurringItemId),
]);

export const funds = pgTable('funds', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  monthlyAllocationCents: integer('monthly_allocation_cents').notNull().default(0),
});

export const fundMovements = pgTable('fund_movements', {
  id: uuid('id').primaryKey().defaultRandom(),
  fundId: uuid('fund_id').notNull().references(() => funds.id, { onDelete: 'cascade' }),
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  note: text('note'),
  date: timestamp('date').notNull().defaultNow(),
});

export const pockets = pgTable('pockets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  name: text('name').notNull(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  monthlyLimitCents: integer('monthly_limit_cents').notNull(),
});

export const monthPockets = pgTable('month_pockets', {
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  pocketId: uuid('pocket_id').notNull().references(() => pockets.id, { onDelete: 'cascade' }),
  limitCents: integer('limit_cents').notNull(),
}, (t) => [unique('month_pockets_unique').on(t.monthId, t.pocketId)]);

export const pocketExpenses = pgTable('pocket_expenses', {
  id: uuid('id').primaryKey().defaultRandom(),
  pocketId: uuid('pocket_id').notNull().references(() => pockets.id, { onDelete: 'cascade' }),
  monthId: uuid('month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  note: text('note'),
  date: timestamp('date').notNull().defaultNow(),
});

export const balanceSnapshots = pgTable('balance_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  balanceCents: integer('balance_cents').notNull(),
  date: timestamp('date').notNull().defaultNow(),
}, (t) => [index('balance_snapshots_account_date').on(t.accountId, t.date)]);

export const loans = pgTable('loans', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  person: text('person').notNull(),
  amountCents: integer('amount_cents').notNull(),
  accountId: uuid('account_id').notNull().references(() => bankAccounts.id),
  lentMonthId: uuid('lent_month_id').notNull().references(() => months.id, { onDelete: 'cascade' }),
  repaidMonthId: uuid('repaid_month_id').references(() => months.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('loans_user').on(t.userId)]);

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }),
  timezone: text('timezone').notNull().default('Europe/Madrid'),
  holidayRegion: text('holiday_region').notNull().default('ES-MD'),
  emailNotifications: boolean('email_notifications').notNull().default(true),
  pushNotifications: boolean('push_notifications').notNull().default(false),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [index('push_subscriptions_user').on(t.userId)]);

export const notificationsLog = pgTable('notifications_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: userRef(),
  kind: text('kind').notNull(),
  refKey: text('ref_key').notNull().unique(),
  sentAt: timestamp('sent_at').notNull().defaultNow(),
});
