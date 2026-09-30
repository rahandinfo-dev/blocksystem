# Document verification deployment

The calculator still saves editable projects locally. Issued documents and public
verification records are separate, authoritative server records. Documents retain
an immutable calculated snapshot; editing/deleting a browser project cannot change
an issued document. New revisions receive new document IDs, references and tokens.
Revocation retains the original record, fingerprint and URL.

## Required production configuration

There was no existing database or authentication backend in this repository.
The verification adapter uses a persistent Redis REST database (Upstash-compatible)
with atomic sequences and Lua transactions. Configure these **server-only** Vercel
production variables and redeploy:

- `UPSTASH_REDIS_REST_URL`: HTTPS REST endpoint for the persistent database.
- `UPSTASH_REDIS_REST_TOKEN`: database write credential.
- `VERIFICATION_ADMIN_SECRET`: randomly generated secret of at least 32 characters.
- `VERIFICATION_PUBLIC_ORIGIN`: permanent canonical HTTPS origin, e.g.
  `https://your-project.example`. No path, credentials, query or fragment.

Use a durable database with backups and no automatic expiry/eviction of verification
records. Do not share its credentials with the browser or prefix them `NEXT_PUBLIC_`.
Keep production and preview databases separate. Do not change the public origin
after issuing documents without preserving redirects from the original domain.
After changing a Vercel environment variable, redeploy production. The public origin
must be the exact production HTTPS origin with no trailing path, query or fragment.

## Phase 8 operational controls

The server validates the required production variables and fails closed if they are
missing, malformed, or accidentally published as `NEXT_PUBLIC_*`. Sensitive public,
administrative, revocation and PDF operations are rate limited through Redis.
Administrative audit records are append-oriented and contain only safe references
and bounded metadata—never passwords, tokens, project snapshots or secrets.

Standard production response headers protect content types, referrers, framing and
unneeded browser permissions. A static CSP is intentionally not set: Next runtime
scripts, the existing 3D renderer and QR/PDF workflow need a nonce-based policy;
an unsafe guessed CSP would be worse than these compatible headers.

The document centre's administrator sign-in uses the admin secret over HTTPS to
obtain a signed, one-hour, HttpOnly, Secure, SameSite=Strict cookie. Only administrators
can list private snapshots, issue documents, export their PDFs or revoke records.
This is a single-organisation administrator role, not a multi-tenant user account
system. Distribute the secret only to trusted issuers. Rotate it to invalidate all
sessions. Public pages are read-only and contain an explicit metadata allowlist.

Without configuration, issuance fails closed and syntactically valid public tokens
show **verification unavailable**; malformed tokens still show invalid. No successful
storage is simulated and no production records use the filesystem or localStorage.

## Local development and tests

For development only, set `VERIFICATION_DEV_DIRECTORY` to a private folder outside
the repository and `VERIFICATION_PUBLIC_ORIGIN=http://localhost:3000`, plus a test
admin secret. This single-process file adapter persists across local restarts but
is explicitly refused in production and on Vercel.

`npm test` checks identity, collisions/concurrency, canonical SHA-256, persistence,
revocation, authorization, origin safety, translations and legacy migration.
`npm run test:documents` starts an isolated development server, creates its own
random test secret and temporary store, tests the actual browser/API/export flow,
renders A4 PDFs and decodes their QR codes, and checks all seven mobile widths in
all three languages. It requires Chrome (override `CHROME_PATH` on other systems).
Set `VERIFY_3D=1` to also run the existing 3D browser regression suite. All screenshots,
PDFs and results are written to a reported OS temporary directory, not the repository.

Run `npm run lint`, `npm run typecheck`, and `npm run build` as well.

## Existing projects

Saved project IDs are preserved. On first protected registration/issuance, the
server atomically assigns one public project reference/token and reuses it thereafter.
Old browser-only identities are retained as legacy data, but are not trusted as
public records. Their old links cannot truthfully verify until a server record has
been issued; obtain the new authoritative QR in the document centre. Project copies
have independent internal IDs and public identities. Saved document settings survive
the existing project migration, autosave and history flows.

## Verification scope

The SHA-256 digest covers canonical, key-sorted immutable document data (not PDF
bytes, whose rendering metadata can vary). Switching display language or downloading
again does not change the record or digest. The public page identifies an issued
record and its revocation state; it is not an engineering approval, a digital PDF
signature, or a guarantee that an arbitrary PDF carrying the same QR was unmodified.
Production operation and Vercel deployment must be checked separately after setting
credentials; local tests do not prove a live production deployment.
