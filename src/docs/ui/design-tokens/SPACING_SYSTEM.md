
# Spacing System

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Consistent spacing system based on 4px grid for predictable layouts.

## Spacing Scale
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

## Component Spacing Guidelines
- **Card Padding**: space-6 (24px) for desktop, space-4 (16px) for mobile
- **Section Spacing**: space-12 (48px) between major sections
- **Element Spacing**: space-4 (16px) between related elements
- **Form Spacing**: space-4 (16px) between form fields

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

## Related Documentation

- **[COLOR_SYSTEM.md](COLOR_SYSTEM.md)**: Color design tokens
- **[TYPOGRAPHY_SYSTEM.md](TYPOGRAPHY_SYSTEM.md)**: Typography design tokens
- **[../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)**: Complete design system overview

## Version History

- **1.0.0**: Extracted from DESIGN_SYSTEM.md for optimal AI processing (2025-05-24)
