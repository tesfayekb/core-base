
import React from 'react';
import IntegrationShowcase from '@/components/integration/IntegrationShowcase';
import { ErrorBoundaryWrapper } from '@/components/integration/ErrorBoundary';
import { TenantBoundary } from '@/components/integration/TenantBoundary';

export default function IntegrationDemo() {
  return (
    <ErrorBoundaryWrapper showDetails>
      <TenantBoundary>
        <IntegrationShowcase />
      </TenantBoundary>
    </ErrorBoundaryWrapper>
  );
}
