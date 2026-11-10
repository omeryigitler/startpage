# Agency workspace

Open Agency from the existing Startpage carousel or use `/#agency/overview`.
Sales and Studio manage source-backed Malta/Türkiye prospects and paused jobs.
Projects, Clients, Proposals, Pricing, Inbox and World reuse the authenticated
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
