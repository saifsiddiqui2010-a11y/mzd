# MZD Perfumes — Security Specification (Phase 0: Payload-First Security TDD)

## 1. Data Invariants
1. **Identity Integrity**: Every `users/{userId}` document must have `uid == userId == request.auth.uid`. Every `orders/{orderId}` and `orderTracking/{orderNumber}` created by a customer must have `userId == request.auth.uid`, which is immutable after creation.
2. **PII Isolation**: `users/{userId}` and `orders/{orderId}` contain customer PII (email, phone, address) and are strictly readable only by the owning user (`userId == request.auth.uid`) or verified admins. Public tracking lookups hit `orderTracking/{orderNumber}`, which stores zero PII and disallows `list` queries.
3. **Master Gate Relational Sync**: `users/{userId}/wishlist/{productId}` requires the parent `users/{userId}` document to exist via `exists()` and the referenced `products/{productId}` to exist on create.
4. **Atomicity Guarantee**: Creating `orders/{orderId}` requires `existsAfter(/databases/$(database)/documents/orderTracking/$(incoming().orderNumber))`, and creating `orderTracking/{orderNumber}` requires `existsAfter(/databases/$(database)/documents/orders/$(incoming().orderId))`.
5. **Temporal Integrity**: `createdAt == request.time` on create (immutable on update); `updatedAt == request.time` on create and update.
6. **Terminal State Locking**: Once an order reaches `delivered` or `cancelled`, non-admin updates are strictly rejected. Customers may only cancel an order while in `confirmed` status via an explicit `affectedKeys().hasOnly(['status', 'trackingEvents', 'updatedAt'])` action.
7. **Admin RBAC & Email Verification**: All write operations require `request.auth.token.email_verified == true`. Admin status is verified via bootstrapped email (`saif.siddiqui2010@gmail.com` with `email_verified == true`) or `/admins/{uid}` document lookup (never client claims).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Identity Spoofing on Order Creation**: Authenticated user A creates `/orders/ord_1` with `userId: "user_B"`. -> Expect `PERMISSION_DENIED`.
2. **Shadow Field Injection on User Profile**: User A updates `/users/user_A` adding ghost field `isAdmin: true` or `role: "admin"`. -> Expect `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: Request with `token.email == "saif.siddiqui2010@gmail.com"` and `email_verified == false` attempts to create a product in `/products/p1`. -> Expect `PERMISSION_DENIED`.
4. **PII Blanket Read Attack**: Authenticated user B attempts `get` on `/orders/ord_owned_by_A` or `/users/user_A`. -> Expect `PERMISSION_DENIED`.
5. **Unbounded List Scrape on Orders**: Non-admin user A executes `list` on `/orders` without `where('userId', '==', 'user_A')`. -> Expect `PERMISSION_DENIED`.
6. **Orphaned Order Without Atomic Tracking Mirror**: User A creates `/orders/ord_orphan` without creating `/orderTracking/{orderNumber}` in the same batch. -> Expect `PERMISSION_DENIED`.
7. **Client-Forged Timestamp Attack**: User A creates `/orders/ord_2` with `createdAt` set to a past timestamp instead of `request.time`. -> Expect `PERMISSION_DENIED`.
8. **State Shortcutting / Self-Fulfillment**: User A updates own order status from `confirmed` directly to `delivered` or alters `paymentStatus` to `paid`. -> Expect `PERMISSION_DENIED`.
9. **Terminal State Tampering**: User A tries to cancel an order whose `existing().status == "delivered"`. -> Expect `PERMISSION_DENIED`.
10. **Path Variable ID Poisoning**: Attacker attempts to write `/products/` with a 300-character or special-character document ID (`"../../evil;drop"`). -> Expect `PERMISSION_DENIED`.
11. **Value Poisoning / Oversized String**: User A updates `shippingAddress` or `displayName` with a 5,000-character string or wrong type (`displayName: 12345`). -> Expect `PERMISSION_DENIED`.
12. **Catalog Price Tampering by Customer**: Non-admin user A attempts to update `/products/aureum-oud` setting `price50ml: 1`. -> Expect `PERMISSION_DENIED`.
