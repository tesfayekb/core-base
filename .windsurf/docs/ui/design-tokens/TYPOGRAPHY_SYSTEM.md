
# Typography System

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Comprehensive typography system with semantic scales and consistent implementation.

## Font Families
```css
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

## Type Scale
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

## Typography Guidelines

### Hierarchy Usage
- **H1**: Page titles and primary headers
- **H2**: Section headers and major divisions
- **H3**: Subsection headers
- **H4**: Component headers and labels
- **Body**: Standard content and descriptions
- **Caption**: Metadata and supplementary information

### Responsive Typography
- Mobile-first scaling with fluid typography
- Viewport-based adjustments for optimal readability
- Consistent line-height ratios across all sizes

## Related Documentation

- **[COLOR_SYSTEM.md](COLOR_SYSTEM.md)**: Color design tokens
- **[SPACING_SYSTEM.md](SPACING_SYSTEM.md)**: Spacing and layout tokens
- **[../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)**: Complete design system overview

## Version History

- **1.0.0**: Extracted from DESIGN_SYSTEM.md for optimal AI processing (2025-05-24)
