/**
 * MZD Perfumes — Firestore Security Rules Test Specification (Dirty Dozen)
 * Verifies that all 12 adversarial payloads fail with PERMISSION_DENIED under firestore.rules.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  pillar: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Order Creation',
    pillar: 'Pillar 2 — Validation Blueprints',
    operation: 'create',
    path: '/orders/ord_spoof_1',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { orderNumber: 'MZD-2026-SPOOF', userId: 'user_B', total: 240, status: 'confirmed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Privilege Escalation on User Profile',
    pillar: 'Pillar 2 & 4 — Strict Keys / RBAC',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { displayName: 'Attacker', isAdmin: true, role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    pillar: 'Phase 5 — Email Spoofing Test',
    operation: 'create',
    path: '/products/fake_oud',
    auth: { uid: 'spoof_uid', email: 'saif.siddiqui2010@gmail.com', email_verified: false },
    payload: { name: 'Fake Oud', price50ml: 10, stock: 5 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Blanket Read on Another User Order',
    pillar: 'Pillar 6 — PII Isolation',
    operation: 'get',
    path: '/orders/ord_owned_by_A',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Unscoped List Scrape on Orders Collection',
    pillar: 'Pillar 8 — Secure List Queries',
    operation: 'list',
    path: '/orders',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Orphaned Order Without Atomic Tracking Document',
    pillar: 'Pillar 7 — Atomicity Guarantee (existsAfter)',
    operation: 'create',
    path: '/orders/ord_orphan_1',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { orderNumber: 'MZD-2026-ORPH', userId: 'user_A', total: 195, status: 'confirmed' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Client-Forged CreatedAt Timestamp',
    pillar: 'Phase 4 — Temporal Integrity',
    operation: 'create',
    path: '/orders/ord_backdated',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { orderNumber: 'MZD-2026-BACK', userId: 'user_A', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Customer Self-Fulfillment State Shortcutting',
    pillar: 'Pillar 4 — Tiered Identity Logic',
    operation: 'update',
    path: '/orders/ord_owned_by_A',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { status: 'delivered', paymentStatus: 'paid' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Modification After Delivery',
    pillar: 'Phase 4 — Terminal State Locking',
    operation: 'update',
    path: '/orders/ord_delivered_A',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { status: 'cancelled' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Path Variable ID Poisoning',
    pillar: 'Pillar 3 — Path Variable Hardening',
    operation: 'create',
    path: '/users/invalid$id..injection',
    auth: { uid: 'invalid$id..injection', email: 'x@example.com', email_verified: true },
    payload: { uid: 'invalid$id..injection', displayName: 'Bad ID' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning Oversized String on Profile',
    pillar: 'Pillar 2 & 5 — Size & Type Enforcement',
    operation: 'update',
    path: '/users/user_A',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { displayName: 'A'.repeat(2500) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Customer Catalog Price Tampering',
    pillar: 'Pillar 4 — Admin-Only Catalog Mutation',
    operation: 'update',
    path: '/products/aureum-oud',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { price50ml: 1, price100ml: 1 },
    expected: 'PERMISSION_DENIED',
  },
];
