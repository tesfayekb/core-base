
# Color System

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-24

## Overview

Comprehensive color system providing consistent visual language across the application.

## Primary Color Palette
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

## Semantic Color Usage
- **Primary**: Main actions, links, active states
- **Secondary**: Supporting content, borders, backgrounds
- **Success**: Confirmations, completed states
- **Warning**: Cautions, pending states
- **Error**: Errors, destructive actions
- **Info**: Information, neutral notifications

## Dark Mode Support
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

## Related Documentation

- **[TYPOGRAPHY_SYSTEM.md](TYPOGRAPHY_SYSTEM.md)**: Typography design tokens
- **[SPACING_SYSTEM.md](SPACING_SYSTEM.md)**: Spacing and layout tokens
- **[../DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md)**: Complete design system overview

## Version History

- **1.0.0**: Extracted from DESIGN_SYSTEM.md for optimal AI processing (2025-05-24)
