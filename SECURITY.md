# Security and privacy

RetryCanvas is an educational, browser-only simulation. It does not issue
simulated requests to real services and is not a load-testing or security-testing
tool.

## Current data boundary

- Scenario values and generated events live in the page's memory.
- There is no built-in backend, login, telemetry, or scenario persistence.
- CSV export deliberately creates a file on the user's device. Deleting the
  page does not delete a downloaded file.
- Loading the page still requests its static assets. The selected hosting
  provider or local development server may log those requests.
- External documentation links leave the app when opened. Browser extensions,
  host-level analytics added by a deployer, and downloaded-file handling are
  outside this project's control.

Use synthetic scenario inputs. Do not put credentials, personal information,
customer identifiers, or private service names in a seed, exported file,
screenshot, issue, or pull request. A seed is not a secret-storage mechanism.
The deterministic generator is not suitable for cryptography.

## Reporting a vulnerability

Do not disclose exploit details, secrets, or private data in a public issue.
If the repository host offers **Security → Report a vulnerability**, use that
private channel. That option depends on the repository owner's settings; this
source tree cannot enable it.

If a private reporting route has not been enabled, ask the repository owner
for a private channel without including exploit details. No monitored security
email address, response-time guarantee, or formal support policy has been
established in this repository. Routine non-sensitive bugs can use the bug
report template.

For a report, include the affected commit/version, a minimal reproduction
using synthetic data, likely impact, and a suggested fix if available. Never
include live credentials or private traces.

## For contributors and deployers

- Keep the app's default network and storage behavior explicit.
- Review any new dependency, external asset, trace import, integration,
  persistence mechanism, or analytics feature as a privacy/security change.
- Treat CSV fields as untrusted when opening them in spreadsheet applications;
  any future text fields must account for formula injection.
- Keep dependency and license checks current. Passing a dependency audit does
  not establish that an application is secure.
- Vite's development and preview servers are local development tools. Deploy
  the built static output using an appropriate hosting service and its security
  controls rather than exposing a development server publicly.

The MIT license supplies the project without warranty. This document describes
current boundaries; it is not a security certification.
