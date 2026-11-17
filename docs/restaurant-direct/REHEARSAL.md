# Second-tenant onboarding rehearsal

Local fictional tenant only. No projects, remote SQL, workflow changes, secrets,
pushes, merges or deployments performed. Existing unrelated edits were preserved.
Requested base restaurant-direct/kitchen-live did not exist locally or on origin;
actual base is restaurant-direct/kitchen-screen, on restaurant-direct/tenant-rehearsal.
The scaffold ran after a failed branch command, before the escalated branch creation.
TaskHub was read successfully; no task was added because this request forbids live writes.
Existing payment sandbox and kitchen device tasks remain open.

## Measured timing

Epoch boundaries below came from date +%s at command boundaries. Minutes include
approval/tool waits and editing, not just CPU time. Initial reading/base lookup before
the first timestamp is UNMEASURED and excluded. Adjacent boundaries include small
orchestration gaps; external steps are deferred, not claimed as measured setup.

| Runbook step | Start epoch | End epoch | Minutes | Method | What was unclear / gap |
|---|---:|---:|---:|---|---|
| 1. Scaffold; unavailable base and branch permission | 1794901583 | 1794902801 | 20.30 | Scripted + approval | kitchen-live missing locally/origin; used kitchen-screen. Initial .git write refused; scaffold ran before branch creation succeeded. |
| 0, 2. Fictional content, original SVG, fixture config | 1794902801 | 1794902853 | 0.87 | Manual edits | Template assumes real photos and burger-layer hero; used marquee-only home. First fixture edit broke a URL; corrected. |
| 3. Offline SQL and tenant check; repair fixture ref | 1794902853 | 1794902880 | 0.45 | Scripted + manual | Synthetic ref must satisfy 20-letter format; checker is consistency, not proof a project exists. |
| 4. Per-tenant settings, secret resolution, isolation tests | 1794902880 | 1794902925 | 0.75 | Manual edits + scripted checks | Secret names were global; generator/runtime now support names metadata, staging guard retained. |
| 5. Release/rollback docs and initial tests | 1794902925 | 1794902933 | 0.13 | Manual edits + scripted | Master fans out. Document hold branches and coordinated flag rollback. |
| 6. Builds and browser verification | 1794902933 | 1794903194 | 4.35 | Scripted + manual inspection | MCP unavailable; CLI required cache permission. Dev server demo-cache error; use tenant production preview. |
| 7. Extract inherited extras copy; final verification | 1794903194 | 1794903629 | 7.25 | Manual + scripted | Shared page and PDF hardcoded tenant prices; moved unchanged text to Jimmy config and left fixture empty. Concurrent push migration required local snapshot regeneration. |

Total measured elapsed: **34.10 minutes**.

## Manual steps remaining (deliberately deferred)

- Runbook 0/2: real tenant content collection and art direction are not measured here.
  Fixture is fictional, SVG-only, no testimonials or food photography.
- Runbook 3: create isolated Supabase project, replace synthetic ref, apply migrations
  and seeds, compare fingerprint, configure Auth, create owner/staff, enable MFA, verify.
- Runbook 4: duplicate three n8n workflows, replace paths, recipients, brand and links,
  test separately, then activate and update webhooks. All three fixture URLs stay null.
- Runbook 5: create Vercel project, environment and domain, release branch isolation.
  Rehearsal tenant itself is blocked from hosted builds.
- Runbook 6: approved deployment, inbox and order/booking/device checks. No live smoke
  tests were attempted. Payfast needs separately reviewed second-project enablement;
  the Edge Function intentionally remains staging-only and sandbox-only.

## Costs and duplicate workflow work

These are planning allowances, not current provider prices or measured costs.

| Per tenant | Estimate / basis |
|---|---|
| Supabase production | UNVERIFIED: budget R500–R1,000/month incremental compute/storage/backups; actual organisation plan and usage unknown |
| Optional isolated staging | UNVERIFIED: another R500–R1,000/month; pausing/plan allowances unknown |
| Vercel | UNVERIFIED: R0–R500/month incremental hosting; account seats and traffic allocation unknown |
| Domain | UNVERIFIED: R100–R400/year depending on TLD/registrar |
| n8n + SMTP | UNVERIFIED: R0–R300/month allocated shared capacity; execution/email volumes unmeasured |
| Payfast | UNVERIFIED: transaction charges additional; no fee rate assumed or tested |
| Duplicate n8n setup | UNVERIFIED: three workflows, 15–30 min each plus 15–30 min smoke test, 60–120 min total |
| Future notification changes | UNVERIFIED: three copies per tenant require repeated edits/testing; no shared workflow abstraction demonstrated |

## Assumptions and limits

The missing requested base may be a naming mismatch; kitchen-screen is the available
kitchen implementation. Fictional local fixtures override real-client content collection
only for this tenant. Payments and webhooks remain off; synthetic references are never
credentials. Kitchen infrastructure is mirrored in browser config and checked for parity.
Settings isolation means tenant-owned configuration and separate project targets; it does
not claim verified runtime RLS isolation between real second-tenant deployments.
Names metadata is safe to commit; credential values belong only in project secrets.
No billable service was provisioned and no money was sent. External setup remains unmeasured.

## Verification result

- npm run check: pass.
- npm test: 125/125 pass against the shared workspace, including concurrently added push tests.
- npm run build: pass (default tenant and rehearsal-grill); check-build production guard passed.
- npm run build:demo: pass; check-build verified the demo remains Supabase-free.
- npm run check-tenant -- rehearsal-grill: pass, with expected fictional/off/photo warnings.
- git diff --check: pass.
- Isolated production preview /menu inspected at 1440 and 390 pixels: fictional dish
  present, inherited extras absent, no horizontal overflow. SVG assets loaded.
  Screenshots: /tmp/rehearsal-isolated-1440.png and /tmp/rehearsal-isolated-390.png.
  This is fixture visual verification, not the deferred live owner-console/device trial.

Concurrent workspace activity added kitchen push work, changed the checked-out branch,
and overwrote dist during an earlier browser pass. The final browser pass used an
isolated /tmp/rehearsal-isolated-dist build on port 5192. The rehearsal branch was
restored; the subsequently created kitchen-live and rehearsal branches both pointed
to 235637d at verification. Existing concurrent changes remain in the shared working
tree; no commits or pushes were made by this rehearsal. Local snapshot regeneration
included the concurrently supplied kitchen-push migration. The shared menu/PDF extras
copy was extracted unchanged into Jimmy's tenant config solely to stop cross-tenant
content inheritance; Jimmy's rendered wording is preserved.

Scripts changed by this rehearsal: scripts/new-tenant.mjs,
scripts/lib/tenant-settings.mjs, scripts/lib/check-tenant.mjs,
scripts/check-build.mjs; payment runtime: supabase/functions/payfast/index.ts.
Related types, schema, tenant settings/seeds, menu page/PDF and regression tests changed.
