
# Coding Style Guidelines

When contributing to this project, follow these guidelines:

## General Principles

- Write small, focused components (< 200 lines)
- Maintain single responsibility principle
- Use TypeScript types for all props and state
- Follow a functional component approach

## Naming Conventions

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- Utility functions: camelCase (e.g., `formatDate.ts`)
- Files should be named according to their primary export

## Component Structure

```tsx
// Imports
import { useState } from "react";
import { SomeComponent } from "./SomeComponent";

// Types
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

// Component definition
export function Component({ prop1, prop2 = 0 }: ComponentProps) {
  // State declarations
  const [state, setState] = useState(initial);
  
  // Event handlers
  const handleEvent = () => {
    // Logic
  };
  
  // Component JSX
  return (
    <div>
      {/* JSX content */}
    </div>
  );
}
```

## Styling

- Use Tailwind CSS classes for styling
- Leverage shadcn/ui components when possible
- Use the `cn` utility for conditional class names
- Maintain responsive design principles
