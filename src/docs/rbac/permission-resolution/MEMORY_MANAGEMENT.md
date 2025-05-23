
# Permission Memory Management

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details strategies for optimizing memory usage in the permission system to ensure efficient operation even with large permission sets.

## Memory Footprint Strategies

The system implements several strategies to manage memory usage:

1. **Selective Caching**:
   - Cache only frequently accessed permissions
   - Implement LRU eviction for cache entries

2. **Compressed Permission Representation**:
   - Bit vector encoding for permission sets
   - Reduces memory footprint for large permission sets

3. **Cache Size Limits**:
   - Maximum entries per cache
   - Maximum memory allocation per tenant

## Bitfield Implementation

```typescript
class PermissionBitfield {
  // Common permission actions as bit positions
  private static readonly ACTION_BITS: Record<string, number> = {
    'View': 1 << 0,        // 1
    'ViewAny': 1 << 1,     // 2
    'Create': 1 << 2,      // 4
    'Update': 1 << 3,      // 8
    'Delete': 1 << 4,      // 16
    'DeleteAny': 1 << 5,   // 32
    'Restore': 1 << 6,     // 64
    'Replicate': 1 << 7,   // 128
    'Export': 1 << 8,      // 256
    'Import': 1 << 9,      // 512
    'BulkEdit': 1 << 10,   // 1024
    'BulkDelete': 1 << 11, // 2048
    'Manage': 1 << 12      // 4096
  };
  
  // Map of resource IDs to permission bitfields
  private resourcePermissions: Map<string, number> = new Map();
  
  // Set a permission
  setPermission(resourceId: string, action: string, granted: boolean): void {
    const bit = PermissionBitfield.ACTION_BITS[action];
    if (!bit) return;
    
    const currentBits = this.resourcePermissions.get(resourceId) || 0;
    
    if (granted) {
      this.resourcePermissions.set(resourceId, currentBits | bit);
    } else {
      this.resourcePermissions.set(resourceId, currentBits & ~bit);
    }
  }
  
  // Check if a permission is granted
  hasPermission(resourceId: string, action: string): boolean {
    const bit = PermissionBitfield.ACTION_BITS[action];
    if (!bit) return false;
    
    const currentBits = this.resourcePermissions.get(resourceId) || 0;
    return (currentBits & bit) === bit;
  }
}
```

## Shared Reference Objects

To reduce memory duplication, the system uses shared reference objects:

```typescript
class PermissionObjectPool {
  // Global permission reference store
  private static readonly resources: Map<string, any> = new Map();
  private static readonly actions: Map<string, any> = new Map();
  private static readonly results: Map<string, any> = new Map();
  
  // Get a resource object (reuses existing references)
  static getResource(resourceId: string): any {
    if (!this.resources.has(resourceId)) {
      this.resources.set(resourceId, { id: resourceId });
    }
    return this.resources.get(resourceId);
  }
  
  // Get an action object (reuses existing references)
  static getAction(actionName: string): any {
    if (!this.actions.has(actionName)) {
      this.actions.set(actionName, { name: actionName });
    }
    return this.actions.get(actionName);
  }
  
  // Get a result object (reuses common boolean result objects)
  static getResult(key: string, value: boolean): any {
    const resultKey = `${key}:${value}`;
    if (!this.results.has(resultKey)) {
      this.results.set(resultKey, { key, value });
    }
    return this.results.get(resultKey);
  }
  
  // Create a permission check result with shared references
  static createPermissionResult(
    userId: string,
    resourceId: string,
    action: string,
    granted: boolean
  ): any {
    return {
      user: userId, // String values are already interned by JS engine
      resource: this.getResource(resourceId),
      action: this.getAction(action),
      result: this.getResult(`${resourceId}:${action}`, granted)
    };
  }
}
```

## Custom Memory Pool

For highly optimized scenarios, the system implements a custom memory pool:

```typescript
class PermissionMemoryPool {
  private pools: Record<string, any[]> = {};
  private maxPoolSize = 1000;
  
  // Get an object from the pool or create a new one
  acquire<T>(poolName: string, factory: () => T): T {
    if (!this.pools[poolName]) {
      this.pools[poolName] = [];
    }
    
    const pool = this.pools[poolName];
    if (pool.length > 0) {
      return pool.pop();
    }
    
    return factory();
  }
  
  // Return an object to the pool
  release(poolName: string, obj: any): void {
    if (!this.pools[poolName]) {
      this.pools[poolName] = [];
    }
    
    const pool = this.pools[poolName];
    if (pool.length < this.maxPoolSize) {
      // Reset object state before returning to pool
      if (typeof obj.reset === 'function') {
        obj.reset();
      }
      
      pool.push(obj);
    }
    // If pool is full, let the object be garbage collected
  }
  
  // Clear a specific pool
  clear(poolName: string): void {
    if (this.pools[poolName]) {
      this.pools[poolName] = [];
    }
  }
}
```

## Binary Protocols for Data Transfer

For efficient serialization and transfer of permission data:

```typescript
class BinaryPermissionProtocol {
  // Encode permission data for efficient transfer
  static encode(permissions: any): Uint8Array {
    // Format:
    // [4 bytes: number of resources]
    // For each resource:
    //   [2 bytes: resource name length]
    //   [n bytes: resource name]
    //   [4 bytes: permission bitfield]
    
    // Calculate buffer size
    let bufferSize = 4; // Start with 4 bytes for resource count
    const resources = Object.keys(permissions);
    
    for (const resource of resources) {
      bufferSize += 2; // 2 bytes for resource name length
      bufferSize += Buffer.byteLength(resource); // resource name bytes
      bufferSize += 4; // 4 bytes for permission bitfield
    }
    
    const buffer = Buffer.alloc(bufferSize);
    let offset = 0;
    
    // Write resource count
    buffer.writeUInt32LE(resources.length, offset);
    offset += 4;
    
    // Write each resource and its permissions
    for (const resource of resources) {
      // Write resource name length
      const nameBytes = Buffer.from(resource);
      buffer.writeUInt16LE(nameBytes.length, offset);
      offset += 2;
      
      // Write resource name
      nameBytes.copy(buffer, offset);
      offset += nameBytes.length;
      
      // Write permission bitfield
      const permissionBits = this.calculatePermissionBits(permissions[resource]);
      buffer.writeUInt32LE(permissionBits, offset);
      offset += 4;
    }
    
    return buffer;
  }
  
  // Decode permission data
  static decode(buffer: Uint8Array): any {
    const view = Buffer.from(buffer);
    let offset = 0;
    
    // Read resource count
    const resourceCount = view.readUInt32LE(offset);
    offset += 4;
    
    const permissions: any = {};
    
    // Read each resource
    for (let i = 0; i < resourceCount; i++) {
      // Read resource name length
      const nameLength = view.readUInt16LE(offset);
      offset += 2;
      
      // Read resource name
      const resourceName = view.toString('utf8', offset, offset + nameLength);
      offset += nameLength;
      
      // Read permission bitfield
      const permissionBits = view.readUInt32LE(offset);
      offset += 4;
      
      // Convert permission bits back to object
      permissions[resourceName] = this.bitsToPermissions(permissionBits);
    }
    
    return permissions;
  }
  
  // Convert permission object to bitfield
  private static calculatePermissionBits(permissions: Record<string, boolean>): number {
    let bits = 0;
    
    if (permissions.View) bits |= (1 << 0);
    if (permissions.ViewAny) bits |= (1 << 1);
    if (permissions.Create) bits |= (1 << 2);
    if (permissions.Update) bits |= (1 << 3);
    if (permissions.Delete) bits |= (1 << 4);
    if (permissions.DeleteAny) bits |= (1 << 5);
    // Additional permission types...
    
    return bits;
  }
}
```

## Related Documentation

- **[PERFORMANCE_OPTIMIZATION.md](PERFORMANCE_OPTIMIZATION.md)**: Overview of performance optimization
- **[CACHING.md](CACHING.md)**: Permission caching strategies
- **[BATCH_PROCESSING.md](BATCH_PROCESSING.md)**: Batched permission operations
- **[DATABASE_OPTIMIZATION.md](DATABASE_OPTIMIZATION.md)**: Database-level optimizations

## Version History

- **1.0.0**: Initial document created from PERFORMANCE_OPTIMIZATION.md refactoring (2025-05-23)
