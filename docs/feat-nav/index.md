# Season-Scoped Dashboard Navigation

## Branch intention

This branch makes the authenticated dashboard navigation season-scoped and
consistent.

The core product idea is that a season should behave like an organization or
workspace. Once an admin enters the dashboard, they are operating inside one
explicit season context. Top-level admin pages that read or mutate league data
should therefore live under the season route, so database queries always know
which season they are for.

For now, the public navbar can keep linking authenticated users to the current
season overview with the existing hardcoded route:

```tsx
...(session?.user
  ? [
      {
        label: "Dashboard",
        to: "/seasons/season-2026-spring",
      },
    ]
  : []),
]}
```

That can be improved later when the active season is resolved dynamically.

## Target navigation model

The dashboard entry point should land on the overview page for the current
season:

```txt
/seasons/$seasonId
```

The authenticated dashboard pages that belong to season operations should move
under the season id route:

```txt
/seasons/$seasonId              Season overview
/seasons/$seasonId/teams        Teams for this season
/seasons/$seasonId/scorecard    Score entry for this season
/seasons/$seasonId/build        Schedule builder
/seasons/$seasonId/playoffs     Playoffs
```

Existing workflow routes that already live under the season should remain
season-scoped:

```txt
/seasons/$seasonId/configure
/seasons/$seasonId/generate
/seasons/$seasonId/playoffs/build
```

This lets route loaders, tRPC procedures, and query functions receive
`seasonId` from route params instead of relying on hardcoded values or implicit
global state.

## Authenticated layout

The current authenticated layout lives in:

```txt
src/routes/(authenticated)/route.tsx
```

It currently renders the horizontal menu globally for every authenticated page
with links like:

```txt
/teams
/scorecard
/seasons
/settings
```

The target shape is for the season dashboard area to render:

1. A breadcrumb row above the season navigation.
2. A horizontal season menu below the breadcrumb.
3. The route outlet below both.

The horizontal menu should include the top-level season pages:

```txt
Overview
Teams
Scorecard
Schedule Builder
Playoffs
```

Settings and the season list are not season operations in the same way. They
can either stay outside the season-scoped menu or be linked elsewhere in the
admin shell.

## Layout alignment

The season dashboard navigation should use the same horizontal container width
and page alignment as the main navbar.

The existing horizontal menu component is:

```txt
src/components/horizontal-menu.tsx
```

It currently applies its own `px-4` inside the menu. The implementation should
align this with the app's main navbar/content container so the breadcrumb,
season tabs, and page content share the same left edge.

## Breadcrumbs

Use the existing shadcn breadcrumb primitives:

```txt
src/components/ui/breadcrumb.tsx
```

TanStack Router supports route-derived breadcrumbs through matched routes and
route context/static route data. The implementation should prefer route-owned
breadcrumb metadata instead of manually hardcoding every breadcrumb in the
layout.

Useful TanStack Router docs:

- [Router Context](https://tanstack.com/router/latest/docs/framework/react/guide/router-context)
- [Static Route Data](https://tanstack.com/router/latest/docs/framework/react/guide/static-route-data)

The likely shape is:

1. Each route that should appear in breadcrumbs declares a breadcrumb label or
   function in route metadata.
2. The authenticated or season layout reads the current route matches.
3. The layout renders matching breadcrumb entries with the shadcn breadcrumb
   components.
4. Dynamic labels can use loader data when needed, for example a season name.

Example breadcrumb intent:

```txt
Spring 2026 / Schedule Builder
Spring 2026 / Teams
Spring 2026 / Playoffs
```

## Route migration notes

### Teams

Current route:

```txt
src/routes/(authenticated)/teams/index.tsx
```

Target route:

```txt
src/routes/(authenticated)/seasons/$seasonId/teams.tsx
```

The teams page should fetch teams for `params.seasonId`.

### Scorecard

Current route:

```txt
src/routes/(authenticated)/scorecard.tsx
```

Target route:

```txt
src/routes/(authenticated)/seasons/$seasonId/scorecard.tsx
```

The current scorecard loader still hardcodes:

```txt
season-2026-spring
```

That should be replaced with `params.seasonId`.

### Schedule Builder

Current route already exists:

```txt
src/routes/(authenticated)/seasons/$seasonId/build.tsx
```

The new horizontal menu should link directly to this route.

### Playoffs

Current route already exists:

```txt
src/routes/(authenticated)/seasons/$seasonId/playoffs.tsx
```

The new horizontal menu should link directly to this route.

The playoff schedule builder currently uses:

```txt
src/routes/(authenticated)/seasons/$seasonId/playoffs_.build.tsx
```

Keep that route as a deeper playoff workflow route unless we decide to rename
it separately.

## Compatibility and redirects

During migration, old admin routes can redirect to their season-scoped
equivalents once the app can determine the current season:

```txt
/dashboard  -> /seasons/$seasonId
/teams      -> /seasons/$seasonId/teams
/scorecard  -> /seasons/$seasonId/scorecard
```

Until active-season lookup is implemented, redirects can use the same
`season-2026-spring` assumption as the navbar.

## Open decisions

1. Should `/dashboard` remain as an alias that redirects to the active season
   overview, or should it be removed from normal navigation entirely?
   Answer: Remove
2. Should `/seasons` remain visible in the authenticated shell as a separate
   admin management page, outside the season-scoped menu?
   Answer: Keep it, but don't link to it
3. Should the Teams migration move the existing route outright, or keep
   `/teams` temporarily as a compatibility redirect?
   Answer: Move it
4. Should breadcrumb labels show the season display name from loader data, or
   is the season id acceptable until season naming is finalized?
   Answer: We can probably use the season id until naming is finalized.

## First implementation slice

1. Add a season dashboard layout under `/seasons/$seasonId` that owns the
   breadcrumb row and season menu.
2. Move Teams and Scorecard into season-scoped routes.
3. Replace hardcoded season ids in those pages with route params.
4. No need to add redirects from old routes.
5. Align the breadcrumb and horizontal menu container with the main navbar and
   content.
6. Run `pnpm check`.
