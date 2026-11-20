# FARMA360 — Security Specification (Firestore Rules v2)

## 1. Roles & Document-Based RBAC (Zero Hardcoded Emails)
- **Anonymous / Unauthenticated**: Denied all access across all collections (`match /{document=**} { allow read, write: if false; }`).
- **Authenticated Professional (`usuario_profissional`)**: Can create, read, and update their own `/users/{userId}` professional profile (cannot self-escalate `role`), manage `/users/{userId}/private/info` (PII split collection), manage `/users/{userId}/favorites/{favId}` and `/users/{userId}/history/{histId}`, and view `/content_reviews/{reviewId}`.
- **Scientific Reviewer (`revisor_cientifico`)**: Identified by document presence at `/reviewers/{uid}` (or higher roles). Can create and update `/content_reviews/{reviewId}` (unless locked in terminal `'rejeitado'` state) and append immutable `/audit_logs/{logId}`.
- **Scientific Editor (`editor_cientifico`)**: Identified by document presence at `/editors/{uid}` (or admin). Inherits Reviewer permissions and can unlock or transition `/content_reviews/{reviewId}` from `'rejeitado'`.
- **Administrator (`administrador`)**: Identified strictly by document presence at `/admins/{uid}` (zero hardcoded email addresses in security rules). Can manage user roles and access governance records.

## 2. Collection & Subcollection Matrix
| Path | Get | List | Create | Update | Delete | Key Invariants |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/admins/{adminId}` | Owner | Deny | Deny | Deny | Deny | Managed via Admin SDK / Console |
| `/editors/{editorId}` | Owner | Deny | Deny | Deny | Deny | Managed via Admin SDK / Console |
| `/reviewers/{reviewerId}` | Owner | Deny | Deny | Deny | Deny | Managed via Admin SDK / Console |
| `/users/{userId}` | Owner / Admin | Deny | Owner | Owner / Admin | Deny | `isValidUserPublicProfile`, `role == 'usuario_profissional'` on self-create, immutable `uid` & `createdAt` |
| `/users/{userId}/private/info` | Owner / Admin | Deny | Owner | Owner | Deny | Requires `parentUserExists(userId)`, isolates `email` PII |
| `/users/{userId}/favorites/{favId}` | Owner | Owner | Owner | Deny | Owner | Requires `parentUserExists(userId)`, QAP `existing().uid == request.auth.uid` |
| `/users/{userId}/history/{histId}` | Owner | Owner | Owner | Deny | Owner | Requires `parentUserExists(userId)`, QAP `existing().uid == request.auth.uid` |
| `/audit_logs/{logId}` | Reviewer+ | Reviewer+ (own) | Reviewer+ | Deny | Deny | Immutable audit trail (`createdAt == request.time`) |
| `/content_reviews/{reviewId}` | SignedIn | SignedIn (own) | Reviewer+ | Reviewer+ | Deny | 7 review states (`importado`..`rejeitado`), terminal lock on `rejeitado` for non-editors |
