
// Secure File System Scanner Service
// Integration with security-enhanced file scanning

import { secureFileScanner } from './SecureFileScanner';
import { FileContent } from './FileSystemScanner';

export interface SecureScanResult {
  success: boolean;
  fileContent?: FileContent;
  securityViolation?: string;
  rateLimited?: boolean;
}

class SecureFileSystemScannerService {
  private cache = new Map<string, { content: FileContent; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  async scanFileSecurely(filePath: string, requesterId: string = 'system'): Promise<SecureScanResult> {
    try {
      // Check cache first (security-aware caching)
      const cached = this.cache.get(filePath);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return { success: true, fileContent: cached.content };
      }

      // Perform secure scan
      const scanResult = await secureFileScanner.secureScan(filePath, requesterId);
      
      if (!scanResult.allowed) {
        return {
          success: false,
          securityViolation: scanResult.violation?.details,
          rateLimited: scanResult.violation?.type === 'rate_limit_exceeded'
        };
      }

      if (!scanResult.content) {
        return { success: false, securityViolation: 'No content returned' };
      }

      // Process content with security filtering
      const fileContent: FileContent = {
        path: filePath,
        content: scanResult.content,
        functions: this.extractFunctions(scanResult.content),
        components: this.extractComponents(scanResult.content),
        imports: this.extractImports(scanResult.content),
        exports: this.extractExports(scanResult.content),
        lastModified: new Date(),
        size: scanResult.content.length
      };

      // Cache the result
      this.cache.set(filePath, { content: fileContent, timestamp: Date.now() });

      return { success: true, fileContent };
    } catch (error) {
      console.error('Secure file scan failed:', error);
      return { 
        success: false, 
        securityViolation: 'File scanning failed due to security restrictions' 
      };
    }
  }

  async scanMultipleFiles(filePaths: string[], requesterId: string = 'system'): Promise<{
    successful: FileContent[];
    failed: Array<{ path: string; reason: string }>;
  }> {
    const successful: FileContent[] = [];
    const failed: Array<{ path: string; reason: string }> = [];

    // Process files in smaller batches to respect rate limits
    const batchSize = 10;
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      
      const results = await Promise.all(
        batch.map(path => this.scanFileSecurely(path, requesterId))
      );

      results.forEach((result, index) => {
        const path = batch[index];
        if (result.success && result.fileContent) {
          successful.push(result.fileContent);
        } else {
          failed.push({
            path,
            reason: result.securityViolation || 'Unknown error'
          });
        }
      });

      // Small delay between batches to avoid overwhelming rate limits
      if (i + batchSize < filePaths.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return { successful, failed };
  }

  private extractFunctions(content: string): string[] {
    const functionRegex = /(?:function\s+|const\s+\w+\s*=\s*(?:async\s+)?(?:\([\w\s,]*\)\s*=>|function)|\w+\s*\([\w\s,]*\)\s*{)/g;
    const matches = content.match(functionRegex) || [];
    return matches.map(match => {
      const nameMatch = match.match(/(?:function\s+|const\s+)(\w+)/);
      return nameMatch ? nameMatch[1] : 'anonymous';
    });
  }

  private extractComponents(content: string): string[] {
    const componentRegex = /(?:function\s+|const\s+|export\s+(?:default\s+)?(?:function\s+)?|export\s+(?:default\s+)?const\s+)([A-Z][A-Za-z0-9]*)/g;
    const matches = content.match(componentRegex) || [];
    return matches.map(match => {
      const nameMatch = match.match(/([A-Z][A-Za-z0-9]*)/);
      return nameMatch ? nameMatch[1] : '';
    }).filter(Boolean);
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
    const matches = [];
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:const\s+|function\s+|class\s+)?(\w+)/g;
    const matches = [];
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  getSecurityStatus() {
    return secureFileScanner.getSecurityReport();
  }

  clearSecureCache(): void {
    this.cache.clear();
    console.log('🔒 Secure file system cache cleared');
  }
}

export const secureFileSystemScanner = new SecureFileSystemScannerService();
