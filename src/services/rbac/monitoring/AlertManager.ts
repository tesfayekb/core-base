
// Performance Alert Management
import { PerformanceAlert } from './PerformanceTypes';

export class AlertManager {
  private alerts: PerformanceAlert[] = [];

  addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert);
    console.warn(`Cache Performance Alert: ${alert.message}`);

    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  getActiveAlerts(): PerformanceAlert[] {
    const cutoffTime = Date.now() - (60 * 60 * 1000);
    return this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}
