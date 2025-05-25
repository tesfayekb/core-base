// Version Tracker Service
// Tracks file changes and version information

class VersionTrackerService {
  private changes: Array<{
    file: string;
    content: string;
    features: string[];
    timestamp: string;
  }> = [];

  getRecentChanges(hours: number = 24): any[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.changes.filter(change => 
      new Date(change.timestamp) > cutoff
    );
  }

  generateChangeReport(): {
    velocity: number;
    recentChanges: number;
    summary: string;
  } {
    const recentChanges = this.getRecentChanges(24);
    
    return {
      velocity: recentChanges.length,
      recentChanges: recentChanges.length,
      summary: `${recentChanges.length} changes in the last 24 hours`
    };
  }

  async trackFileChange(file: string, content: string, features: string[]): Promise<void> {
    this.changes.push({
      file,
      content,
      features,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 changes
    if (this.changes.length > 100) {
      this.changes = this.changes.slice(-100);
    }
  }
}

export const versionTracker = new VersionTrackerService();
