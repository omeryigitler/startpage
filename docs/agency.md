# Agency workspace

Open Agency from the existing Startpage carousel or use `/#agency/overview`.
Sales and Studio manage source-backed Malta/Türkiye prospects and paused jobs.
Projects, Clients, Proposals, Inbox and World reuse the authenticated
portfolio admin modules. The original world renderer is retained.

The UI contains no credential inputs or provider keys. All agency data requests
use the portfolio's secure HttpOnly Gateway cookie with an exact Origin allowlist.
No additional Google login is needed for Agency. Startpage content management
retains its existing independent Google authorization.

Only the selected heavy workspace loads. Closing Agency restores the Startpage;
idle standby and global folder shortcuts are suspended while Agency is open.
The navigation messages contain only allowlisted view names and readiness.
Both origin and source window are checked before accepting messages.

No automated company discovery, demo creation or outbound messaging is connected.
Jobs clearly show a paused status. AI controls cannot activate paid execution.

Validation: production build/type validation passed. Backend/security validation
and the release order are recorded in the portfolio's
`docs/guides/START-AGENCY.md`. Managed local browser preview is unavailable because
its CLI passes unsupported Vite flags to this Next.js application; authenticated
browser and device testing remains a separate verification step.

The agency UI is English and uses the shared Taurus gold/black palette and
Manrope/Syncopate/JetBrains Mono typography. Custom controls replace native
selects, checkbox chrome and number spinners. Pricing loads directly as a
separate versioned module at `/tools/pricing/index.html?plugin=agency`; it is no
longer nested inside the operations iframe. Its server validates settings,
recalculates prices and saves linked proposals/projects. The selected market
does not change the interface language.

Valid incoming website messages prepare linked client/project/draft proposal
records on the server even while Startpage is closed. Final approval stays
manual. PDFs are generated on demand. Former admin routes redirect to Startpage;
the protected compatibility runtime remains an implementation module.

## Research and concepts

Sales now starts a typed, on-demand research job: bounded public directory
search → safe website inspection → opportunity score → private template concept
and current server-calculated estimate. Studio displays source evidence,
limitations, preview, revision-specific approval/rejection and durable checkpoints.
Optional AI copy refinement remains behind verified-free server controls.
Research never creates/sends a customer order or publishes a website. After
internal approval, Open in Pricing transfers the scope to the existing calculator.
There is no unattended scheduler or coding/deployment agent in this version.

All visible agency text now uses Manrope. The shell owns section headings;
embedded operations keep their toolbars but hide duplicate section titles.
Browser validation uses the real components and runner with labeled synthetic
inputs in a local isolated QA harness. The production Next build remains the
framework/type check; no production credential/session bypass is introduced.
