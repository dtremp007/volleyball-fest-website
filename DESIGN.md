---
name: Volleyball Fest
description: A clear, energetic league management interface for local volleyball operations.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.141 0.005 285.823)"
  card: "oklch(1 0 0)"
  card-foreground: "oklch(0.141 0.005 285.823)"
  primary: "oklch(0.21 0.006 285.885)"
  primary-foreground: "oklch(0.985 0 0)"
  secondary: "oklch(0.967 0.001 286.375)"
  secondary-foreground: "oklch(0.21 0.006 285.885)"
  muted: "oklch(0.967 0.001 286.375)"
  muted-foreground: "oklch(0.552 0.016 285.938)"
  border: "oklch(0.92 0.004 286.32)"
  ring: "oklch(0.705 0.015 286.067)"
  destructive: "oklch(0.577 0.245 27.325)"
  volleyball-red: "#C20A12"
  table-muted-label: "#666666"
typography:
  display:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "3.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0"
  headline:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  title:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0"
  body:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Volleyball Fest

## 1. Overview

**Creative North Star: "The Game-Night Ledger"**

Volleyball Fest should feel like a well-run game night: lively at the entrance, calm at the table where scores, schedules, and rosters are managed. The current system is a restrained product interface built on shadcn-style primitives, with energy reserved for public hero moments, team marks, and schedule-builder category cues.

The product must stay direct. Admins are often doing repeated work before or during league operations, so the system uses familiar controls, compact rows, clear focus rings, sticky navigation, and table-first density. Public pages can feel more athletic, but they should still answer practical questions before they decorate.

It explicitly rejects the PRODUCT.md anti-references: generic SaaS dashboards, overhyped pro-sports branding, cluttered tournament sheets, and decorative effects that slow down admin work.

**Key Characteristics:**

- Restrained neutral product shell with one hard-working primary voice.
- Sport energy appears in public hero treatment, logo use, and category/status accents.
- Dense tables and schedule blocks are allowed when they make league operations faster.
- Motion is state feedback, not page choreography.
- Spanish public surfaces and English admin surfaces remain visually connected but linguistically separate.

## 2. Colors

The palette is a cool-tinted neutral product system with a small red brand spark and semantic color only where it helps scanning.

### Primary

- **Ink Court**: The primary action and active-navigation color. Use for primary buttons, selected season tabs, important foreground emphasis, and form selection states.
- **Volley Red**: The brand spark used sparingly on public hero text, logo-adjacent moments, and high-recognition accents. It should never become the default admin chrome.

### Secondary

- **Quiet Warmup**: The secondary and muted surface used for badges, table group rows, hover states, and low-emphasis panels.
- **Boundary Line**: The border and divider color. It keeps dense tables and forms structured without heavy boxing.

### Tertiary

- **Category Set**: Amber, emerald, sky, violet, rose, and cyan tints appear in the schedule builder to distinguish divisions or categories. These are functional colors for comparison and drag-and-drop scanning, not decorative page themes.

### Neutral

- **Paper Court**: The main background and card surface.
- **Score Ink**: The primary readable foreground.
- **Timeout Text**: Secondary text for descriptions, metadata, table rank labels, placeholders, and captions.
- **Focus Ring**: The accessible focus color. Keep it visible and consistent across buttons, fields, menu links, and drag targets.

### Named Rules

**The Red Spark Rule.** Volley Red is an identity cue, not the admin system color. Use it for brand moments and explicit destructive or alerting contexts only when the meaning is clear.

**The Category Color Rule.** Category color is earned by comparison: schedule blocks, standings distinctions, or filters. Do not tint unrelated cards just to make a page colorful.

## 3. Typography

**Display Font:** System UI stack with platform-native fallbacks.
**Body Font:** System UI stack with platform-native fallbacks.
**Label/Mono Font:** No separate mono or display face is currently established.

**Character:** The typography is native, compact, and operational. It supports quick scanning in tables and forms while allowing the public hero to scale up with weight rather than a separate decorative typeface.

### Hierarchy

- **Display** (700, 3.75rem to 6rem on public hero, 1 line): Reserved for the landing hero and major public brand moments.
- **Headline** (700, 2.25rem, 1.15): Public section titles and major admin page headings.
- **Title** (600, 1.25rem, 1.35): Card titles, table section headings, drawer headings, and workflow labels.
- **Body** (400, 1rem, 1.5): Default reading text. Keep prose to 65-75ch.
- **Label** (500, 0.875rem, 1.25): Buttons, table headers, field labels, badges, tabs, and compact metadata.

### Named Rules

**The Native Workbench Rule.** Use the system sans for product UI. Do not introduce display fonts into admin labels, buttons, data, or form controls.

**The Hero Exception Rule.** Public hero type can be big and bold, but it must stay solid, readable, and direct. No gradient text.

## 4. Elevation

The system is flat by default and uses tonal layering, borders, and light shadows for structure. Cards have a small resting shadow, outline buttons use a tiny shadow, and draggable schedule blocks gain modest lift on hover. Depth should clarify interaction, especially draggable or focused elements.

### Shadow Vocabulary

- **Resting Card** (`shadow-sm`): Low card separation on admin surfaces and framed content.
- **Tiny Control** (`shadow-xs`): Outline buttons and inputs where a subtle edge helps the control read as interactive.
- **Drag Lift** (`hover:shadow-md`): Schedule builder matchup blocks on hover and drag affordance.
- **Header Shelf** (`shadow-md`): Public header separation on light surfaces.

### Named Rules

**The Flat Until Touched Rule.** Surfaces are flat or barely raised at rest. Stronger shadow appears only for hover, drag, focus, or sticky navigation separation.

## 5. Components

### Buttons

- **Shape:** Gently curved rectangles (8px radius), with icon-aware spacing and stable heights.
- **Primary:** Ink Court background with primary foreground text. Default height is 36px, large height is 40px, icon buttons are square.
- **Hover / Focus:** Primary buttons darken slightly on hover. Focus uses a visible 3px ring tied to the ring token.
- **Secondary / Ghost / Outline:** Secondary uses Quiet Warmup. Outline uses the page background, border, and tiny control shadow. Ghost is backgroundless until hover.

### Chips

- **Style:** Badges are compact pills with 9999px radius, 12px type, medium weight, and small icon gaps.
- **State:** Use default badges for high emphasis, secondary badges for labels and section markers, destructive badges only for real destructive or error states.

### Cards / Containers

- **Corner Style:** Soft product containers (14px radius from the `rounded-xl` token).
- **Background:** Paper Court or the card token.
- **Shadow Strategy:** Resting Card only. Avoid stacking cards inside cards.
- **Border:** One-pixel Boundary Line border.
- **Internal Padding:** 24px default, with 24px horizontal header and content padding.

### Inputs / Fields

- **Style:** 36px height, 8px radius, one-pixel Boundary Line border, transparent or input-tinted background, 12px horizontal padding.
- **Focus:** Border shifts to Focus Ring with a visible 3px ring.
- **Error / Disabled:** Invalid fields use destructive border and ring. Disabled fields reduce opacity and remove pointer interaction.

### Navigation

- **Style:** The global header is 64px high and sticky. It uses the background and foreground tokens with logo anchoring on the left and compact text links.
- **Active State:** Public nav links become bold. Season-scoped horizontal tabs use primary text and a 2px bottom border for the active route.
- **Mobile Treatment:** The mobile global nav expands to full viewport height and reveals items with staggered opacity and translate transitions. Use this pattern sparingly and only for navigation state.

### Tables

- **Style:** Tables are compact, horizontally scrollable, and optimized for scanning. Header cells are 40px high with medium label weight.
- **Rows:** Rows use one-pixel separators and a muted hover fill. Group rows can use muted backgrounds and uppercase labels.
- **Data Emphasis:** Use weight for rank, score, and standings points. Use green/red semantic text only for wins/losses and similar familiar meanings.

### Schedule Blocks

- **Style:** Matchup blocks are tactile drag targets with 8px radius, 2px category-colored borders, soft category tint, and compact team names.
- **Behavior:** Hover adds Drag Lift. Warning icons appear inline for conflicts and unavailable dates. Drag handles should remain visible and low-emphasis.

## 6. Do's and Don'ts

### Do:

- **Do** make the current season context obvious in admin navigation, breadcrumbs, headings, and workflow tabs.
- **Do** use Ink Court for primary actions, active tabs, and selected states.
- **Do** keep public pages in Spanish and admin pages in English.
- **Do** use tables, tabs, and dense controls when they make league operations faster.
- **Do** keep focus rings visible on every keyboard-reachable control.
- **Do** use category tints only for meaningful comparison, such as schedule-builder blocks or filters.

### Don't:

- **Don't** create generic SaaS dashboards that could belong to any company.
- **Don't** use overhyped pro-sports branding, aggressive stadium graphics, or visual noise that makes a recreational league feel inflated.
- **Don't** mimic cluttered tournament sheets or dense spreadsheet artifacts without improving readability.
- **Don't** add decorative effects that slow down admin work.
- **Don't** use gradient text, glassmorphism as a default, or side-stripe borders greater than 1px.
- **Don't** make Volley Red the default admin surface color.
- **Don't** rely on color alone for match conflicts, errors, standings changes, or schedule status.
