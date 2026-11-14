# EventHub Booking Automation — Playwright (UI + API)
Story Review:

1. What is the maximum number of tickets a user can book for a single event?
2. What is the minimum allowed ticket quantity? If a user selects zero tickets, should the application display a validation error or disable the booking action?
3. Can a user book the same event multiple times?
		-If the combined ticket quantity remains within the allowed limit.
		-If the user has already reached the maximum limit in a previous booking.
4. What is the expected behavior when a required field is empty or contains invalid data, Should an error message appear or the booking action will be disabled?
5. What are the accepted formats and validation rules for customer names, email addresses, and phone numbers?
6.Should international phone numbers and different country codes be supported?
7. How should ticket availability and inventory be managed?
		-What happens when the requested quantity exceeds the available tickets?
		-Should the booking be rejected if the event is sold out?
		-Should inventory be updated immediately after booking confirmation?
		-Should cancelled tickets become available again?
8. According to AC2, the total price equals the ticket price multiplied by the ticket quantity. Does this exclude additional taxes, service charges, and booking fees?
9. Is payment part of the booking process?
		-If yes, which payment methods should be supported?
		-What happens if payment fails or is interrupted?
10. How should booking confirmation be communicated to the user?
		-On-screen confirmation message.
		-Email notification.
		-SMS notification.
11. What information should be included in the booking confirmation?
12. What is the expected format for the refernece number?
13. Is there a specific time limit for cancelling a booking?
14. If payment is supported, what is the refund policy for valid cancellations?
15. What are the expected HTTP status codes and response structures for successful and unsuccessful API requests?
		-Missing mandatory fields.
		-Invalid customer information.
		-Invalid ticket quantities.
		-Insufficient ticket availability.
16. Is the registration must to complete a booking or I can complete it as a visitor?
17. What is the expected behavior if two users are booking at the same time?
18. What is the group tickets cancellation policy?
19. What is the expected behavior after clearing all the bookings ? Is it similar to cancellation and the tickets expected to be available again ?
20. Is it acceptable to use another mail in the booking different from the one used to login?




Automated verification of the EventHub ticket-booking flow using **Playwright**, **TypeScript**, and **GitHub Actions**.

- **Application:** https://eventhub.rahulshettyacademy.com/
- **API documentation:** https://api.eventhub.rahulshettyacademy.com/api/docs/
- **Repository:** https://github.com/AsmaaAbdelfattah94/EventHub_Automation_Testing
- **CI executions:** [GitHub Actions](https://github.com/AsmaaAbdelfattah94/EventHub_Automation_Testing/actions)

## Scope

The test suite covers booking creation and confirmation, booking-reference generation, ticket quantity and price calculations, visibility in **My Bookings**, cancellation and seat restoration, multiple bookings, authentication, input-validation boundaries, and insufficient inventory.

**Test organization:**

| Area | Tests | Description |
| --- | --- | --- |
| UI — positive | `TC_UI_01`, `TC_UI_02` | Book one and ten tickets; check confirmation, price and booking details |
| UI — negative | `TC_UI_03`–`TC_UI_06` | Invalid email, alphabetic phone, 9-digit and 11-digit phone values |
| UI — cancellation | `TC_UI_07` | Create a five-ticket booking, cancel it, and check seat inventory |
| UI — multiple bookings | `TC_UI_08`, `TC_UI_09` | Book distinct events and test the expected same-event booking restriction |
| API — positive/lifecycle | `TC_API_01`, `TC_API_05`, `TC_API_06` | Create booking, check persisted data and price, restore seats, book two events |
| API — negative | `TC_API_02`–`TC_API_04`, `TC_API_07`–`TC_API_09` | Quantity boundaries, invalid event, unauthenticated request, repeated booking and insufficient seats |

Some expectations (in particular, cumulative per-user ticket limits and email normalization) require clarification against the product requirements; see **Known observations and limitations**.

## Framework structure

```text
.github/workflows/       GitHub Actions CI workflow
api/                     API clients and TypeScript response/request models
fixtures/apiFixtures.ts  Authenticated API context and booking cleanup
pages/                   UI page objects
playwright.config.ts     Playwright projects, browsers and reporting
tests/
  auth.setup.ts          UI sign-in and storage-state creation
  UI_Testing/            UI test cases
  API_Testing/           API test cases
utils/                   Test utilities, including targeted UI booking cleanup
```

Playwright projects separate **`setup`** (UI authentication), **`chromium`** (UI tests), and **`api`** (API tests). The UI project depends on `setup` and loads the resulting session state. API fixtures authenticate independently and pass a Bearer token to API requests.

### Test data and cleanup

- UI tests track the **booking references they create** and cancel only those references during teardown or the scenario's explicit cancellation step. They do **not** use *Clear all bookings* for account-wide cleanup.
- API fixtures track booking IDs returned by successful creation requests and attempt to cancel those IDs after each test, including when assertions fail.
- A failed booking response or an interrupted test may prevent its reference/ID from being captured; such a booking cannot safely be removed by targeted cleanup without further identification.
- Tests use a shared live environment. Other users or runs may change event inventory, so exact global seat-count comparisons can be sensitive to concurrency. CI executes with one worker to reduce interference **within this pipeline**, not to prevent external changes.

## Prerequisites

- Node.js and npm (the CI runner uses Node.js 24)
- Git
- A valid **EventHub test account**

## Local setup

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/AsmaaAbdelfattah94/EventHub_Automation_Testing.git
cd EventHub_Automation_Testing
npm ci
npx playwright install chromium
```

Create a local `.env` file in the project root (do **not** commit it):

```dotenv
TEST_EMAIL=your-test-account@example.com
TEST_PASSWORD=your-test-account-password
API_BASE_URL=https://api.eventhub.rahulshettyacademy.com/api/
API_IGNORE_HTTPS_ERRORS=false
```

`playwright.config.ts` loads local environment variables through `dotenv/config`. `TEST_EMAIL` and `TEST_PASSWORD` are needed for the UI login setup and authenticated API requests. `API_BASE_URL` selects the API endpoint; `API_IGNORE_HTTPS_ERRORS` controls the API client's TLS-verification setting.

## Running tests

```bash
# All configured projects (UI setup, UI tests, API tests)
npx playwright test --workers=1

# UI tests (runs the dependent authentication setup)
npx playwright test --project=chromium --workers=1

# API tests only
npx playwright test --project=api --workers=1

# One test case
npx playwright test --project=chromium --grep 'TC_UI_07'

# TypeScript check
npx tsc --noEmit

# Open the local HTML report
npx playwright show-report
```

## Continuous integration — GitHub Actions

**Requirement:** Run tests on every push and make the test report available.

The repository includes a workflow under **`.github/workflows/`**. It is triggered by **`push`** (and also supports manual `workflow_dispatch` runs). Its CI job:

1. Checks out the repository on a GitHub-hosted Ubuntu runner.
2. Sets up **Node.js 24**.
3. Installs dependencies with **`npm ci`** from `package-lock.json`.
4. Installs Chromium with the required Linux dependencies using **`npx playwright install --with-deps chromium`**.
5. Validates TypeScript with **`npx tsc --noEmit`**.
6. Executes **`npx playwright test --workers=1 --reporter=html,list`**, covering the authentication setup, UI and API projects.
7. Uploads the **Playwright HTML report** and **test-results artifacts**, using `if: always()` so that evidence is retained even if tests fail.

The workflow uses one worker because test scenarios operate against a shared booking account and live inventory. CI may retry failed tests according to `playwright.config.ts`; a test assertion failure still causes the job to fail if the retries do not pass. A red workflow does not necessarily mean the CI setup itself is broken: inspect the individual test failures and logs.

### Configuration and secrets in the pipeline

**No credentials are hardcoded into the repository or the workflow.** Authentication is configured through **GitHub Actions repository secrets**:

1. Open **Repository → Settings → Secrets and variables → Actions**.
2. Create secrets named **`TEST_EMAIL`** and **`TEST_PASSWORD`** with the credentials of a dedicated EventHub automation account.
3. In the workflow, expose them only to the test job as environment variables:

```yaml
env:
  CI: 'true'
  TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
  API_BASE_URL: https://api.eventhub.rahulshettyacademy.com/api/
  API_IGNORE_HTTPS_ERRORS: 'false'
```

The YAML above shows the **recommended secure configuration**, not a claim that all existing historical workflow runs already used it. Earlier CI logs showed `API_IGNORE_HTTPS_ERRORS=true` because of a certificate-trust issue. **Disabling TLS verification is a temporary diagnostic workaround and should not be the final pipeline setting.** If a runner cannot validate the API certificate with the flag set to `false`, repair the server certificate chain or provide a trusted CA rather than permanently bypassing certificate validation.

The public API URL and the `CI` flag are non-secret configuration values. The local `.env`, authenticated Playwright storage state (`playwright/.auth/`), `node_modules/`, and generated reports/results must remain excluded through `.gitignore`. **Do not commit passwords, bearer tokens, saved sessions, or a real `.env` file.** GitHub automatically masks configured secret values in many logs, but test response bodies, traces and screenshots can still expose sensitive information; restrict artifact access and avoid logging credentials.

Repository secrets are generally unavailable to workflow runs from untrusted forked pull requests, so authentication-dependent tests may not run in that context without a separately approved secure strategy.

### Accessing the report after a push

1. Open the [repository's Actions tab](https://github.com/AsmaaAbdelfattah94/EventHub_Automation_Testing/actions).
2. Select the workflow run associated with the push.
3. Inspect **Playwright UI and API Tests** for individual step logs and the run's pass/fail status.
4. Under **Artifacts** on the run summary, download **`playwright-html-report`**.
5. Extract the archive and open **`index.html`** in a browser. Download **`playwright-test-results`** for available failure screenshots/traces.

Artifacts are available for their configured retention periods; they are not committed to the repository.

## Known observations and limitations

The following outcomes were observed during earlier test executions; they are included for transparency and should not be represented as confirmed defects without checking the authoritative acceptance criteria.

| Test | Observation | Follow-up |
| --- | --- | --- |
| `TC_API_01` | The backend appeared to normalize a dotted Gmail address, causing exact-string email comparison to fail | Clarify whether preservation of the submitted email string is required |
| `TC_API_07` | A second 10-ticket booking for the same event was accepted | Clarify whether the maximum of 10 tickets applies **per request** or **cumulatively per user/event** |
| `TC_UI_09` | The expected visible booking-limit message was not found | Confirm expected restriction and inspect the UI trace / actual response |
| `TC_UI_06` | An 11-digit phone number was accepted | Confirm the required phone-number validation rule |

The cancellation inventory test `TC_UI_07` subsequently passed following timeout and diagnostic work. Inventory remains shared, so changes made by other users may still affect absolute seat counts. Do not weaken assertions merely to produce a green CI result; document product failures and ambiguous requirements separately.

## Submission checklist

- [ ] Current UI and API suites committed, including **targeted booking cleanup**
- [ ] GitHub Actions workflow committed and triggered automatically on push
- [ ] `TEST_EMAIL` and `TEST_PASSWORD` configured as GitHub repository secrets
- [ ] TLS verification enabled in the final CI configuration, or the temporary workaround explicitly disclosed
- [ ] HTML report visible as a downloadable GitHub Actions artifact
- [ ] CI status and known product issues reviewed and reported accurately
- [ ] `.env`, authentication state and generated artifacts absent from committed files

---

