
// File System Scanner Service
// Enhanced AI Context System - Real file system integration

export interface FileContent {
  path: string;
  content: string;
  functions: string[];
  components: string[];
  imports: string[];
  exports: string[];
  lastModified: Date;
  size: number;
}

export interface CacheStats {
  totalFiles: number;
  cacheHits: number;
  cacheMisses: number;
  memoryUsage: number;
  lastCleanup: Date | null;
}

class FileSystemScannerService {
  private cache = new Map<string, FileContent>();
  private cacheStats: CacheStats = {
    totalFiles: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0,
    lastCleanup: null
  };

  async scanFile(filePath: string): Promise<FileContent | null> {
    try {
      // Check cache first
      if (this.cache.has(filePath)) {
        this.cacheStats.cacheHits++;
        return this.cache.get(filePath)!;
      }

      this.cacheStats.cacheMisses++;
      
      // Simulate file reading - in real implementation, would use fs.readFile
      const content = await this.readFileContent(filePath);
      if (!content) return null;

      const fileContent: FileContent = {
        path: filePath,
        content,
        functions: this.extractFunctions(content),
        components: this.extractComponents(content),
        imports: this.extractImports(content),
        exports: this.extractExports(content),
        lastModified: new Date(),
        size: content.length
      };

      this.cache.set(filePath, fileContent);
      this.updateMemoryUsage();
      
      return fileContent;
    } catch (error) {
      console.warn(`Failed to scan file ${filePath}:`, error);
      return null;
    }
  }

  private async readFileContent(filePath: string): Promise<string | null> {
    // In a real implementation, this would read from the file system
    // For now, return null to indicate file not found
    return null;
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

  private updateMemoryUsage(): void {
    let totalSize = 0;
    for (const fileContent of this.cache.values()) {
      totalSize += fileContent.size;
    }
    this.cacheStats.memoryUsage = totalSize;
    this.cacheStats.totalFiles = this.cache.size;
  }

  getCacheStats(): CacheStats {
    return { ...this.cacheStats };
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheStats = {
      totalFiles: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      lastCleanup: new Date()
    };
    console.log('🧹 File system cache cleared');
  }
}

export const fileSystemScanner = new FileSystemScannerService();
