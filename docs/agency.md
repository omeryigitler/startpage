# Agency workspace

Open Agency from the Startpage carousel or `/#agency/overview`. The shell remains
English, uses Manrope and Taurus gold/black, and owns the single section heading.
World and the independent Pricing module are preserved.

Sales and Studio use the portfolio's existing HttpOnly Gateway session and exact
Origin allowlist. No provider credentials are entered into this UI. Projects,
Clients, Proposals, Inbox and World reuse the protected operations modules.
Closing Agency restores the original Startpage and its shortcuts.

## Continue workflow

1. **Sales → Find & research** discovers up to three deduplicated companies in a
   selected market/sector. Verified free AI researches companies sequentially.
2. **Studio** shows findings, sources, recommended improvements, unknowns and any
   email observed on safely inspected company pages. Confirm the business,
   recipient, source and actual contact basis.
3. **Continue · prepare proposal** selects a business-specific scope, calculates
   the price through shared Pricing rules and saves a draft quote plus PDF.
4. Review the exact sender, recipient, reply address, subject, body and immutable
   attachments. **Continue · send proposal** approves only that payload.
5. AI prepares company-specific copy, sections, palette, typography and layout.
   Studio displays a script-free concept and saves a PDF and responsive HTML.
6. Review the follow-up email and **Continue · send concept**. The workflow links
   an active project at proposal stage, with client decision pending, progress
   zero and final approval false.
7. The owner agrees final scope/content, implements the actual site, connects
   forms/domain, tests and launches it.

Closing Studio stops later preparation requests; already-started work can finish
and checkpoint. Reopen and Continue to resume. This is not an unattended scheduler,
public demo deployment system or final website builder. Earlier template concepts
and run history remain in a collapsed secondary view.

## Connections and recovery

AI controls shows the current provider/mail connection status. The owner checks
the existing server key's project in Google AI Studio and explicitly confirms
free plan and billing disabled. That owner attestation expires after seven days
and is invalidated by key rotation; it is not an automated Google billing audit.

First-contact mail requires a work SMTP mailbox configured on the server.
Existing Resend is used for requested/permitted email only. Missing connections
block the affected step and retain saved work. No mail or model credential is
returned to the browser.

Approval digests, version checks, leases and outbox receipts prevent double-click
sends. Ambiguous SMTP results stop for the owner to check the exact message in
Sent. Resend retries use identical attachments and idempotency keys within a
23-hour window. Provider acceptance is not client acceptance or a delivered site.
The backend's `docs/agency-continue-workflow.md` explains server setup and storage.

Valid incoming website messages retain their independent server-side preparation
of linked client/project/draft proposal records, even while Startpage is closed.
Former admin routes still redirect to Startpage.

## Verification

The Next production build checks types and bundling. Before the workspace
disconnect, browser QA exercised the actual components/services through research
review, proposal, concept and handoff with explicitly labelled fixture AI/mail.
It also refreshed a saved review and downloaded a real Chromium-generated PDF.
No real company emails were sent or production free-project confirmations made.
Backend deterministic/security tests and live directory checks run in CI.
