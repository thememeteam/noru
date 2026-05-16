---
target: host ride page
total_score: 19
p0_count: 2
p1_count: 2
timestamp: 2026-05-16T09-38-15Z
slug: src-features-rides-hostridescreen-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No validation feedback inline; "Posting..." text only on button |
| 2 | Match System / Real World | 3 | Peer-focused copy good; "Auto" vs "Own Car" unclear to new users |
| 3 | User Control and Freedom | 3 | Swap button helps; no draft saving, no undo after redirect |
| 4 | Consistency and Standards | 3 | Input styling consistent; DateTimePicker diverges iOS/Android |
| 5 | Error Prevention | 1 | No fare bounds, no inline validation, no duplicate route detection |
| 6 | Recognition Rather Than Recall | 2 | Field labels visible; placeholder assumes local pricing knowledge |
| 7 | Flexibility and Efficiency | 2 | No saved preferences, no draft mode, no quick-select time presets |
| 8 | Aesthetic and Minimalist Design | 3 | Dark theme clean; 8 simultaneous fields create cognitive load |
| 9 | Error Recovery | 0 | Form data cleared even on API error (unconditional resetForm) |
| 10 | Help and Documentation | 0 | No tooltips; women-only and quiet ride unexplained |
| **Total** | | **19/40** | **Needs Work** |

## Anti-Patterns Verdict

LLM: Mostly clean. Dark theme and peer-focused copy avoid generic SaaS register. Two tells: label-above-input form convention reads as template applied, vehicle chips use blue-border-only selection (near side-stripe). No gradient text, glassmorphism, or hero metrics.

Automated: `impeccable detect --json` returned zero findings on HostRideScreen.tsx and styles.ts. Exit 0, both files.

## Priority Issues

**[P0] Form state destroyed on error:** Lines 116-123 reset all fields unconditionally. API failure = user loses everything.

**[P0] No inline validation:** Zero feedback before submit. Can post ₹0 fare, empty locations, impossible seat counts.

**[P1] Women-only toggle disappears silently:** Gender-gated checkbox vanishes on vehicle switch. Reads as a bug, causes confusion.

**[P1] No review step before posting:** High-stakes action with no confirmation. User redirected to /waiting with no receipt.

**[P2] Time picker lacks quick-select presets:** Spin-through-modal to set a time 15 minutes away is wrong for the 7:45 AM use case.

## Persona Red Flags

**Priya (First-time driver):** Sees 8 fields at once, no guidance, doesn't know "Auto" vs "Own Car," women-only vanishes unexpectedly, no feedback after posting. Risks under-pricing or abandoning form.

**Rahul (Daily driver):** Must re-enter everything every time, hits network error and loses all state, time picker bottleneck for 8 AM rides. Drops to WhatsApp instead.
