/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md are rejected.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  authUid: string | null;
  emailVerified: boolean;
  docId?: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Transaction Create',
    collection: 'transactions',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tx_spoof_1',
    payload: { id: 'tx_spoof_1', userId: 'user_B', type: 'expense', amount: 500 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-Tenant List Query Scraping',
    collection: 'transactions',
    operation: 'list',
    authUid: 'user_A',
    emailVerified: true,
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'PII Blanket Read on Users',
    collection: 'users',
    operation: 'get',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'user_B',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection on Budget Create',
    collection: 'budgets',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'budget_1',
    payload: { id: 'budget_1', userId: 'user_A', isAdminOverride: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Update-Gap Value Poisoning on Transaction Amount',
    collection: 'transactions',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tx_1',
    payload: { amount: -500 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable Owner Mutation on Account Update',
    collection: 'accounts',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'acc_1',
    payload: { userId: 'user_B' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable Timestamp Mutation on SavingsGoal Update',
    collection: 'savingsGoals',
    operation: 'update',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'goal_1',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client-Forged Timestamp on Reminder Create',
    collection: 'reminders',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'rem_1',
    payload: { id: 'rem_1', userId: 'user_A', createdAt: '2099-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'ID Poisoning Attack with Invalid Characters',
    collection: 'categories',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'invalid id with spaces & $pecial!',
    payload: { id: 'invalid id with spaces & $pecial!', userId: 'user_A' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Denial-of-Wallet Oversized String in Notes',
    collection: 'transactions',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tx_large',
    payload: { id: 'tx_large', userId: 'user_A', notes: 'x'.repeat(10000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unbounded Array Injection in Transaction Tags',
    collection: 'transactions',
    operation: 'create',
    authUid: 'user_A',
    emailVerified: true,
    docId: 'tx_tags',
    payload: { id: 'tx_tags', userId: 'user_A', tags: new Array(25).fill('tag') },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unauthenticated Write Attempt',
    collection: 'accounts',
    operation: 'create',
    authUid: null,
    emailVerified: false,
    docId: 'acc_unauth',
    payload: { id: 'acc_unauth', userId: 'user_A' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
