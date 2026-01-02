# Navbar Components (React/Next.js)

This folder contains the React/Next.js version of the navbar components, converted from the original Svelte implementation. The components maintain the same functionality and styling as the original.

## Components

- **Navbar**: Main navigation container with menu state management
- **NavHeader**: Header wrapper for mobile navigation
- **Logo**: Company logo component
- **Hamburger**: Animated hamburger menu button
- **NavItem**: Individual navigation menu item
- **NavList**: Navigation menu list container

## Usage Example

```jsx
import Link from 'next/link';
import {
  Navbar,
  NavHeader,
  Logo,
  Hamburger,
  NavItem,
  NavList
} from '@/lib/components/navbar';

export default function Navigation() {
  return (
    <Navbar>
      <NavHeader>
        <div className="flex items-center justify-between px-4 py-4">
          <Logo />
          <Hamburger />
        </div>
      </NavHeader>

      <div className="hidden md:flex md:items-center md:justify-between md:px-8 h-full">
        <Logo />
        <NavList>
          <NavItem>
            <Link href="/" className="text-gray-700 hover:text-gray-900">
              Home
            </Link>
          </NavItem>
          <NavItem>
            <Link href="/about" className="text-gray-700 hover:text-gray-900">
              About
            </Link>
          </NavItem>
          <NavItem>
            <Link href="/casas-prefabricadas" className="text-gray-700 hover:text-gray-900">
              Casas Prefabricadas
            </Link>
          </NavItem>
          <NavItem>
            <Link href="/contact" className="text-gray-700 hover:text-gray-900">
              Contact
            </Link>
          </NavItem>
        </NavList>
      </div>

      {/* Mobile menu */}
      <div className="md:hidden">
        <NavList>
          <NavItem>
            <Link href="/" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
              Home
            </Link>
          </NavItem>
          <NavItem>
            <Link href="/about" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
              About
            </Link>
          </NavItem>
          <NavItem>
            <Link href="/casas-prefabricadas" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
              Casas Prefabricadas
            </Link>
          </NavItem>
          <NavItem>
            <Link href="/contact" className="block px-4 py-2 text-gray-700 hover:bg-gray-100">
              Contact
            </Link>
          </NavItem>
        </NavList>
      </div>
    </Navbar>
  );
}
```

## Component Props

### Navbar
- `className`: Additional CSS classes
- `children`: Child components

### NavHeader
- `children`: Child components

### Logo
- No props (uses predefined logo from assets)

### Hamburger
- `className`: Additional CSS classes
- `styles`: Object with custom style properties:
  - `background`: Background color
  - `backgroundChecked`: Background color when menu is open
  - `color`: Hamburger line color
  - `colorChecked`: Hamburger line color when menu is open

### NavItem
- `className`: Additional CSS classes
- `children`: Child components

### NavList
- `className`: Additional CSS classes
- `children`: Child components

## Features

- **Responsive Design**: Mobile-first approach with hamburger menu
- **Smooth Animations**: CSS transitions for menu open/close
- **Accessible**: Proper ARIA labels and keyboard navigation
- **Customizable**: Style props for theming
- **Next.js Integration**: Uses Next.js navigation hooks for route changes

## Key Differences from Svelte Version

1. **State Management**: Uses React hooks (`useRef`, `useEffect`) instead of Svelte stores
2. **Navigation**: Uses Next.js `usePathname` instead of SvelteKit `afterNavigate`
3. **Image Handling**: Uses Next.js `Image` component for optimized images
4. **Props**: Uses React prop destructuring instead of Svelte `$$props`
5. **Client Component**: Marked as `'use client'` for Next.js App Router compatibility

## Dependencies

- `react`
- `next`
- `clsx`
- `tailwind-merge`

## CSS

The CSS files are identical to the original Svelte version and use CSS custom properties for theming. The animations are handled purely through CSS transitions and transforms.
