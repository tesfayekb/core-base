
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Export everything from testing library
export * from '@testing-library/react';
export { screen, waitFor, fireEvent };

// Mock router provider for tests
export const MockedRouterProvider = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};
