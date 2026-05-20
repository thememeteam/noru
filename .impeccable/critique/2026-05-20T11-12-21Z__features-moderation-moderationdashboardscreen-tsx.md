---
target: moderation dashboard and report detail page
total_score: 14
p0_count: 1
p1_count: 4
timestamp: 2026-05-20T11-12-21Z
slug: features-moderation-moderationdashboardscreen-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Status banner orphaned; no timestamp on metrics; no triage signal on list items |
| 2 | Match System / Real World | 2 | Ban and Unban as parallel siblings; placeholder format opaque; bulk-ban invisible |
| 3 | User Control and Freedom | 1 | No undo on ban; no confirmation gate; Back as action-zone button |
| 4 | Consistency and Standards | 2 | sectionLabel at two semantic roles; green on Unban violates Status-Only Rule |
| 5 | Error Prevention | 0 | Ban fires immediately on tap; no confirmation; no preview of bulk-ban targets |
| 6 | Recognition Rather Than Recall | 2 | No timestamp or age signal on report items |
| 7 | Flexibility and Efficiency | 1 | Bulk-ban invisible; no triage sorting; no quick-resolve |
| 8 | Aesthetic and Minimalist Design | 2 | Monster card; hero-metric template; identical card grid; three equal-weight buttons |
| 9 | Error Recovery | 1 | Alert fires after ban committed; isBanning may get stuck on throw |
| 10 | Help and Documentation | 1 | No definition of resolved; no format hints; comma syntax undocumented |
| **Total** | | **14/40** | **Needs significant work** |

## Priority Issues
P0: Ban fires on tap with no confirmation — onBanUser calls API immediately, Alert is post-facto
P1: Green on Unban button violates Status-Only Rule
P1: Dashboard monster card — six unrelated zones in one styles.card
P1: Three equal-weight action buttons including navigation Back
P1: Report list items carry no triage signal (no timestamp, no viewed state)

## Anti-Patterns
12/12 automated patterns confirmed present. 0 false positives.
