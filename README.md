# VMS frontend (ui_vms)

React + Vite single-page app for the Vendor Management System. In every
environment it is served by the backend
([vendor_ms_kpn](https://github.com/developerkpn/vendor_ms_kpn)) from that
repo's `public/build`, so the two repos are checked out side by side:

```
<workspace>/
  ui_vms/          this repo
  vendor_ms_kpn/   the backend; the build lands in its public/build
```

## Running locally

Node 22.

```bash
npm ci
npm run dev          # Vite dev server on https://localhost:3000 (VITE_PORT to change)
```

The app reads `VITE_*` values from `.env` / `.env.production` (both
gitignored):

| Name | Production value | Meaning |
|---|---|---|
| `VITE_URL_LOC` | `/api` | API base |
| `VITE_URL` | `/` | App base |
| `VITE_URL_BE` | `/` | Backend base |
| `VITE_ETENDER` | `https://etender.gamasap.com` | eTender link |

## Tests

```bash
npm test             # node --test 'src/**/*.test.mjs'
```

The tests cover the plain-JS helpers (`src/helper`, form validation modules)
and run under Node without a browser or bundler.

## Build

```bash
npx vite build --mode production
```

Writes to `../vendor_ms_kpn/public/build` (see `vite.config.js`), which the
backend image then includes. Build the frontend before building a backend
image.

## Release

Updating the `prod` branch runs `.github/workflows/prod-release.yml`: it runs
the tests, then asks the backend repo to build and push the production image
`bwbimdm/vms-prod:prod-X.Y.Z` containing this exact commit. The backend
README describes that pipeline and its settings.

Repository setting it needs:

| Name | Kind | Purpose |
|---|---|---|
| `CUSTOM_GITHUB_TOKEN` | secret | Token allowed to send `repository_dispatch` to `developerkpn/vendor_ms_kpn` (fine-grained: Contents read & write on that repo) |

`aws.yml` is the older dev pipeline (branch `deploy_dev_ecs`) and is
unrelated.
