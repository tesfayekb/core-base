
# Testing Guide

## Overview

This project includes comprehensive testing for the migration system and Supabase integration.

## Test Categories

### Unit Tests
- Individual component testing
- Business logic validation
- Mock-based testing

### Integration Tests
- Database integration with Supabase
- Migration system validation
- Real database operations

## Running Tests

### Prerequisites

1. **Environment Variables**: Ensure you have valid Supabase environment variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

2. **Database Setup**: Your Supabase project should have the migration support functions installed.

### Test Commands

Since `package.json` is read-only, you can run tests using npx:

```bash
# Run all tests
npx jest

# Run specific test file
npx jest src/services/migrations/__tests__/supabaseIntegration.test.ts

# Run tests in watch mode
npx jest --watch

# Run tests with coverage
npx jest --coverage
```

### Integration Test Behavior

- **With Valid Supabase Connection**: Tests will perform actual database operations
- **Without Valid Connection**: Tests will validate error handling gracefully
- **Test Isolation**: Tests are designed to not interfere with each other

## Test Structure

```
src/tests/
├── setup.ts                 # Global test configuration
├── testUtils.ts             # Test utility functions
├── utils/
│   └── test-helpers.ts      # Helper functions for testing
└── README.md               # This file

src/services/migrations/__tests__/
├── migrationIntegration.test.ts    # Legacy migration tests
└── supabaseIntegration.test.ts     # Real Supabase integration tests
```

## Development Workflow

1. **Write Tests First**: Follow TDD approach where possible
2. **Test in Isolation**: Each test should be independent
3. **Use Real Database**: Integration tests use actual Supabase connection
4. **Mock When Appropriate**: Unit tests should use mocks for external dependencies

## Troubleshooting

- **Connection Errors**: Verify Supabase environment variables
- **Timeout Issues**: Increase test timeout in Jest config if needed
- **Permission Errors**: Ensure your Supabase project has necessary RLS policies disabled for testing
