
# Conflict-Free Replicated Data Types (CRDTs)

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

Implementing CRDTs for automatic conflict resolution in offline synchronization scenarios.

## CRDT Implementation

### Core CRDT Operations

```typescript
interface CRDTOperation {
  id: string;
  timestamp: number;
  userId: string;
  tenantId: string;
  operation: 'insert' | 'update' | 'delete';
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  version: number;
}

class CRDTSyncEngine {
  private operationLog: CRDTOperation[] = [];
  private lastSyncTimestamp: number = 0;
  
  async recordOperation(operation: CRDTOperation): Promise<void> {
    // Add vector clock for conflict resolution
    operation.timestamp = this.generateTimestamp();
    operation.version = await this.getNextVersion(operation.entityId);
    
    this.operationLog.push(operation);
    await this.persistOperation(operation);
    
    // Attempt immediate sync if online
    if (this.isOnline()) {
      this.scheduleSyncAttempt();
    }
  }
  
  async resolveConflicts(
    localOps: CRDTOperation[], 
    remoteOps: CRDTOperation[]
  ): Promise<CRDTOperation[]> {
    const allOps = [...localOps, ...remoteOps];
    
    // Sort by timestamp for deterministic resolution
    allOps.sort((a, b) => a.timestamp - b.timestamp);
    
    // Apply last-write-wins with user priority rules
    const resolved = new Map<string, CRDTOperation>();
    
    for (const op of allOps) {
      const key = `${op.entityType}:${op.entityId}`;
      const existing = resolved.get(key);
      
      if (!existing || this.shouldOverride(existing, op)) {
        resolved.set(key, op);
      }
    }
    
    return Array.from(resolved.values());
  }
  
  private shouldOverride(existing: CRDTOperation, incoming: CRDTOperation): boolean {
    // Priority rules for conflict resolution
    if (incoming.timestamp > existing.timestamp) return true;
    if (incoming.timestamp === existing.timestamp) {
      // Use user ID as tiebreaker for deterministic resolution
      return incoming.userId > existing.userId;
    }
    return false;
  }
}
```

## Related Documentation

- **[OFFLINE_SYNC_STRATEGIES.md](src/docs/mobile/OFFLINE_SYNC_STRATEGIES.md)**: Main synchronization overview
- **[OPERATIONAL_TRANSFORM.md](src/docs/mobile/sync/OPERATIONAL_TRANSFORM.md)**: Alternative conflict resolution approach

## Version History

- **1.0.0**: Initial CRDT synchronization implementation (2025-05-23)
