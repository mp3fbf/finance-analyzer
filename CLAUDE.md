# finance-analyzer - Next.js Project Guide

**Working Directory:** `/Users/robertocunha/Coding/fInAnce/finance-analyzer/`

This file contains Next.js-specific instructions. For general project information, see `/fInAnce/CLAUDE.md`.

---

## Quick Start

```bash
# Development server (hot reload)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Test API key
npm run test:api
```

---

## Next.js Configuration

- **Version:** 15.5.4
- **Router:** App Router (app/ directory)
- **TypeScript:** Strict mode enabled
- **Tailwind CSS:** v4 (PostCSS plugin via `@tailwindcss/postcss`)
- **React:** 19.1.0

---

## Key Dependencies

### Core Framework
- `next` 15.5.4
- `react` + `react-dom` 19.1.0
- `typescript` ^5

### Database (Client-Side)
- `dexie` ^4.2.0 - IndexedDB wrapper
- `dexie-react-hooks` ^4.2.0 - React hooks for Dexie

### AI & APIs
- `@anthropic-ai/sdk` ^0.65.0 - Claude API client
- Used in server-side route handlers only

### UI Components
- `lucide-react` ^0.544.0 - Icon library
- `next-themes` ^0.4.6 - Dark/light mode
- `date-fns` ^4.1.0 - Date formatting

### shadcn/ui Components (Installed via CLI)
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-select`
- `@radix-ui/react-slot`
- `class-variance-authority` - Component variants
- `clsx` + `tailwind-merge` - Utility classes

---

## shadcn/ui Setup

### Installation
Components are installed via CLI and **copied into** your codebase (not as dependencies):

```bash
npx shadcn@latest add [component-name]
```

### Configuration
- Config file: `components.json`
- Components dir: `components/ui/`
- Theme: Neutral color palette
- Tailwind CSS v4 compatible

### Installed Components
- `button` - Button with variants
- `card` - Card with header/content/description
- `input` - Form input with validation states
- `select` - Dropdown select
- `badge` - Label badges
- `dropdown-menu` - Dropdown menus

### Customization
All components are in `components/ui/` and can be edited directly.

---

## Tailwind CSS v4 Notes

### Key Differences from v3
- No `tailwind.config.js` - configuration moved to CSS
- Uses `@theme inline` in `app/globals.css`
- CSS variables defined in `:root` and `.dark`
- PostCSS plugin: `@tailwindcss/postcss`

### Theme Variables
Located in `app/globals.css`:

```css
@theme inline {
  --color-primary: oklch(...);
  --color-background: var(--background);
  /* etc */
}

:root {
  --background: oklch(1 0 0);  /* Light mode */
}

.dark {
  --background: oklch(0.145 0 0);  /* Dark mode */
}
```

### Dark Mode
- Uses `class` strategy via `next-themes`
- Toggle component: `components/ui/theme-toggle.tsx`
- All components support dark: prefix

---

## Directory Structure

```text
finance-analyzer/
├── app/                        # Next.js App Router
│   ├── layout.tsx             # Root layout (ThemeProvider)
│   ├── page.tsx               # Dashboard (/)
│   ├── upload/                # Upload page
│   ├── debug/                 # Debug utilities
│   ├── api/                   # API routes (server-side)
│   │   └── extract/           # PDF extraction endpoint
│   └── globals.css            # Global styles + Tailwind theme
│
├── components/                # React components
│   ├── ui/                    # shadcn/ui components
│   ├── Dashboard/             # Dashboard-specific
│   ├── Upload/                # Upload-specific
│   └── theme-provider.tsx     # next-themes wrapper
│
├── lib/                       # Utilities & logic
│   ├── db/                    # Dexie.js (IndexedDB)
│   │   ├── schema.ts          # Database schema
│   │   ├── operations.ts      # CRUD functions
│   │   └── hooks.ts           # React hooks (useTransactions, etc)
│   ├── ai/                    # AI logic
│   │   ├── claude.ts          # Claude API client
│   │   └── extraction.ts      # PDF extraction
│   ├── analysis/              # Future: insights, patterns
│   └── utils/                 # Helpers
│       ├── cn.ts              # clsx + twMerge
│       └── formatting.ts      # Currency, date formatters
│
├── types/                     # TypeScript definitions
│   ├── transaction.ts
│   ├── merchant.ts
│   ├── category.ts
│   ├── insight.ts
│   └── chat.ts
│
├── .env.local                 # Environment variables (gitignored)
├── .env.example               # Template for .env.local
└── components.json            # shadcn/ui config
```

---

## Environment Variables

Create `.env.local` with:

```bash
# Required: Claude API key
ANTHROPIC_API_KEY=sk-ant-...

# Optional: File upload limit (default 10MB)
NEXT_PUBLIC_MAX_FILE_SIZE=10485760
```

**Important:** [.env.local](.env.local) is gitignored. Never commit API keys.

---

## Important Patterns

### 1. Client vs Server Components

**Client Components** (use `'use client'` directive):
- Components using hooks (useState, useEffect, etc)
- Components using IndexedDB (useLiveQuery)
- Event handlers (onClick, onChange)

**Server Components** (default):
- Static content
- API route handlers (app/api/)
- Server-side data fetching

### 2. IndexedDB with Dexie.js

```tsx
// Use hooks in client components
import { useTransactions } from '@/lib/db/hooks';

function MyComponent() {
  const transactions = useTransactions(); // Live query!

  if (!transactions) return <Loading />;  // undefined while loading
  return <div>{transactions.length}</div>;
}
```

### 3. API Route Handlers (Server-Only Code)

All Claude API calls happen in route handlers (server-only code, not Server Components):

```ts
// app/api/extract/route.ts
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: Request) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // ... use API here
}
```

### 4. Formatting Utilities

```ts
import { formatCurrency, formatDate } from '@/lib/utils/formatting';

formatCurrency(1234.56);  // "R$ 1.234,56"
formatDate(new Date());   // "25/11/2025"
```

### 5. Theme Toggle

```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle';

<ThemeToggle />  // Dropdown: Light/Dark/System
```

---

## Common Tasks

### Add a shadcn/ui Component

```bash
npx shadcn@latest add [component-name]
```

Component will be added to `components/ui/`.

### Create a New Page

```bash
# Create app/my-page/page.tsx
mkdir -p app/my-page
touch app/my-page/page.tsx
```

### Add a Database Table

1. Define type in [types/](types/)
2. Add table to [lib/db/schema.ts](lib/db/schema.ts)
3. Add CRUD operations in [lib/db/operations.ts](lib/db/operations.ts)
4. Create hook in [lib/db/hooks.ts](lib/db/hooks.ts)

### Run Type Check

```bash
npm run build  # Includes TypeScript validation
```

---

## Troubleshooting

### Build Errors

```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### IndexedDB Issues

Debug page available at [/debug](http://localhost:3000/debug):
- View all database contents
- Export JSON
- Clear database

### Theme Not Working

Check:
1. ThemeProvider wraps app in [app/layout.tsx](app/layout.tsx)
2. `suppressHydrationWarning` attribute on `<html>` element
3. Dark mode classes in Tailwind config

---

## Best Practices

1. **Always use TypeScript strict mode** - Zero type errors
2. **Use formatting utils** - Don't create inline Intl.NumberFormat
3. **Add JSDoc to exports** - Improve IntelliSense
4. **Apply ref forwarding** - Use React.forwardRef for UI components
5. **Dark mode support** - Add `dark:` variants to all colors

---

## ⚠️ CRITICAL: Design System Guidelines

**NEVER hardcode colors or create manual components. ALWAYS use the design system.**

### ❌ FORBIDDEN - Hardcoded Colors

```tsx
// ❌ WRONG - Hardcoded gray colors
<div className="bg-gray-50 dark:bg-gray-900">
<p className="text-gray-600 dark:text-gray-400">
<div className="border-gray-300">

// ❌ WRONG - Hardcoded blue/red/green
<div className="bg-blue-50 border-blue-200">
<button className="bg-blue-600 hover:bg-blue-700">
<p className="text-red-600">
```

### ✅ REQUIRED - Design System Tokens

```tsx
// ✅ CORRECT - Use theme tokens
<div className="bg-background">           // Background color
<div className="bg-card">                 // Card background
<p className="text-foreground">          // Primary text
<p className="text-muted-foreground">    // Secondary text
<div className="border-border">          // Borders
<div className="bg-muted">               // Muted background
<div className="bg-primary">             // Primary color
```

### ❌ FORBIDDEN - Manual Components

```tsx
// ❌ WRONG - Manual card with hardcoded styles
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  <h3 className="text-lg font-semibold">Title</h3>
</div>

// ❌ WRONG - Manual button
<button className="px-4 py-2 bg-blue-600 text-white rounded">
  Click me
</button>

// ❌ WRONG - Manual input
<input className="w-full px-4 py-2 border border-gray-300 rounded" />
```

### ✅ REQUIRED - shadcn/ui Components

```tsx
// ✅ CORRECT - Use Card component
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>

// ✅ CORRECT - Use Button component
import { Button } from '@/components/ui/button';

<Button variant="default">Click me</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>

// ✅ CORRECT - Use Input component
import { Input } from '@/components/ui/input';

<Input type="text" placeholder="Enter text" />
```

### Color Tokens Reference

| Purpose | Class | Usage |
|---------|-------|-------|
| **Backgrounds** | `bg-background` | Page background |
| | `bg-card` | Card/container background |
| | `bg-muted` | Subtle background (highlights, etc) |
| | `bg-primary` | Primary color (buttons, accents) |
| **Text** | `text-foreground` | Primary text color |
| | `text-muted-foreground` | Secondary/description text |
| | `text-primary` | Primary accent text |
| **Borders** | `border-border` | Default borders |
| | `border-input` | Input borders |
| **Semantic Colors** | `text-red-600 dark:text-red-400` | Expenses/errors (only for data) |
| | `text-green-600 dark:text-green-400` | Income/success (only for data) |

### Component Imports

Always import from `@/components/ui/`:

```tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

### Icon Library

Use Lucide React for icons:

```tsx
import { Upload, Check, X, Pencil, Trash2, Download } from 'lucide-react';

<Button>
  <Upload className="w-4 h-4 mr-2" />
  Upload File
</Button>
```

### CRITICAL: Pre-Implementation Checklist

Before writing ANY new page or component:

- [ ] Will I use `bg-background` for page background?
- [ ] Will I use `<Card>` instead of manual divs?
- [ ] Will I use `<Button>` instead of `<button>`?
- [ ] Will I use `text-foreground` and `text-muted-foreground` for text?
- [ ] Will I avoid ANY `gray-*`, `blue-*` color classes (except semantic red/green for data)?
- [ ] Will I import icons from `lucide-react`?

**If you answered NO to any question, STOP and revise your approach.**

---

For project architecture and philosophy, see [/fInAnce/CLAUDE.md](../CLAUDE.md).
