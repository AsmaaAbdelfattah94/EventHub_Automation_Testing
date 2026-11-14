# EventHub Booking Automation — Playwright (UI + API)

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
| UI — negative | `TC_UI_03`–`TC_UI_06`, `TC_UI_10`–`TC_UI_12` | Invalid email, alphabetic phone, 9-digit and 11-digit phone values, 1-character name, all fields empty, and a 2-character name accepted at the boundary |
| UI — cancellation | `TC_UI_07` | Create a five-ticket booking, cancel it, check it is removed from My Bookings, and check seat inventory |
| UI — multiple bookings | `TC_UI_08`, `TC_UI_09` | Book distinct events and test the expected same-event booking restriction |
| API — positive/lifecycle | `TC_API_01`, `TC_API_05`, `TC_API_06` | Create booking, check persisted data and price, cancel and confirm the booking no longer exists (404), restore seats, book two events |
| API — negative | `TC_API_02`–`TC_API_04`, `TC_API_07`–`TC_API_18` | Quantity boundaries, invalid event, unauthenticated request, repeated booking, insufficient seats, documented field rules (name, email, phone, quantity), all fields missing, name/phone lower boundaries accepted, and a non-numeric booking ID on cancel |

Some expectations (in particular, cumulative per-user ticket limits and email normalization) require clarification against the product requirements; see **Story / documentation / application mismatches** and **Known observations and limitations**.

## Story review

US-114 describes the happy path only. It does not define limits, validation rules, error behaviour, or what "cancel" means, so the following questions are for the Product Owner:

1. What is the maximum number of tickets a user can book for a single event?
2. What is the minimum allowed ticket quantity? If a user selects zero tickets, should the application display a validation error or disable the booking action?
3. Can a user book the same event multiple times?
   - If the combined ticket quantity remains within the allowed limit.
   - If the user has already reached the maximum limit in a previous booking.
4. What is the expected behavior when a required field is empty or contains invalid data? Should an error message appear, or should the booking action be disabled?
5. What are the accepted formats and validation rules for customer names, email addresses, and phone numbers?
6. Should international phone numbers and different country codes be supported?
7. How should ticket availability and inventory be managed?
   - What happens when the requested quantity exceeds the available tickets?
   - Should the booking be rejected if the event is sold out?
   - Should inventory be updated immediately after booking confirmation?
   - Should cancelled tickets become available again?
8. According to AC2, the total price equals the ticket price multiplied by the ticket quantity. Does this exclude additional taxes, service charges, and booking fees?
9. Is payment part of the booking process?
   - If yes, which payment methods should be supported?
   - What happens if payment fails or is interrupted?
10. How should booking confirmation be communicated to the user?
    - On-screen confirmation message.
    - Email notification.
    - SMS notification.
11. What information should be included in the booking confirmation?
12. What is the expected format for the reference number?
13. Is there a specific time limit for cancelling a booking?
14. If payment is supported, what is the refund policy for valid cancellations?
15. Is registration required to complete a booking, or can I complete it as a visitor?because the website mandates login but the user story mentioning visitor?
16. What is the expected behavior if two users are booking at the same time?
17. What is the group tickets cancellation policy?
18. What is the expected behavior after clearing all the bookings? Is it similar to cancellation, and are the tickets expected to be available again?
19. what is the expected behavior after cancellation ? should the booking still visible with status cancelled or totally deleted?
20. Is it acceptable to use an email in the booking that is different from the one used to log in?

## Story / documentation / application mismatches

Every row below was observed directly against the live application and API (`https://api.eventhub.rahulshettyacademy.com/api/`) with the test account. All bookings created for these checks were cancelled afterwards.

| Topic | Story / docs say | Application does (observed) | Question for the PO |
| --- | --- | --- | --- |
| Booking reference format | API docs (`POST /bookings`, `GET /bookings/ref/{ref}`, `Booking` schema): `EVT-XXXXXX`, e.g. `EVT-A1B2C3` | API and UI return one letter, a dash and six alphanumerics, where the letter is the event title's initial, e.g. `H-MM11UN` for *Hollywood Monsoon Night* and `D-5YSOWF` for *Dilli Diwali Mela* | Which format is correct? Is the prefix meant to identify the event? |
| Phone validation | UI error: "Enter a valid 10-digit phone". API schema: `customerPhone` `minLength: 10`, example `+91-9876543210`, no pattern | The UI rejects 9 digits and letters, but accepts 11 digits (`12345678901`) and `+91-9876543210`. The API schema mentioning "Customer phone must contain only digits and +, -, spaces, or parentheses", a rule that is not in the UI. Both the UI and the API also accept a 20-digit phone (`12345678901234567890`) | What is the actual rule (exactly 10 digits, at least 10, international formats)? Should the UI message and API schema be aligned with it? |
| Email storage | Schema: `customerEmail` `format: email`. AC1: "enter my … email" | `Probe.Dotted.User@Gmail.com` is stored as `probedotteduser@gmail.com` (lower-cased, dots removed). The non-Gmail address `probe.user@example.com` is stored unchanged | Must the email be stored exactly as submitted? Is Gmail-specific normalization intended, and should it be documented? |
| Price data types | Schema: `Event.price` and `Booking.totalPrice` are `number` | The API returns strings, e.g. `"price": "2500"` and `"totalPrice": "25000"` | Is the schema or the API wrong? Clients that do arithmetic on these fields need to know. |
| Invalid booking ID | `DELETE /bookings/{id}`: `id` is documented as an integer, and an unknown ID returns 404 | `DELETE /bookings/abc` returns **500 Internal server error** | A non-numeric ID is a client error. Should it return 400 (or 404)? A 500 suggests the input is not validated (defect). |

## Test selection rationale

- **Acceptance criteria first:** every criterion (AC1–AC5) is covered by at least one test. AC1–AC4 run through the UI because that is how the user experiences them. AC5 and the business rules are repeated at API level, where status codes and payloads can be asserted precisely and quickly.
- **Money and inventory checks:** total price = unit price × quantity is checked for 1 and 10 tickets (`TC_UI_01`, `TC_UI_02`, `TC_API_01`), and seat decrement and restoration on cancel are checked in both layers (`TC_UI_07`, `TC_API_05`). In the UI, the expected unit price is read from the event card on the events page, not from the booking summary being tested, so a wrong price on the booking page cannot confirm itself.
- **Boundary values from the documented rules:** quantity 0, 1, 10 and 11 (`TC_API_02`, `TC_UI_01`, `TC_UI_02`, `TC_API_08`), and a request larger than the remaining seats (`TC_API_09`).
- **Validation where the user sees it:** invalid email, alphabetic phone, and 9- and 11-digit phones around the UI's "10-digit" rule, a 1-character name, and an empty form; plus a 2-character name that must be accepted (`TC_UI_03`–`TC_UI_06`, `TC_UI_10`–`TC_UI_12`).
- **The documented API rules:** each rule in the `CreateBookingInput` schema has a test: name of at least 2 characters, valid email, phone of at least 10 characters (tested with 3 digits, plus 20 digits to probe the missing maximum), integer quantity, and all five fields required (`TC_API_10`–`TC_API_15`). The lower boundaries are also checked from the accepting side (`TC_API_16`, `TC_API_17`). Like `TC_API_02` and `TC_API_08`, each rejection test checks the field and the exact message the API returns. `TC_API_13` checks only the field, because no maximum length (and so no message) is defined yet.
- **Security and robustness of the API:** booking without authentication (`TC_API_04`), booking a non-existent event (`TC_API_03`), and cancelling with a non-numeric booking ID (`TC_API_18`).
- **Multiple bookings:** different events (`TC_UI_08`, `TC_API_06`) and the same event twice (`TC_UI_09`, `TC_API_07`), because the story does not define whether the ticket limit is cumulative. These tests deliberately expose that open question.


## Framework structure

```text
.github/workflows/       GitHub Actions CI workflow
api/                     API clients (events, bookings, auth) and request/response models
fixtures/apiFixtures.ts  Authenticated API context (one login per worker) and booking cleanup
fixtures/uiFixtures.ts   Page objects and booking tracking/cleanup for UI tests
pages/                   UI page objects
playwright.config.ts     Playwright projects, browsers and reporting
tests/
  auth.setup.ts          UI sign-in and storage-state creation
  UI_Testing/            UI test cases
  API_Testing/           API test cases
utils/                   Test utilities, including targeted UI booking cleanup
```

Playwright projects separate **`setup`** (UI authentication), **`chromium`** (UI tests), and **`api`** (API tests). The UI project depends on `setup` and loads the resulting session state. API fixtures authenticate independently and pass a Bearer token to API requests.

UI tests receive their page objects (`eventsPage`, `bookingPage`, `myBookingsPage`) and a `trackBooking(reference)` function from `fixtures/uiFixtures.ts`, so the specs contain no setup or `try/finally` cleanup code.

### Test data and cleanup

- UI tests register the **booking references they create** with the `trackBooking` fixture, which cancels only those references after the test, including when it fails. They do **not** use *Clear all bookings* for account-wide cleanup. Before checking each reference, cleanup reopens My Bookings and waits until the booking list (or the "No bookings yet" state) has rendered, so a missing card really means the booking is gone. After cancelling, it confirms that the card has disappeared.
- API fixtures track booking IDs returned by successful creation requests and attempt to cancel those IDs after each test, including when assertions fail.
- According to the API docs, each registered user gets an isolated sandbox, so other users cannot change this account's events or bookings. Tests running in parallel, or overlapping local and CI runs on the same account, may change inventory, so exact seat-count comparisons are sensitive to concurrency. CI executes with one worker and a `concurrency` group so that runs of this pipeline do not overlap.

## Key decisions and trade-offs

- **Authorization handled by the framework:** UI tests reuse a session saved once by `tests/auth.setup.ts` (`storageState`); API tests receive an authenticated request context with the bearer token from `fixtures/apiFixtures.ts`; it is worker-scoped, so the API suite logs in once per worker instead of once per test. 
- **Fixtures instead of per-test setup:** page objects, API clients and booking cleanup are provided by fixtures (`uiFixtures.ts`, `apiFixtures.ts`). New tests only declare what they need, and cleanup cannot be forgotten.
- **Direct lookups instead of list scans:** the API clients use `GET /events/{id}`, `GET /bookings/{id}` and `GET /bookings/ref/{ref}`. Paging through `GET /events` is kept in one helper, only for "find an event with N seats".
- **Targeted cleanup instead of "Clear all bookings":** the first version used the *Clear all bookings* button, which is destructive: it wipes every booking in the account, including those of a parallel or manual run. It was replaced by cleanup that cancels only the references or IDs each test created, in fixture teardown (`trackBooking` for UI, `bookingApi` for API) so it also runs after failures.
- **One worker:** several tests assert exact seat counts on shared events, so CI runs with `--workers=1`, and the same is recommended locally.
- **API tests pick events dynamically:** they choose an event with enough seats at runtime instead of relying on fixed IDs. The UI tests still use two seeded event names, which is a known inconsistency.
- **No weakened assertions**: Where the expected behavior is not clearly defined or conflicts with the application's implementation (TC_API_01, TC_API_07, TC_API_13, TC_UI_06, TC_UI_09), the affected test cases are marked as skipped using test.skip() until clarification is received from the Product Owner. Each test retains an open-question annotation describing the ambiguity, which is visible in the Playwright HTML report.


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

Create a local `.env` file in the project root:

```dotenv
TEST_EMAIL=test.example.automation@gmail.com
TEST_PASSWORD=Test1234@
API_BASE_URL=https://api.eventhub.rahulshettyacademy.com/api/
API_IGNORE_HTTPS_ERRORS=true #if you have a certificate problem
```

`playwright.config.ts` loads local environment variables through `dotenv/config`. `TEST_EMAIL` and `TEST_PASSWORD` are needed for the UI login setup and authenticated API requests. `API_BASE_URL` is required by the API fixture and selects the API endpoint; `API_IGNORE_HTTPS_ERRORS` controls the API client's TLS-verification setting.

## Running tests

The Playwright commands:

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

The workflow uses one worker because test scenarios operate against a shared booking account and live inventory. CI may retry failed tests according to `playwright.config.ts`.

### Configuration and secrets in the pipeline

**No credentials are hardcoded into the repository or the workflow.** Authentication is configured through **GitHub Actions repository secrets**:

1. Open **Repository → Settings → Secrets and variables → Actions**.
2. Create secrets named **`TEST_EMAIL`** and **`TEST_PASSWORD`** with the credentials of a dedicated EventHub automation account.
3. The workflow exposes them only to the test job as environment variables:

```yaml
env:
  CI: "true"
  TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
  TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
  API_BASE_URL: https://api.eventhub.rahulshettyacademy.com/api/
```



The public API URL and the `CI` flag are non-secret configuration values. The local `.env`, authenticated Playwright storage state (`playwright/.auth/`), `node_modules/`, and generated reports/results must remain excluded through `.gitignore`. **Do not commit passwords, bearer tokens, saved sessions, or a real `.env` file.** GitHub automatically masks configured secret values.



### Accessing the report after a push

1. Open the [repository's Actions tab](https://github.com/AsmaaAbdelfattah94/EventHub_Automation_Testing/actions).
2. Select the workflow run associated with the push.
3. Inspect **Playwright UI and API Tests** for individual step logs and the run's pass/fail status.
4. Under **Artifacts** on the run summary, download **`playwright-html-report`**.
5. Extract the archive and open **`index.html`** in a browser. Download **`playwright-test-results`** for failure screenshots (traces are not recorded in CI; see above).


## Known observations and limitations

The following test cases cover behaviors where the application's implementation differs from the assumed requirements or where the expected behavior requires clarification from the Product Owner (PO).

To avoid reporting unconfirmed requirements as either passed tests or confirmed defects, these test cases are marked as Skipped using Playwright's test.skip() and retain an open-question annotation describing the ambiguity.

The original assertions remain unchanged and can be re-enabled once the PO confirms the expected behavior. Skipped tests are explicitly visible in the Playwright HTML report and do not cause the CI pipeline to fail.

| Test | Observation | Follow-up |
| --- | --- | --- |
| `TC_API_01` | A dotted Gmail address is stored lower-cased with the dots removed, so the exact-string email comparison fails | Clarify whether the submitted email string must be preserved |
| `TC_API_07` | A second 10-ticket booking for the same event is accepted | Clarify whether the maximum of 10 tickets applies **per request** or **cumulatively per user/event** |
| `TC_UI_09` | No booking-limit message appears; the second 10-ticket booking for the same event is accepted | Same question as `TC_API_07` |
| `TC_UI_06` | An 11-digit phone number is accepted despite the "10-digit phone" message | Confirm the required phone-number validation rule |
| `TC_API_13` | A 20-digit phone number is accepted; the docs define only a minimum length | Same question as `TC_UI_06` |
| `TC_API_18` | `DELETE /bookings/abc` returns 500 instead of a 4xx client error | Report as a defect; annotated `defect` rather than `open-question` |



## What I would do with more time

- **More atomic API validation tests:** one test per missing required field (today a single test sends an empty body and checks all five fields), `DELETE` of a booking that does not exist (expect 404), and cancelling the same booking twice (expect 404 on the second call).
- **Wider coverage:** other browsers , and simultanous bookings.
- **Testing no functional behavior:** Response time , stress test, reliability, ...etc

---

