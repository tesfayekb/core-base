
# Design System Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Comprehensive design system built on Tailwind CSS and shadcn/ui, providing consistent visual language and interaction patterns across the application.

## Color System

### Primary Color Palette
```css
:root {
  /* Primary Colors */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  --primary-900: #1e3a8a;

  /* Secondary Colors */
  --secondary-50: #f8fafc;
  --secondary-100: #f1f5f9;
  --secondary-500: #64748b;
  --secondary-600: #475569;
  --secondary-700: #334155;
  --secondary-900: #0f172a;

  /* Status Colors */
  --success-500: #10b981;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
  --info-500: #06b6d4;
}
```

### Semantic Color Usage
- **Primary**: Main actions, links, active states
- **Secondary**: Supporting content, borders, backgrounds
- **Success**: Confirmations, completed states
- **Warning**: Cautions, pending states
- **Error**: Errors, destructive actions
- **Info**: Information, neutral notifications

## Typography System

### Font Families
```css
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Type Scale
```css
/* Heading Styles */
.text-h1 { font-size: 2.25rem; line-height: 2.5rem; font-weight: 700; }
.text-h2 { font-size: 1.875rem; line-height: 2.25rem; font-weight: 600; }
.text-h3 { font-size: 1.5rem; line-height: 2rem; font-weight: 600; }
.text-h4 { font-size: 1.25rem; line-height: 1.75rem; font-weight: 500; }

/* Body Styles */
.text-body-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-body { font-size: 1rem; line-height: 1.5rem; }
.text-body-sm { font-size: 0.875rem; line-height: 1.25rem; }

/* Utility Styles */
.text-caption { font-size: 0.75rem; line-height: 1rem; }
.text-overline { font-size: 0.75rem; line-height: 1rem; text-transform: uppercase; }
```

## Spacing System

### Spacing Scale
```css
/* Spacing based on 4px grid */
.space-1 { margin: 0.25rem; } /* 4px */
.space-2 { margin: 0.5rem; }  /* 8px */
.space-3 { margin: 0.75rem; } /* 12px */
.space-4 { margin: 1rem; }    /* 16px */
.space-6 { margin: 1.5rem; }  /* 24px */
.space-8 { margin: 2rem; }    /* 32px */
.space-12 { margin: 3rem; }   /* 48px */
.space-16 { margin: 4rem; }   /* 64px */
```

### Component Spacing
- **Card Padding**: space-6 (24px) for desktop, space-4 (16px) for mobile
- **Section Spacing**: space-12 (48px) between major sections
- **Element Spacing**: space-4 (16px) between related elements
- **Form Spacing**: space-4 (16px) between form fields

## Component Design Tokens

### Button Variants
```typescript
const buttonVariants = {
  default: "bg-primary-600 text-white hover:bg-primary-700",
  secondary: "bg-secondary-100 text-secondary-900 hover:bg-secondary-200",
  outline: "border border-primary-600 text-primary-600 hover:bg-primary-50",
  ghost: "text-primary-600 hover:bg-primary-50",
  destructive: "bg-error-500 text-white hover:bg-error-600"
};

const buttonSizes = {
  sm: "h-8 px-3 text-sm",
  default: "h-10 px-4",
  lg: "h-12 px-6 text-lg"
};
```

### Input Components
```typescript
const inputVariants = {
  default: "border border-secondary-300 focus:border-primary-500 focus:ring-primary-500",
  error: "border-error-500 focus:border-error-500 focus:ring-error-500",
  success: "border-success-500 focus:border-success-500 focus:ring-success-500"
};
```

## Layout System

### Grid System
```css
/* 12-column grid system */
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-12 { grid-template-columns: repeat(12, minmax(0, 1fr)); }
```

### Container System
```css
.container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}

@media (min-width: 640px) { .container { max-width: 640px; } }
@media (min-width: 768px) { .container { max-width: 768px; } }
@media (min-width: 1024px) { .container { max-width: 1024px; } }
@media (min-width: 1280px) { .container { max-width: 1280px; } }
```

## Iconography

### Icon System
- **Primary Icon Library**: Lucide React icons
- **Icon Sizes**: 16px, 20px, 24px, 32px
- **Icon Colors**: Inherit from parent or semantic colors
- **Icon Usage**: Consistent meaning across application

### Icon Guidelines
```typescript
// Icon size utilities
const iconSizes = {
  sm: "w-4 h-4",    // 16px
  default: "w-5 h-5", // 20px
  lg: "w-6 h-6",    // 24px
  xl: "w-8 h-8"     // 32px
};
```

## Animation and Motion

### Transition System
```css
/* Standard transitions */
.transition-fast { transition-duration: 150ms; }
.transition-normal { transition-duration: 300ms; }
.transition-slow { transition-duration: 500ms; }

/* Easing functions */
.ease-out { transition-timing-function: cubic-bezier(0, 0, 0.2, 1); }
.ease-in-out { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
```

### Animation Patterns
- **Hover Effects**: Subtle scale and color transitions
- **Loading States**: Skeleton loading and spinners
- **Page Transitions**: Smooth page-to-page navigation
- **Microinteractions**: Button clicks, form submissions

## Theming System

### Theme Structure
```typescript
interface Theme {
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    success: ColorScale;
    warning: ColorScale;
    error: ColorScale;
  };
  typography: TypographyScale;
  spacing: SpacingScale;
  breakpoints: BreakpointScale;
}
```

### Dark Mode Support
```css
@media (prefers-color-scheme: dark) {
  :root {
    --primary-50: #1e3a8a;
    --primary-900: #eff6ff;
    --secondary-50: #0f172a;
    --secondary-900: #f8fafc;
  }
}

[data-theme="dark"] {
  /* Dark theme overrides */
}
```

## Accessibility Integration

### Color Contrast
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio
- **Focus Indicators**: High contrast focus rings

### Focus Management
```css
.focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

## Component Documentation

### Usage Guidelines
- **Consistent Implementation**: Use design tokens for all styling
- **Responsive Design**: Mobile-first approach with breakpoint utilities
- **Accessibility**: Built-in ARIA attributes and keyboard navigation
- **Performance**: Optimized CSS with utility classes

## Related Documentation

- **[COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md)**: Component design patterns
- **[RESPONSIVE_DESIGN.md](RESPONSIVE_DESIGN.md)**: Responsive implementation
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)**: Accessibility guidelines
- **[../UI_STANDARDS.md](../UI_STANDARDS.md)**: UI implementation standards

## Version History

- **1.0.0**: Initial comprehensive design system documentation (2025-05-24)
