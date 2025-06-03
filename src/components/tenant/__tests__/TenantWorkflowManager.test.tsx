
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@/tests/utils/testHelpers';
import '@testing-library/jest-dom';
import { TenantWorkflowManager } from '../TenantWorkflowManager';

describe('TenantWorkflowManager Component', () => {
  test('renders TenantWorkflowManager without errors', () => {
    render(<TenantWorkflowManager />);
    expect(screen.getByText('Tenant Workflow Manager')).toBeInTheDocument();
  });
});
