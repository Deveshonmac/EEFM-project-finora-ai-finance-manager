# Finora Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Multi-Tenant User Isolation**: Every document across `users`, `accounts`, `transactions`, `categories`, `budgets`, `savingsGoals`, `goalContributions`, `reminders`, `notifications`, and `aiConversations` is strictly owned by a single user (`uid` or `userId == request.auth.uid`). No user may read, list, create, update, or delete another user's financial data.
2. **PII Isolation**: The `/users/{userId}` document contains `email` and `displayName`. Only `request.auth.uid == userId` can read or write `/users/{userId}`.
3. **Immutable Ownership & Creation Timestamps**: Once created, `uid`, `userId`, `id`, and `createdAt` can never be mutated during an `update`.
4. **Temporal Integrity**: `createdAt` on `create` and `updatedAt` on `update` must equal `request.time`.
5. **Bounded Strings & Lists**: All string fields have explicit `.size()` maximums matching `firebase-blueprint.json`. `tags` on transactions is strictly bounded (`tags.size() <= 10`).
6. **Positive Financial Amounts**: Transaction amounts, budget amounts, savings goal targets, and goal contributions must be positive numbers (`> 0`).
7. **Secure List Queries**: Every `allow list` rule enforces `resource.data.userId == request.auth.uid` (no blanket `isSignedIn()` reads).

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing on Transaction Create**: Authenticated as `user_A`, attempting to create `/transactions/tx_1` with `userId: "user_B"`.
2. **Cross-Tenant List Query Scraping**: Authenticated as `user_A`, attempting to list `/transactions` without `where("userId", "==", "user_A")`.
3. **PII Blanket Read on Users**: Authenticated as `user_A`, attempting `get(/users/user_B)`.
4. **Shadow Field Injection on Budget Create**: Attempting to create `/budgets/b_1` with an undeclared field `isAdminOverride: true`.
5. **Update-Gap Value Poisoning**: Attempting to update `amount` on `/transactions/tx_1` with a negative number (`-500`) or a string (`"1000"`).
6. **Immutable Owner Mutation**: Attempting to update `/accounts/acc_1` to change `userId` from `"user_A"` to `"user_B"`.
7. **Immutable Timestamp Mutation**: Attempting to update `/savingsGoals/goal_1` with a modified `createdAt` value.
8. **Client-Forged Timestamp on Create**: Attempting to create `/reminders/rem_1` with a past or future `createdAt` timestamp not equal to `request.time`.
9. **ID Poisoning Attack**: Attempting to create a document with an invalid ID containing spaces or special characters or exceeding 128 chars.
10. **Denial-of-Wallet Oversized String**: Attempting to create `/transactions/tx_2` with a `notes` string of 10,000 characters (`> 500`).
11. **Unbounded Array Injection**: Attempting to create `/transactions/tx_3` with 50 items in `tags` (`> 10`).
12. **Unauthenticated Write**: Attempting to create or read any document with `request.auth == null`.
