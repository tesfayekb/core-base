// Version Tracker Service
// Enhanced AI Context System - Version awareness and change tracking

export interface FileVersion {
  path: string;
  hash: string;
  timestamp: Date;
  size: number;
  changes: ChangeInfo[];
}

export interface ChangeInfo {
  type: 'added' | 'modified' | 'deleted' | 'renamed';
  description: string;
  impact: 'low' | 'medium' | 'high';
  affectedFeatures: string[];
  timestamp: Date; // Add timestamp property
}

export interface VersionHistory {
  versions: FileVersion[];
  totalChanges: number;
  lastModified: Date;
  changeVelocity: number; // changes per hour
}

export interface SystemSnapshot {
  timestamp: Date;
  overallCompletion: number;
  phaseProgress: Record<number, number>;
  featureStatus: Record<string, 'completed' | 'in-progress' | 'pending'>;
  fileVersions: Record<string, string>; // path -> hash
}

export class VersionTracker {
  private fileVersions = new Map<string, VersionHistory>();
  private snapshots: SystemSnapshot[] = [];
  private readonly MAX_SNAPSHOTS = 50;
  private readonly MAX_VERSIONS_PER_FILE = 20;

  async trackFileChange(filePath: string, content: string, features: string[]): Promise<ChangeInfo[]> {
    const hash = await this.generateHash(content);
    const now = new Date();
    
    const history = this.fileVersions.get(filePath) || {
      versions: [],
      totalChanges: 0,
      lastModified: now,
      changeVelocity: 0
    };

    const lastVersion = history.versions[history.versions.length - 1];
    const changes: ChangeInfo[] = [];

    if (!lastVersion) {
      // First version of file
      changes.push({
        type: 'added',
        description: `File ${filePath} created`,
        impact: 'medium',
        affectedFeatures: features,
        timestamp: now // Add timestamp
      });
    } else if (lastVersion.hash !== hash) {
      // File modified
      const changeImpact = this.assessChangeImpact(lastVersion, content, features);
      changes.push({
        type: 'modified',
        description: `File ${filePath} modified`,
        impact: changeImpact.impact,
        affectedFeatures: changeImpact.affectedFeatures,
        timestamp: now // Add timestamp
      });
    }

    if (changes.length > 0) {
      const newVersion: FileVersion = {
        path: filePath,
        hash,
        timestamp: now,
        size: content.length,
        changes
      };

      history.versions.push(newVersion);
      history.totalChanges += changes.length;
      history.lastModified = now;
      history.changeVelocity = this.calculateChangeVelocity(history);

      // Limit version history size
      if (history.versions.length > this.MAX_VERSIONS_PER_FILE) {
        history.versions = history.versions.slice(-this.MAX_VERSIONS_PER_FILE);
      }

      this.fileVersions.set(filePath, history);
    }

    return changes;
  }

  createSystemSnapshot(overallCompletion: number, phases: Record<number, number>, features: Record<string, 'completed' | 'in-progress' | 'pending'>): void {
    const fileVersions: Record<string, string> = {};
    
    for (const [path, history] of this.fileVersions) {
      const lastVersion = history.versions[history.versions.length - 1];
      if (lastVersion) {
        fileVersions[path] = lastVersion.hash;
      }
    }

    const snapshot: SystemSnapshot = {
      timestamp: new Date(),
      overallCompletion,
      phaseProgress: { ...phases },
      featureStatus: { ...features },
      fileVersions
    };

    this.snapshots.push(snapshot);

    // Limit snapshots
    if (this.snapshots.length > this.MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
    }

    console.log(`📸 System snapshot created: ${overallCompletion}% complete`);
  }

  getFileHistory(filePath: string): VersionHistory | null {
    return this.fileVersions.get(filePath) || null;
  }

  getRecentChanges(hours: number = 24): ChangeInfo[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const changes: ChangeInfo[] = [];

    for (const history of this.fileVersions.values()) {
      for (const version of history.versions) {
        if (version.timestamp >= since) {
          changes.push(...version.changes);
        }
      }
    }

    return changes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getProgressTrend(days: number = 7): { date: Date; completion: number }[] {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.snapshots
      .filter(snapshot => snapshot.timestamp >= since)
      .map(snapshot => ({
        date: snapshot.timestamp,
        completion: snapshot.overallCompletion
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  getChangeVelocity(filePath?: string): number {
    if (filePath) {
      const history = this.fileVersions.get(filePath);
      return history?.changeVelocity || 0;
    }

    // Overall system change velocity
    let totalVelocity = 0;
    let fileCount = 0;

    for (const history of this.fileVersions.values()) {
      totalVelocity += history.changeVelocity;
      fileCount++;
    }

    return fileCount > 0 ? totalVelocity / fileCount : 0;
  }

  detectRegressions(): { file: string; issue: string; severity: 'low' | 'medium' | 'high' }[] {
    const regressions: { file: string; issue: string; severity: 'low' | 'medium' | 'high' }[] = [];

    for (const [filePath, history] of this.fileVersions) {
      const recentVersions = history.versions.slice(-5); // Last 5 versions
      
      // Check for frequent changes (potential instability)
      if (recentVersions.length >= 4) {
        const timeSpan = recentVersions[recentVersions.length - 1].timestamp.getTime() - recentVersions[0].timestamp.getTime();
        const hoursSpan = timeSpan / (1000 * 60 * 60);
        
        if (hoursSpan < 1) { // 4+ changes in 1 hour
          regressions.push({
            file: filePath,
            issue: 'High change frequency detected - potential instability',
            severity: 'medium'
          });
        }
      }

      // Check for size fluctuations (potential refactoring issues)
      if (recentVersions.length >= 3) {
        const sizes = recentVersions.map(v => v.size);
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const variance = sizes.reduce((acc, size) => acc + Math.pow(size - avgSize, 2), 0) / sizes.length;
        
        if (variance > avgSize * 0.5) { // High variance in file size
          regressions.push({
            file: filePath,
            issue: 'Significant size fluctuations detected',
            severity: 'low'
          });
        }
      }
    }

    return regressions;
  }

  generateChangeReport(): {
    summary: string;
    recentChanges: ChangeInfo[];
    regressions: any[];
    velocity: number;
    recommendations: string[];
  } {
    const recentChanges = this.getRecentChanges(24);
    const regressions = this.detectRegressions();
    const velocity = this.getChangeVelocity();
    
    const recommendations: string[] = [];
    
    if (velocity > 10) {
      recommendations.push('High change velocity detected - consider stabilization period');
    }
    
    if (regressions.length > 0) {
      recommendations.push(`${regressions.length} potential issues detected - review recent changes`);
    }
    
    if (recentChanges.filter(c => c.impact === 'high').length > 3) {
      recommendations.push('Multiple high-impact changes - validate system stability');
    }

    const summary = `${recentChanges.length} changes in last 24h, ${regressions.length} potential issues, ${velocity.toFixed(1)} changes/hour velocity`;

    return {
      summary,
      recentChanges: recentChanges.slice(0, 10), // Most recent 10
      regressions,
      velocity,
      recommendations
    };
  }

  private async generateHash(content: string): Promise<string> {
    // Simple hash implementation - in production, use crypto.subtle
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private assessChangeImpact(lastVersion: FileVersion, newContent: string, features: string[]): { impact: 'low' | 'medium' | 'high'; affectedFeatures: string[] } {
    const sizeDiff = Math.abs(newContent.length - lastVersion.size);
    const sizeDiffPercent = sizeDiff / lastVersion.size;

    // Determine impact based on size change and affected features
    let impact: 'low' | 'medium' | 'high' = 'low';
    
    if (sizeDiffPercent > 0.5 || features.length > 2) {
      impact = 'high';
    } else if (sizeDiffPercent > 0.2 || features.length > 0) {
      impact = 'medium';
    }

    return {
      impact,
      affectedFeatures: features
    };
  }

  private calculateChangeVelocity(history: VersionHistory): number {
    if (history.versions.length < 2) return 0;

    const recentVersions = history.versions.slice(-10); // Last 10 versions
    const timeSpan = recentVersions[recentVersions.length - 1].timestamp.getTime() - recentVersions[0].timestamp.getTime();
    const hours = timeSpan / (1000 * 60 * 60);

    return hours > 0 ? (recentVersions.length - 1) / hours : 0;
  }

  clearHistory(): void {
    console.log('🗑️ Clearing version history');
    this.fileVersions.clear();
    this.snapshots = [];
  }
}

export const versionTracker = new VersionTracker();
