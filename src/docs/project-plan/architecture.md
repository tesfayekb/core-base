
# System Architecture

## Frontend Architecture

This project is built using:
- React with TypeScript
- Vite for bundling
- Tailwind CSS for styling
- shadcn/ui component library
- React Router for navigation
- Tanstack Query for data fetching

## Component Structure

The application follows a modular component structure:
- `/components/ui`: Reusable UI components (shadcn)
- `/components/layout`: Layout components (Header, Sidebar, etc.)
- `/components/[feature]`: Feature-specific components
- `/pages`: Page components that compose other components
- `/hooks`: Custom React hooks
- `/lib`: Utility functions and helpers

## State Management

- Local component state with useState for simple state
- Context API for shared state when necessary
- Tanstack Query for server state management
