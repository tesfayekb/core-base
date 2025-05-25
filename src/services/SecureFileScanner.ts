// Secure File Scanner Service
// Enhanced security with sandboxing, content filtering, and rate limiting

export interface ScanPermissions {
  allowedPaths: string[];
  blockedPaths: string[];
  allowedExtensions: string[];
  maxFileSize: number;
  maxFilesPerBatch: number;
}

export interface RateLimitConfig {
  maxScansPerMinute: number;
  maxScansPerHour: number;
  cooldownPeriod: number;
}

export interface SecurityViolation {
  type: 'unauthorized_access' | 'rate_limit_exceeded' | 'suspicious_content' | 'file_too_large';
  path?: string;
  details: string;
  timestamp: Date;
}

class SecureFileScannerService {
  private static instance: SecureFileScannerService;
  private permissions: ScanPermissions;
  private rateLimitConfig: RateLimitConfig;
  private scanHistory: Map<string, number[]> = new Map(); // IP/user -> timestamps
  private violations: SecurityViolation[] = [];

  static getInstance(): SecureFileScannerService {
    if (!SecureFileScannerService.instance) {
      SecureFileScannerService.instance = new SecureFileScannerService();
    }
    return SecureFileScannerService.instance;
  }

  private constructor() {
    this.permissions = {
      allowedPaths: [
        'src/**',
        'docs/**',
        'public/**',
        '*.md',
        '*.json',
        '*.ts',
        '*.tsx',
        '*.js',
        '*.jsx'
      ],
      blockedPaths: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/build/**',
        '**/.env*',
        '**/secrets/**',
        '**/keys/**',
        '**/certificates/**',
        '**/*.key',
        '**/*.pem',
        '**/*.p12'
      ],
      allowedExtensions: [
        '.ts', '.tsx', '.js', '.jsx', '.json', '.md', 
        '.txt', '.yml', '.yaml', '.css', '.scss'
      ],
      maxFileSize: 1024 * 1024, // 1MB
      maxFilesPerBatch: 50
    };

    this.rateLimitConfig = {
      maxScansPerMinute: 100,
      maxScansPerHour: 1000,
      cooldownPeriod: 5 * 60 * 1000 // 5 minutes
    };
  }

  async secureScan(filePath: string, requesterId: string = 'anonymous'): Promise<{
    allowed: boolean;
    content?: string;
    violation?: SecurityViolation;
  }> {
    // Check rate limiting first
    const rateLimitResult = this.checkRateLimit(requesterId);
    if (!rateLimitResult.allowed) {
      const violation: SecurityViolation = {
        type: 'rate_limit_exceeded',
        path: filePath,
        details: `Rate limit exceeded. Next scan allowed in ${rateLimitResult.nextAllowedIn}ms`,
        timestamp: new Date()
      };
      this.recordViolation(violation);
      return { allowed: false, violation };
    }

    // Check file path permissions
    const pathResult = this.checkPathPermissions(filePath);
    if (!pathResult.allowed) {
      const violation: SecurityViolation = {
        type: 'unauthorized_access',
        path: filePath,
        details: pathResult.reason,
        timestamp: new Date()
      };
      this.recordViolation(violation);
      return { allowed: false, violation };
    }

    // Check file extension
    const extensionResult = this.checkFileExtension(filePath);
    if (!extensionResult.allowed) {
      const violation: SecurityViolation = {
        type: 'unauthorized_access',
        path: filePath,
        details: extensionResult.reason,
        timestamp: new Date()
      };
      this.recordViolation(violation);
      return { allowed: false, violation };
    }

    // Record successful scan attempt
    this.recordScanAttempt(requesterId);

    try {
      // In a real implementation, this would perform actual file reading
      // with proper sandboxing and size checks
      const content = await this.readFileSecurely(filePath);
      
      // Content filtering
      const contentResult = this.filterContent(content, filePath);
      if (!contentResult.allowed) {
        const violation: SecurityViolation = {
          type: 'suspicious_content',
          path: filePath,
          details: contentResult.reason,
          timestamp: new Date()
        };
        this.recordViolation(violation);
        return { allowed: false, violation };
      }

      return { allowed: true, content: contentResult.filteredContent };
    } catch (error) {
      console.error('Secure file scan failed:', error);
      return { allowed: false, violation: {
        type: 'unauthorized_access',
        path: filePath,
        details: 'File access failed',
        timestamp: new Date()
      }};
    }
  }

  private checkRateLimit(requesterId: string): { allowed: boolean; nextAllowedIn?: number } {
    const now = Date.now();
    const userHistory = this.scanHistory.get(requesterId) || [];
    
    // Clean old entries
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);
    
    const recentScans = userHistory.filter(timestamp => timestamp > oneHourAgo);
    const recentMinuteScans = recentScans.filter(timestamp => timestamp > oneMinuteAgo);

    // Check minute limit
    if (recentMinuteScans.length >= this.rateLimitConfig.maxScansPerMinute) {
      const oldestInMinute = Math.min(...recentMinuteScans);
      const nextAllowedIn = (oldestInMinute + 60 * 1000) - now;
      return { allowed: false, nextAllowedIn };
    }

    // Check hour limit
    if (recentScans.length >= this.rateLimitConfig.maxScansPerHour) {
      const oldestInHour = Math.min(...recentScans);
      const nextAllowedIn = (oldestInHour + 60 * 60 * 1000) - now;
      return { allowed: false, nextAllowedIn };
    }

    return { allowed: true };
  }

  private checkPathPermissions(filePath: string): { allowed: boolean; reason?: string } {
    // Normalize path
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check blocked paths first
    for (const blockedPattern of this.permissions.blockedPaths) {
      if (this.matchesPattern(normalizedPath, blockedPattern)) {
        return { allowed: false, reason: `Path blocked: ${blockedPattern}` };
      }
    }

    // Check allowed paths
    for (const allowedPattern of this.permissions.allowedPaths) {
      if (this.matchesPattern(normalizedPath, allowedPattern)) {
        return { allowed: true };
      }
    }

    return { allowed: false, reason: 'Path not in allowed list' };
  }

  private checkFileExtension(filePath: string): { allowed: boolean; reason?: string } {
    const extension = '.' + filePath.split('.').pop()?.toLowerCase();
    
    if (!this.permissions.allowedExtensions.includes(extension)) {
      return { allowed: false, reason: `File extension not allowed: ${extension}` };
    }

    return { allowed: true };
  }

  private async readFileSecurely(filePath: string): Promise<string> {
    // Simulate secure file reading with size checks
    // In real implementation, this would use proper file system APIs
    // with sandboxing and size limitations
    
    const simulatedContent = `// Secure content from ${filePath}`;
    
    if (simulatedContent.length > this.permissions.maxFileSize) {
      throw new Error('File too large');
    }

    return simulatedContent;
  }

  private filterContent(content: string, filePath: string): { 
    allowed: boolean; 
    filteredContent?: string; 
    reason?: string 
  } {
    // Content filtering rules
    const sensitivePatterns = [
      /password\s*[:=]\s*[^\s\n]+/gi,
      /api[_-]?key\s*[:=]\s*[^\s\n]+/gi,
      /secret\s*[:=]\s*[^\s\n]+/gi,
      /token\s*[:=]\s*[^\s\n]+/gi,
      /-----BEGIN.*PRIVATE KEY-----/gi
    ];

    let filteredContent = content;
    let hasSensitiveContent = false;

    for (const pattern of sensitivePatterns) {
      if (pattern.test(content)) {
        hasSensitiveContent = true;
        filteredContent = filteredContent.replace(pattern, '[REDACTED]');
      }
    }

    if (hasSensitiveContent) {
      console.warn(`Sensitive content filtered in ${filePath}`);
    }

    return { allowed: true, filteredContent };
  }

  private matchesPattern(path: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\./g, '\\.');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(path);
  }

  private recordScanAttempt(requesterId: string): void {
    const now = Date.now();
    const userHistory = this.scanHistory.get(requesterId) || [];
    userHistory.push(now);
    
    // Keep only last hour of history
    const oneHourAgo = now - (60 * 60 * 1000);
    const filteredHistory = userHistory.filter(timestamp => timestamp > oneHourAgo);
    
    this.scanHistory.set(requesterId, filteredHistory);
  }

  private recordViolation(violation: SecurityViolation): void {
    this.violations.push(violation);
    
    // Keep only last 1000 violations
    if (this.violations.length > 1000) {
      this.violations = this.violations.slice(-1000);
    }

    // Log security violation
    console.warn('Security violation detected:', violation);
  }

  updatePermissions(permissions: Partial<ScanPermissions>): void {
    this.permissions = { ...this.permissions, ...permissions };
    console.log('🔒 File scanner permissions updated');
  }

  updateRateLimits(config: Partial<RateLimitConfig>): void {
    this.rateLimitConfig = { ...this.rateLimitConfig, ...config };
    console.log('🔒 Rate limit configuration updated');
  }

  getSecurityReport(): {
    recentViolations: SecurityViolation[];
    rateLimitStatus: Record<string, { scansInLastHour: number; scansInLastMinute: number }>;
    configuration: { permissions: ScanPermissions; rateLimits: RateLimitConfig };
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);

    const rateLimitStatus: Record<string, any> = {};
    for (const [requesterId, history] of this.scanHistory.entries()) {
      rateLimitStatus[requesterId] = {
        scansInLastHour: history.filter(t => t > oneHourAgo).length,
        scansInLastMinute: history.filter(t => t > oneMinuteAgo).length
      };
    }

    return {
      recentViolations: this.violations.slice(-50), // Last 50 violations
      rateLimitStatus,
      configuration: {
        permissions: this.permissions,
        rateLimits: this.rateLimitConfig
      }
    };
  }

  clearViolationHistory(): void {
    this.violations = [];
    console.log('🔒 Security violation history cleared');
  }
}

export const secureFileScanner = SecureFileScannerService.getInstance();
