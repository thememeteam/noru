= Sprint Meeting Minutes (Developer)

Sprint window: Feb 9–Feb 21, 2026  \
Implementation stream: Expo, Convex, Convex Auth, Entra login, onboarding, and ride board.

== Meeting 1 — Feb 9, 2026
- Scope interpretation: Enforce auth and onboarding gate before ride features.
- Plan: Build sign-in, mandatory photo capture, upload, and completion state.
- Risk: Mobile OAuth/PKCE and media upload path stability.
- Action: Implement vertical slices for faster validation.

== Meeting 2 — Feb 11, 2026
- Engineering decision: Standardize on Convex Auth with Entra provider.
- Engineering decision: Use secure token storage on device.
- Backend work: Add onboarding schema/functions and auth wiring.
- Tooling: Use Bun-based package flow and Convex codegen.
- Action: Keep native path primary and remove web-specific branches.

== Meeting 3 — Feb 13, 2026
- Progress: Sign-in and onboarding flow integrated end-to-end.
- Progress: Camera capture and storage upload connected.
- Issue: Callback reliability still inconsistent in some runs.
- Action: Tighten verifier lifecycle and callback handling.

== Meeting 4 — Feb 16, 2026
- Blocker: PKCE mismatch during Entra sign-in.
- Fix direction: Improve auth-session sequencing and verifier reset behavior.
- Blocker: Upload instability in URI/base64 conversion path.
- Fix direction: Switch to binary file upload path.
- Outcome: Onboarding reliability improved on target device path.

== Meeting 5 — Feb 19, 2026
- Feature build: Implement create/list/join/stop ride lifecycle.
- Feature build: Add host waiting room with joinee names.
- UX build: Separate host and pick/join flows.
- UX build: Keep pick screen default with host entry action.
- Action: Add profile avatar and sign-out placement polish.

== Meeting 6 — Feb 21, 2026
- Refactor: Move to Expo Router and native header back behavior.
- Refactor: Modularize into src/app, src/features, and src/components.
- Host updates: Add quick destination `College` and source/destination swap.
- Documentation: Deliver use case and sequence diagrams, including high-level user flow.
- Debt: Add targeted tests for auth and onboarding transitions.
