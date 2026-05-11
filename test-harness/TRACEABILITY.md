# Traceability Matrix (Excel Overrides PDF)

## Excel test cases mapped to Jest tests

| Test Case | Title | Jest Test | Notes |
| --- | --- | --- | --- |
| NORU-7.1 | Joining disabled if ride is full | ride-joins.unit.test.ts - "blocks joining full rides" | Uses full ride state. |
| NORU-7.2 | Joining disabled if ride is full | ride-joins.unit.test.ts - "blocks joining full rides" | Covers zero seats left. |
| NORU-7.3 | Joining disabled if ride is full | ride-joins.unit.test.ts - "reflects real-time availability when a ride becomes full" | Verifies list updates and join rejection. |
| NORU-8.1 | Joining disabled if already in a ride | ride-joins.unit.test.ts - "blocks joining when already in another active ride" | Active ride precondition seeded. |
| NORU-8.2 | Joining disabled if already in a ride | ride-joins.unit.test.ts - "blocks duplicate join requests for the same ride" | Duplicate join validation. |
| NORU-8.3 | Joining disabled if already in a ride | ride-joins.unit.test.ts - "allows joining after leaving another ride" | Leave + join flow. |
| NORU-9.1 | Enter pickup / destination locations | ride-creation.unit.test.ts - "creates rides with valid pickup, destination, and vehicle type" | Valid data creates ride. |
| NORU-9.2 | Enter pickup / destination locations | ride-creation.unit.test.ts - "rejects missing pickup or destination" | Server validation. |
| NORU-9.3 | Enter pickup / destination locations | Not covered in backend tests | Same pickup/destination validation is not enforced in the Convex mutation. |
| NORU-9.4 | Enter pickup / destination locations | Not covered in backend tests | No ride edit mutation exists in the Convex layer. |
| NORU-10.1 | Vehicle type selection | ride-creation.unit.test.ts - "creates rides with valid pickup, destination, and vehicle type" | Auto covered. |
| NORU-10.2 | Vehicle type selection | ride-creation.unit.test.ts - "stores capacity based on vehicle type" | Cab covered. |
| NORU-10.3 | Vehicle type selection | ride-creation.unit.test.ts - "rejects invalid vehicle type inputs" | Invalid type rejected by validation. |
| NORU-10.4 | Vehicle type selection | Not covered in backend tests | No ride edit mutation exists in the Convex layer. |
| NORU-11.1 | Create / post the ride | ride-creation.unit.test.ts - "shows newly created rides in joinable list for other users" | Ride appears in list. |
| NORU-11.2 | Create / post the ride | ride-creation.unit.test.ts - "rejects missing pickup or destination" | Required field validation. |
| NORU-11.3 | Create / post the ride | ride-creation.unit.test.ts - "stores capacity based on vehicle type" | Seats stored via vehicle capacity. |
| NORU-11.4 | Create / post the ride | ride-creation.unit.test.ts - "shows pending join requests in hosted ride details" | Pending join appears for host. |
| NORU-12.1 | Participant list with avatar + name + email | ride-creation.unit.test.ts - "shows pending join requests in hosted ride details" | Email and name verified; avatars depend on student profiles. |
| NORU-12.2 | Participant list with avatar + name + email | ride-creation.unit.test.ts - "shows pending join requests in hosted ride details" | Avatar requires profile data, not seeded. |
| NORU-12.3 | Participant list with avatar + name + email | ride-creation.unit.test.ts - "shows pending join requests in hosted ride details" | Email verified in test. |
| NORU-12.4 | Participant list with avatar + name + email | ride-host-actions.integration.test.ts - "removes a pending joinee and sends a notification" | Validates list change after mutation. |

## Additional coverage for required ride flows

| Flow | Jest Tests |
| --- | --- |
| Accept / reject (remove) joinee | ride-host-actions.integration.test.ts - accept/remove tests |
| Cancel ride / end ride | ride-host-actions.integration.test.ts - stop ride tests |
| Ratings flow | ratings-and-reports.integration.test.ts - feedback tests |
| Report submission flow | ratings-and-reports.integration.test.ts - report tests |
