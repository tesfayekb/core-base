
// Validation Report Generator
// Extracted from Phase1ValidationRunner for focused responsibility

import { ValidationReport } from './validators/DatabaseValidator';

export class ReportGenerator {
  generateRecommendations(report: ValidationReport): void {
    if (report.componentScores.database < 100) {
      report.recommendations.push('Review database connection and migration setup');
    }
    
    if (report.componentScores.performance < 85) {
      report.recommendations.push('Optimize performance bottlenecks before next phase');
    }
    
    if (report.componentScores.multiTenant < 100) {
      report.recommendations.push('Improve tenant switching performance');
    }
    
    if (report.overallScore < 85) {
      report.recommendations.push('Address critical issues before proceeding to Phase 2');
    }
    
    if (report.issues.length === 0) {
      report.recommendations.push('Phase 1.2 is ready for Phase 2 implementation');
    }
  }

  generateReport(report: ValidationReport): string {
    return `
🎯 Phase 1.2 Validation Report
=============================
Timestamp: ${report.timestamp.toISOString()}
Overall Score: ${report.overallScore}%
Ready for Next Phase: ${report.readyForNextPhase ? 'YES' : 'NO'}

📊 Component Scores:
• Database Foundation: ${report.componentScores.database}%
• RBAC Foundation: ${report.componentScores.rbac}%
• Multi-Tenant Foundation: ${report.componentScores.multiTenant}%
• Audit Foundation: ${report.componentScores.audit}%
• Performance Targets: ${report.componentScores.performance}%
• End-to-End Integration: ${report.componentScores.endToEnd}%

${report.issues.length > 0 ? `⚠️ Issues Found:\n${report.issues.map(issue => `• ${issue}`).join('\n')}\n` : '✅ No issues found\n'}

💡 Recommendations:
${report.recommendations.map(rec => `• ${rec}`).join('\n')}

${report.readyForNextPhase ? '🎉 Phase 1.2 validation PASSED - Ready to proceed!' : '🔧 Phase 1.2 needs improvement before Phase 2'}
`;
  }
}
