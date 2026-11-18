# Callzo Usage Admin Console — Task 2

## 1. Project overview

The Callzo Usage Admin Console is a React-based administration interface for viewing account usage and editing account settings. It integrates with the mock API supplied for the Callzo engineering assessment.

The mock API provides approximately 10,500 account records, account usage summaries, and a four-step settings workflow. Some API behaviors are intentionally unreliable and are part of the assessment, including occasional summary endpoint failures and a Step 2 validation error that can occur after a Step 4 draft exists.

> **Implementation note:** This README describes the intended project setup and behavior. Before submission, verify each feature and command against the final code and mark the testing checklist only after running the corresponding test.

## 2. Technology stack

- React
- Vite
- JavaScript
- Tailwind CSS
- Recharts
- Docker and Docker Compose
- Nginx

The frontend uses the browser's built-in `fetch()` API for HTTP requests.

## 3. Features

### Dashboard and usage analytics

- Usage summary cards populated from the summary API.
- Daily call-minutes and SMS charts using Recharts.
- Shared date-range filter for the chart and account table.
- Independent chart loading and error handling.
- Retry action for failed summary requests.

### Account management

- Server-side search across account name, email, and company.
- Server-side sorting.
- Status, country, plan, and signup-date filters.
- Server-side pagination.
- Row selection stored by account ID, so selection is retained when navigating between pages and while the table refreshes (as long as the Accounts component remains mounted).
- Periodic account refresh without intentionally clearing the currently displayed rows during a failed refresh.

### Four-step account settings

- Load account details and previously saved settings.
- Four editable steps: basic information, plan and billing, usage limits, and webhook configuration.
- Client-side validation and server-side validation display.
- Debounced autosave of individual steps.
- Restore successfully saved drafts from the settings API.
- Preserve the local draft when a save fails.
- Display a server validation error on the step number returned by the API, including the deliberate Step 2 `billing_country` behavior.
- Final submission through the mock API.

### Accessibility and responsive layout

- Labels for form controls.
- Keyboard-operable buttons, links, selects, and checkboxes.
- Visible keyboard focus styles.
- Status and error announcements where implemented.
- Responsive layout designed to remain usable at 375px width; the wide account table uses horizontal scrolling on narrow screens.

## 4. Project structure

The relevant frontend structure is:

```text
 task-2-frontend/
 ├── public/
 ├── src/
 │   ├── api/
 │   │   ├── api.js
 │   │   └── accountApi.js
 │   ├── components/
 │   │   ├── Sidebar.jsx
 │   │   ├── Header.jsx
 │   │   ├── SummaryCard.jsx
 │   │   ├── DateRangeFilter.jsx
 │   │   ├── UsageChart.jsx
 │   │   ├── SettingsSteps.jsx
 │   │   └── AsyncStates.jsx
 │   ├── pages/
 │   │   ├── Dashboard.jsx
 │   │   ├── Accounts.jsx
 │   │   └── AccountSettings.jsx
 │   ├── App.jsx
 │   ├── main.jsx
 │   └── index.css
 ├── .env.development
 ├── .env.production
 ├── .dockerignore
 ├── Dockerfile
 ├── nginx.conf
 ├── package.json
 ├── package-lock.json
 ├── tailwind.config.js
 ├── postcss.config.js
 ├── vite.config.js
 └── README.md
```

Your exact component names may differ slightly depending on the final project structure. Update this tree to match the files actually committed.

## 5. Prerequisites

Install:

- Node.js and npm.
- Docker Desktop with Docker Compose.
- A Docker Hub account (for publishing the frontend image).

The commands below use Windows PowerShell syntax where applicable.

## 6. Local development

### 6.1 Start the provided mock API

Run this command from the directory containing the provided `docker-compose.yml`:

```powershell
docker compose up -d mock-api
```

The mock API is exposed to the host at:

```text
http://localhost:8001
```

Check its health endpoint:

```powershell
Invoke-RestMethod http://localhost:8001/health
```

The expected response is similar to:

```json
{
  "status": "ok",
  "accounts": 10500
}
```

### 6.2 Start the React development server

Open another PowerShell terminal and enter the frontend directory:

```powershell
cd task-2-frontend
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, normally:

```text
http://localhost:5173
```

### 6.3 Development API proxy

The development environment uses:

```env
VITE_API_BASE_URL=/api
```

`vite.config.js` proxies requests beginning with `/api` to `http://localhost:8001` and removes the `/api` prefix. This keeps browser requests on the Vite origin and avoids browser CORS configuration for the local mock API.

For example:

```text
Browser: http://localhost:5173/api/accounts
Proxy:   http://localhost:8001/accounts
```

## 7. API integration

The frontend uses the endpoints documented in the supplied `Task2_spec.md`.

### Account list

```http
GET /accounts
```

Supported query parameters include:

- `page`
- `page_size` (maximum 200)
- `search`
- `status` (`active`, `trial`, `suspended`)
- `country`
- `plan` (`basic`, `pro`, `enterprise`)
- `date_from` and `date_to` (`YYYY-MM-DD`)
- `sort_by`
- `sort_dir` (`asc` or `desc`)

The response contains `data`, `total`, `page`, and `page_size`.

### Account details and usage summary

```http
GET /accounts/{id}
GET /accounts/summary?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
```

The summary response contains a daily `series` and `total_accounts`. Each series item can include `date`, `minutes`, `sms`, `cost_cents`, and `signups`.

**Expected failure behavior:** The summary endpoint is deliberately documented to return HTTP 500 occasionally (approximately one in five calls). The UI should handle this as a chart-specific failure and provide a retry action rather than treating it as an account-table failure.

### Four-step settings

```http
GET  /accounts/{id}/settings
PUT  /accounts/{id}/settings/step/{step}
POST /accounts/{id}/settings/submit
```

Each step is saved with a JSON body of this shape:

```json
{
  "data": {
    "field": "value"
  }
}
```

Fields specified for the steps:

| Step | Fields | Validation |
|---|---|---|
| 1 | `name`, `email` | Both required; email must contain `@` |
| 2 | `plan`, `billing_country` | Both required; values must be in the allowed sets |
| 3 | `minutes_cap`, `sms_cap` | Optional numeric values |
| 4 | `webhook_url` | Optional; if provided, must start with `http://` or `https://` |

**Special Step 2 behavior:** Once a Step 4 draft exists for an account, the mock API may reject a Step 2 save with `billing_country is required`, even when a valid country was sent previously. The frontend must display the error on Step 2, preserve the values entered in other steps, and allow the user to navigate without becoming stuck. Do not change or work around the mock API behavior.

## 8. State management decisions

The implementation keeps state in React component state and treats the mock API as the source of truth for persisted records.

### Server-owned data

- Account records and usage values.
- Aggregated usage summary.
- Account settings successfully saved by the API.
- Final submission result.

### Client-owned UI state

- Search text, filters, sort configuration, and current page.
- Selected account IDs.
- Current form step and current form values.
- Field validation messages.
- Loading, saving, retry, and error states.
- The last known successfully saved form snapshot used for discard/rollback behavior.

### Selection behavior

Selected rows are stored by account ID rather than by row index or a copy of the row object. This lets the UI retain selection when records are refreshed or the user changes pages, while the Accounts component remains mounted. Selection is not persisted across a full browser reload unless additional persistence is implemented.

### URL state

Search, filters, sorting, and pagination are currently held in React state rather than synchronized with URL query parameters. This keeps the implementation simpler, but these preferences reset on a full page reload.

### Autosave behavior

Form changes update local React state immediately. After a short debounce, the current step is validated and sent to the API. A successful save updates the last-saved snapshot. A failed save does not erase the current local draft; the user can retry or discard changes to return to the last known saved snapshot.

## 9. Error handling and refresh behavior

- **Initial loading:** show a loading state while the first request is pending.
- **Empty results:** show an empty state when a successful request returns no matching accounts or no chart series.
- **Account API failure:** display an error and retry action. Previously loaded rows should not be cleared solely because a background refresh failed.
- **Chart API failure:** handle independently from the account table; retain the last successful chart data for the same date range when a background refresh fails.
- **Partial failure:** one view can remain usable when another independent API request fails.
- **Settings restore failure:** do not assume that unknown server drafts are empty or allow a user to overwrite drafts that could not be restored.
- **Failed settings save:** keep the latest local values and do not update the saved snapshot until the API confirms success.
- **Periodic refresh:** account and summary requests are refreshed independently. The intended refresh interval is 30 seconds, with the next refresh scheduled after the previous request completes.

## 10. Production build

From the frontend project directory:

```powershell
npm ci
npm run build
```

Vite writes the production files to `dist/`.

The production frontend is served by Nginx. The production environment uses:

```env
VITE_API_BASE_URL=/api
```

Vite embeds this variable at build time; it is not a runtime browser environment variable.

## 11. Docker image

The Dockerfile uses a multi-stage build:

1. A Node.js stage installs dependencies and builds the Vite application.
2. An Nginx stage serves the generated static files and proxies API requests.

The Nginx configuration listens on port `3000` and forwards `/api/...` requests to the Compose service `http://mock-api:8001/...`.

Build the image from the frontend project directory. Replace `YOUR_DOCKERHUB_USERNAME` with the actual public Docker Hub username:

```powershell
docker login

docker build --pull `
  --build-arg VITE_API_BASE_URL=/api `
  -t YOUR_DOCKERHUB_USERNAME/callzo-task2-frontend:1.0.0 .
```

Push it:

```powershell
docker push YOUR_DOCKERHUB_USERNAME/callzo-task2-frontend:1.0.0
```

Confirm that the Docker Hub repository is public and that the `1.0.0` tag points to the image intended for evaluation.

## 12. Docker Compose integration

Add the frontend service to the **provided** Compose file alongside the existing mock API service. Preserve any supplied configuration that is needed by the mock API.

Example:

```yaml
services:
  mock-api:
    image: meetrj/callzo-mock-usage-api
    container_name: mock-api
    ports:
      - "8001:8001"

  frontend:
    image: YOUR_DOCKERHUB_USERNAME/callzo-task2-frontend:1.0.0
    container_name: callzo-frontend
    ports:
      - "3000:3000"
    depends_on:
      - mock-api
    restart: unless-stopped
```

Replace the Docker Hub username. The frontend service must reference the already-published image using `image:`; do not use `build:` in the submitted Compose configuration.

From the directory containing the Compose file:

```powershell
docker compose config
docker compose pull
docker compose up
```

Open the frontend:

```text
http://localhost:3000/
```

Test the mock API through the frontend's Nginx proxy:

```text
http://localhost:3000/api/health
http://localhost:3000/api/accounts?page=1&page_size=10
```

Useful diagnostics:

```powershell
docker compose ps
docker compose logs -f frontend
docker compose logs -f mock-api
```

The Docker hostname `mock-api` is resolvable from the frontend container on the Compose network. It is not a hostname that the user's browser should call directly; browser requests use the `/api` path on the frontend origin.

## 13. Scope trade-offs: what was not included and why

The assessment is focused on account usage administration, the specified table behavior, analytics, and the four-step settings workflow. The following items are outside the core scope and were not prioritized:

- **Authentication and role management:** the supplied mock API specification does not define an authentication flow.
- **Bulk account editing:** no corresponding bulk-edit endpoint is specified.
- **CSV/Excel export:** export is not part of the stated required workflow.
- **WebSocket updates:** periodic polling is sufficient for the specified refresh behavior and is simpler to operate.
- **Table virtualization:** server-side pagination limits the number of rows rendered at once, so virtualization was not prioritized.
- **Persisting selection across a full reload:** the requirement is stable selection across pages and refreshes during the mounted session; persistent cross-session selection would add storage and lifecycle complexity.
- **URL-synchronized filters and pagination:** filters and pagination are currently local React state; adding URL synchronization was not required for the core workflow.

These are scope decisions, not claims that the features are impossible. They could be added if the product requirements expand.

## 14. Manual verification checklist

Complete these checks before submission and update the checklist to reflect the actual test results:

- [ ] `npm ci` completes successfully.
- [ ] `npm run build` completes successfully.
- [ ] Mock API `/health` responds successfully.
- [ ] Account list loads from the mock API.
- [ ] Server-side search works.
- [ ] Sorting works in both directions.
- [ ] Status, country, plan, and date filters work.
- [ ] Pagination works.
- [ ] Row selection remains stable when changing pages.
- [ ] Row selection remains stable during periodic refresh.
- [ ] Date range updates the chart and account table together.
- [ ] Summary API failure is handled with a chart-specific retry.
- [ ] Four-step settings can be opened for an account.
- [ ] Successfully saved drafts are restored after reopening or refreshing.
- [ ] Autosave and individual step saves work.
- [ ] Failed saves do not erase local form values.
- [ ] Server validation errors appear on their associated step.
- [ ] Special Step 2 validation behavior is handled.
- [ ] Final settings submission works for a valid completed form.
- [ ] Keyboard navigation and visible focus have been checked.
- [ ] Layout has been checked at 375px width.
- [ ] Public Docker image can be pulled without private registry access.
- [ ] `docker compose up` starts the frontend and mock API together.
- [ ] Frontend API requests work through the Nginx `/api` proxy.

## 15. Submission notes

The Task 2 submission should include:

1. Working frontend source code.
2. This README with any project-specific values completed.
3. The public Docker Hub image reference.
4. The updated provided Docker Compose file referencing the published image.
5. Verified results for the required workflows.

Before handing in the project, replace every occurrence of `YOUR_DOCKERHUB_USERNAME`, verify the image tag and public visibility, and ensure the submitted Compose file uses the exact image that was tested.
