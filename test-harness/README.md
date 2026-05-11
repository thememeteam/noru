# Noru Convex Test Harness

This folder contains Jest unit and integration tests that execute Convex functions in an in-memory test environment. It does not touch any dev database or server.

## Setup

1. `cd noru/test-harness`
2. `npm install`

## Run tests

- `npm test`
- `npm run test:coverage`

## Notes

- Tests use `convex-test` with a seeded in-memory database and fresh state per test.
- The Excel sheet is the primary source of test cases; see `TRACEABILITY.md` for mapping.
