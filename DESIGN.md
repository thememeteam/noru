---
name: Noru
description: Peer ride-sharing for verified university students
colors:
  cobalt-action: "#1E6CCC"
  cobalt-surface: "#1764C6"
  cobalt-low: "#1F3654"
  cobalt-ring: "#60A5FA"
  cobalt-tint: "#DBEAFE"
  campus-night: "#2E2E2E"
  elevated-slate: "#32353B"
  recessed-slate: "#2A2D33"
  midnight: "#0F172A"
  near-white: "#F8FAFC"
  cool-mist: "#C7CDD9"
  slate-mist: "#9CA3AF"
  slate-border: "#4B5563"
  mid-border: "#5B6371"
  grove-dark: "#052E16"
  grove-light: "#86EFAC"
  ember-dark: "#3F1D1D"
  ember-light: "#FCA5A5"
  cloud-base: "#F4F6FB"
typography:
  display:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-1.2px"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.12
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  pill: "999px"
  lg: "16px"
  md: "12px"
  sm: "10px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt-action}"
    textColor: "{colors.near-white}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "46px"
  button-primary-pressed:
    backgroundColor: "{colors.cobalt-action}"
    textColor: "{colors.near-white}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "46px"
  button-secondary:
    backgroundColor: "#3A3F47"
    textColor: "{colors.near-white}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "46px"
  button-danger:
    backgroundColor: "{colors.ember-dark}"
    textColor: "{colors.ember-light}"
    rounded: "{rounded.md}"
    padding: "12px 14px"
    height: "46px"
  chip-default:
    backgroundColor: "{colors.recessed-slate}"
    textColor: "{colors.slate-mist}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  chip-active:
    backgroundColor: "{colors.cobalt-low}"
    textColor: "{colors.cobalt-tint}"
    rounded: "{rounded.pill}"
    padding: "7px 14px"
  card-standard:
    backgroundColor: "{colors.elevated-slate}"
    rounded: "{rounded.lg}"
    padding: "18px"
  card-ride:
    backgroundColor: "{colors.recessed-slate}"
    rounded: "{rounded.md}"
    padding: "12px"
  card-hero:
    backgroundColor: "{colors.cobalt-surface}"
    rounded: "{rounded.md}"
    padding: "14px"
  input:
    backgroundColor: "{colors.recessed-slate}"
    textColor: "#E5E7EB"
    rounded: "{rounded.md}"
    padding: "12px"
---

# Design System: Noru

## 1. Overview

**Creative North Star: "The Campus Shortcut"**

Noru is peer infrastructure, not a dispatch platform. The design system reflects a familiar path worn smooth by daily use: confident without ceremony, readable at a glance, dark because students check this before dawn and between lectures, not under office fluorescents. Every surface exists to get a verified student into a ride faster than any other option.

The system rejects the commercial register entirely. No map-hero layouts. No gig-economy "driver online" status bars. No SaaS-cream dashboards that could belong to any enterprise tool. Trust is expressed through institutional signals, not rating-star theatrics: the university account badge, the face-verified avatar ring, the registration number in the profile overlay. These are facts, not features.

Design serves speed. A student standing at a stop at 7:45 AM does not browse. The primary action (join or host a ride) is always one tap from the home screen. Information density is earned: show what the student needs to decide, and nothing else.

**Key Characteristics:**
- Dark-first: deep charcoal surfaces with a single cobalt blue carrying all action meaning
- Tonal depth: lighter = closer; darker = deeper; no decorative shadow stacks
- Inter Bold / Inter Medium at high weight contrast; size contrast is secondary
- Tactile press states: opacity 0.88, no bounce, no scale, no color shift
- Verified face as UI element: the cobalt avatar ring appears at every scale where trust matters

## 2. Colors: The Cobalt Shortcut Palette

A controlled dark system with one action color. Green and red are reserved for status states only. The palette communicates; it does not decorate.

### Primary

- **Cobalt Action** (`#1E6CCC`): The one action color. Primary buttons, FAB, join/request button, loading indicator. Used only where the student must tap to advance. Its consistency is its credibility.
- **Cobalt Surface** (`#1764C6`): Hero card background fill. The largest block of color on the home screen. Signals the primary context without requiring a header.
- **Cobalt Low** (`#1F3654`): Selected-state tint. Active filter chip background, avatar fallback background, star button active background. Blue at low luminance, not low saturation.

### Secondary

- **Cobalt Ring** (`#60A5FA`): Avatar border rings exclusively. A lighter blue that signals "this face is verified" without competing with action elements. Appears at every avatar size from 28px to 96px.
- **Cobalt Tint** (`#DBEAFE`): Text color on dark blue surfaces: inside hero cards, active chip labels, avatar initials on Cobalt Low backgrounds.

### Tertiary

- **Grove Dark / Grove Light** (`#052E16` / `#86EFAC`): Open ride status and fare display. Green is reserved for availability and price; nowhere else.
- **Ember Dark / Ember Light** (`#3F1D1D` / `#FCA5A5`): Full capacity status and destructive actions. Red is reserved for ride-full and danger; nowhere else.

### Neutral

- **Campus Night** (`#2E2E2E`): Screen background, navigation bar. The foundation.
- **Elevated Slate** (`#32353B`): Standard cards and modal overlays. One step up from the screen.
- **Recessed Slate** (`#2A2D33`): Inputs, ride list items, default filter chips. Visually recessed against standard cards.
- **Midnight** (`#0F172A`): Active ride card, shadow color, overlay scrim base. The deepest surface.
- **Near-White** (`#F8FAFC`): Primary text, button labels, ride routes, screen titles.
- **Cool Mist** (`#C7CDD9`): Greeting text, ride meta (time, vehicle, seats). Secondary prose that does not compete with names and routes.
- **Slate Mist** (`#9CA3AF`): Section labels, placeholders, legal text. Tertiary; orients without foregrounding.
- **Slate Border** (`#4B5563`): Default card and overlay borders. Structural, not decorative.
- **Mid Border** (`#5B6371`): Input borders and fine separators. Slightly warmer than Slate Border.
- **Cloud Base** (`#F4F6FB`): Light theme screen background. Documented for completeness; dark is the primary theme.

### Named Rules

**The Single Voice Rule.** Cobalt blue is the only action color. Every pressable element that moves the student forward uses it. If it is cobalt, it is actionable. If it is actionable, it is cobalt. No secondary accent, no section theming, no notification color. The color IS the trust signal.

**The Status-Only Rule.** Grove (green) exists for open status and fare. Ember (red) exists for full status and danger actions. Both are forbidden in any other context: no green "success" toasts, no red emphasis text, no decorative color usage.

## 3. Typography

**Primary Font:** Inter (Bold and Medium weights, 18pt optical size variant)

**Character:** One family, two weights. The weight jump from Medium (500) to Bold (700) does more work than size steps. Display contexts shout; body contexts whisper. No italic, no thin, no light. The system is legible before it is beautiful.

### Hierarchy

- **Display** (Bold, 42px, lh 1.1, tracking -1.2px): Brand name on the sign-in screen only. One appearance in the entire app.
- **Headline** (Bold, 34-38px, lh 1.12): Personal greeting (first name) on the home screen. One per screen, maximum.
- **Title** (Bold, 30px, lh 1.2): Navigation header titles; screen-level naming.
- **Body Bold** (Bold, 17-18px, lh 1.3): Ride route text, overlay section labels, feed item names. The primary reading unit inside list items.
- **Body** (Medium, 16px, lh 1.5): Button labels, hero card subtitles, form section headers, main reading copy.
- **Label** (Medium, 14-15px, lh 1.4): Ride meta, filter chip text, caption text, secondary prose.
- **Section Marker** (Bold, 14px, letterSpacing 0.6, uppercase): Section dividers in ride lists only. All-caps used here and nowhere else.
- **Micro** (Bold, 12px): Status badges, price pills, avatar sign-out text. Small and functional.

### Named Rules

**The Two-Weight Rule.** InterMedium (500) and InterBold (700) are the only weights in use. SemiBold is loaded but inactive. New work must not introduce it without deliberate justification: the Medium-to-Bold jump is the entire typographic hierarchy.

**The No-Italic Rule.** The exception is the moderation screen: reported text is italicized to distinguish a user's own words from system copy. Italic is forbidden everywhere else.

## 4. Elevation

Noru uses tonal layering as the primary depth mechanism. The surface stack, deepest to highest:

`Midnight (#0F172A)` → `Campus Night (#2E2E2E)` → `Recessed Slate (#2A2D33)` → `Elevated Slate (#32353B)` → `Cobalt Low (#1F3654)` (active/selected state only)

Lighter surfaces are closer to the user. Stacking two surfaces of the same tone is a layout error. Shadows confirm elevation state; they do not create it.

### Shadow Vocabulary

- **Ambient** (offset 0 4px, opacity 0.08, blur 12px, color `#0F172A`): Resting cards on the screen surface. Barely perceptible; confirms they are floating.
- **Lifted** (offset 0 8px, opacity 0.06, blur 16px, color `#0F172A`): Main content scroll cards. Softer opacity; blur carries the weight.
- **FAB** (offset 0 10px, opacity 0.18, blur 14px, color `#0F172A`): Floating action button only. The one intentionally visible shadow in the system; needed to separate the FAB from scrolling content beneath it.
- **Overlay Scrim** (`rgba(15, 23, 42, 0.45)`): Modal backdrop. Deep midnight blue at 45% opacity; no blur.

### Named Rules

**The Tonal-First Rule.** If tonal contrast already expresses the depth relationship between two surfaces, do not add a shadow. Every card does not need both a lighter background and a shadow; pick one.

**The FAB Exception.** The FAB is the only component with an intentionally heavy shadow. It must separate from scroll content. All other surfaces use ambient or none.

## 5. Components

### Buttons

Solid blocks, medium-rounded, weight-only type. Pressed state is opacity-only: no animation, no color shift, no scale. Familiar, like a physical button worn smooth.

- **Shape:** Medium rounded (12px radius) across all variants. Minimum height 46px.
- **Primary:** Cobalt Action (`#1E6CCC`) background, Near-White text, InterBold at 15-16px.
- **Secondary:** Steel dark (`#3A3F47`) background, Mid Border (`#5B6371`) 1px border, Near-White text. Used for cancel and low-emphasis secondary actions.
- **Danger:** Ember Dark (`#3F1D1D`) background, `#7F1D1D` 1px border, Ember Light (`#FCA5A5`) text. Reserved for report and block actions only.
- **Pressed:** Opacity 0.88. The only press feedback. No transforms, no glow.
- **Disabled:** Opacity 0.5. No structural change.

### Filter Chips

Pill-shaped toggles for the ride list filters. State change is the affordance; shape signals toggle.

- **Default:** Recessed Slate background, Mid Border 1px, Slate Mist text (Medium, 14px). Padding: 7px vertical, 14px horizontal.
- **Active:** Cobalt Low background, Cobalt Ring border (1px), Cobalt Tint text. The blue border + blue background read as "selected" without a checkmark.
- Filter sections open with an uppercase section marker at 14px / 0.6 tracking to signal "this area is filterable."

### Ride Cards

The core list unit of the app. Recessed relative to the screen so they read as items, not containers.

- **Corner Style:** Medium rounded (12-14px).
- **Background:** Recessed Slate (`#2A2D33`). One step below standard cards; they belong to the list surface.
- **Border:** Slate Border, 1px.
- **Padding:** 12px uniform.
- **Shadow:** None. Tonal contrast with Campus Night provides sufficient separation.
- **Layout:** Route (Bold 17px, Near-White) at top; meta text (Medium 13px, Cool Mist) below; footer row: avatar + name at left, Request button at right.
- **Price Pill:** Grove Dark (`#052E16`) background, Grove Light (`#86EFAC`) text, 12px Bold, pill shape.
- **Status Badge:** Open = Grove colors; Full = Ember colors. Pill shaped, 12px Bold.

### Standard Cards

Larger content containers: onboarding steps, empty states, moderation context, profile sections.

- **Corner Style:** Large rounded (16px).
- **Background:** Elevated Slate (`#32353B`).
- **Border:** Slate Border, 1px.
- **Padding:** 18px.
- **Shadow:** Ambient.

### Hero Card

The primary action context card on the home screen. The only large cobalt surface in the app.

- **Background:** Cobalt Surface (`#1764C6`). Full blue fill; no gradient.
- **Corner Style:** 14-16px.
- **Title:** Near-White / `#EFF6FF`, Bold, 20-23px.
- **Subtitle:** Cobalt Tint (`#DBEAFE` or `#DCEBFF`), Medium, 14-16px.
- **CTA button within hero:** Light fill (`#E8EFF7`) with Cobalt Surface text. Inverted so it reads on the blue background. Minimum height 42px, medium rounded (10px).

### Inputs / Text Fields

- **Style:** Recessed Slate background, Mid Border 1px, medium rounded (12px).
- **Text:** `#E5E7EB` for input; Slate Mist for placeholder.
- **Padding:** 12px vertical and horizontal.
- **Multiline:** Minimum height 96px for feedback text areas.
- **Focus:** Native cursor behavior on mobile; no custom focus ring in the current system.

### Avatar System (Signature Component)

A system-wide identity component that appears at six sizes. The cobalt ring marks every verified face.

- **Ring:** Cobalt Ring (`#60A5FA`), 1.5-2px border. Present at all sizes. Its presence communicates verification; its absence would be a regression.
- **Sizes:** 28px (list items), 36px (home greeting), 44px (profile widget / header), 52px (home hero row), 72px (profile hero), 96px (overlay detail).
- **Fallback:** Cobalt Low (`#1F3654`) background, Cobalt Tint (`#DBEAFE`) initial in InterBold. Never a silhouette icon.
- **Shape:** Circular (border-radius 50%) at all sizes.

### Floating Action Button

- **Style:** Pill (999px radius), 50px height, minimum width 84px. Cobalt Action background.
- **Position:** Absolute, right 20px, bottom 24px.
- **Shadow:** FAB elevation. The one heavy shadow.
- **Label:** White, InterBold, 16px.

### Stack Navigation Header

- **Background:** Campus Night (`#2E2E2E`). Matches the screen background; no visible seam.
- **Title:** InterBold, weight 600-700, `#F3F4F6`.
- **Tint:** Near-White for back chevron and icon buttons.
- **Shadow line:** Disabled. The header is the same surface as the screen; no divider.

## 6. Do's and Don'ts

### Do:

- **Do** use Cobalt Action (`#1E6CCC`) for every tap target that advances the student: join, host, submit, confirm. One color, one meaning.
- **Do** use the tonal depth stack for elevation: Midnight below, Campus Night as the base, Recessed Slate for list items, Elevated Slate for cards. Lighter = closer; never reverse this.
- **Do** render the avatar ring (`#60A5FA`) at every size where a verified face appears. The ring is the trust signal; omitting it is a design error.
- **Do** use pill chips (999px radius) for filter and toggle controls. Pills signal toggle, not navigation.
- **Do** express pressed state as opacity 0.88 only. No scale, no glow, no color shift.
- **Do** uppercase section markers at 14px / 0.6 tracking for filter zone headers only.
- **Do** restrict green to open status and fare, red to full status and danger actions.

### Don't:

- **Don't** style Noru like Uber or Lyft. No map-hero layouts, no "X minutes away" dispatch copy, no surge indicators, no gig-economy commercial register. This is a peer community, not a ride marketplace.
- **Don't** use SaaS-cream whites (`#FAFAFA`, `#F9FAFB`), teal accents, or hollow grid dashboards. This is a human-scale mobile product, not enterprise software.
- **Don't** introduce a second action color. No orange for notifications, no purple for premium, no rose for the light theme. The Single Voice Rule applies in both dark and light mode: cobalt or nothing.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on any list item or card. Rewrite with a full border, background tint, or no border.
- **Don't** use gradient text (`background-clip: text` with a gradient fill). Emphasis is through weight (InterBold), not shimmer.
- **Don't** use glassmorphism. No `backdrop-filter: blur()` on decorative card surfaces. The overlay scrim uses opacity alone; it does not blur content behind it.
- **Don't** default to a modal. Inline confirmation, contextual alerts, and navigation are almost always correct. Justify each modal independently.
- **Don't** use the hero-metric template (large number, small label, gradient accent) anywhere in the product. The home hero card holds an action CTA, not a metrics dashboard.
- **Don't** add shadows to ride cards or standard cards beyond ambient. Shadow is confirmation; tonal contrast is the depth system.
