# shadcn/ui Component Library Setup

This document describes the shadcn/ui component library setup for VaxTrace Nigeria.

## Overview

shadcn/ui is a collection of re-usable components built using Radix UI and Tailwind CSS. The components are copied directly into your project, giving you full control over the code.

## Installation

The shadcn/ui library is already configured in the project. The following dependencies are installed:

```json
{
  "@radix-ui/react-alert-dialog": "^1.0.5",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-label": "^2.0.2",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-separator": "^1.0.3",
  "@radix-ui/react-slot": "^1.0.2",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-toast": "^1.1.5",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.0",
  "tailwindcss-animate": "^1.0.7"
}
```

## Configuration

### components.json

The `components.json` file configures shadcn/ui for the project:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Tailwind Config

The Tailwind config includes the shadcn/ui CSS variables:

```typescript
theme: {
  extend: {
    colors: {
      background: 'hsl(var(--background))',
      foreground: 'hsl(var(--foreground))',
      card: {
        DEFAULT: 'hsl(var(--card))',
        foreground: 'hsl(var(--card-foreground))',
      },
      // ... more color variables
    },
    borderRadius: {
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },
  },
}
```

## Available Components

The following shadcn/ui components are available in the project:

### Form Components

- **Button** - Button with multiple variants (default, destructive, outline, secondary, ghost, link)
- **Input** - Text input field
- **Label** - Form label component
- **Textarea** - Multi-line text input
- **Select** - Dropdown select component

### Data Display Components

- **Card** - Card container with header, content, and footer
- **Badge** - Badge component with multiple variants (default, secondary, destructive, outline, success, warning, info)
- **Table** - Table components (Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption)

## Usage

### Importing Components

You can import components from the UI index:

```typescript
import { Button, Card, Input } from '@/components/ui';
```

Or import directly from the component file:

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

### Button Example

```typescript
import { Button } from '@/components/ui';

function MyComponent() {
  return (
    <div>
      <Button variant="default">Default Button</Button>
      <Button variant="outline">Outline Button</Button>
      <Button variant="ghost">Ghost Button</Button>
      <Button size="sm">Small Button</Button>
      <Button size="lg">Large Button</Button>
    </div>
  );
}
```

### Card Example

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';

function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card content goes here</p>
      </CardContent>
    </Card>
  );
}
```

### Input Example

```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function MyComponent() {
  return (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="Enter your email" />
    </div>
  );
}
```

### Badge Example

```typescript
import { Badge } from '@/components/ui/badge';

function MyComponent() {
  return (
    <div>
      <Badge variant="default">Default</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="destructive">Error</Badge>
    </div>
  );
}
```

### Table Example

```typescript
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';

function MyComponent() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Item 1</TableCell>
          <TableCell>Active</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}
```

## Adding New Components

To add new shadcn/ui components to the project:

1. Use the shadcn-ui CLI:
   ```bash
   npx shadcn-ui@latest add [component-name]
   ```

2. Or manually copy the component from the [shadcn/ui repository](https://github.com/shadcn-ui/ui)

## Customization

### Theme Colors

The theme colors are defined in `src/app/globals.css` using CSS variables:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  /* ... more variables */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... more variables */
}
```

### Component Variants

Components use `class-variance-authority` (CVA) for variant management. You can customize variants in each component file:

```typescript
const buttonVariants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'variant-classes',
        // ... more variants
      },
    },
  }
);
```

## Accessibility

All shadcn/ui components follow WCAG 2.1 AA accessibility standards:

- Proper ARIA labels
- Keyboard navigation support
- Screen reader support
- Focus management

## Best Practices

1. **Use Semantic HTML**: Components use proper semantic HTML elements
2. **Keyboard Navigation**: All interactive components are keyboard accessible
3. **Focus Management**: Components handle focus states properly
4. **Responsive Design**: Components work on all screen sizes
5. **Dark Mode**: Components support dark mode out of the box

## Resources

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
