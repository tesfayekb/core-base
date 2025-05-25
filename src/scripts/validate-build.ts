
#!/usr/bin/env node
// CI/CD Validation Script
// Automated validation for build pipelines

import { cicdIntegration } from '../services/CICDIntegration';
import { integrationManager } from '../services/IntegrationManager';

interface BuildArgs {
  buildId?: string;
  branch?: string;
  commit?: string;
  threshold?: number;
  output?: 'console' | 'json' | 'junit';
}

async function main() {
  const args = parseArguments();
  
  try {
    console.log('🔍 Starting CI/CD validation...');
    
    // Initialize integration manager
    await integrationManager.initialize();
    
    // Set validation threshold if provided
    if (args.threshold) {
      cicdIntegration.updateConfig({ validationThreshold: args.threshold });
    }
    
    // Run validation
    const result = await cicdIntegration.runValidation({
      buildId: args.buildId || `build-${Date.now()}`,
      branch: args.branch || 'main',
      commit: args.commit || 'unknown'
    });
    
    // Output results
    await outputResults(result, args.output);
    
    // Check if build should be blocked
    if (cicdIntegration.shouldBlockBuild(result)) {
      console.error('❌ Build validation failed - blocking build');
      process.exit(1);
    }
    
    console.log('✅ Build validation passed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  } finally {
    await integrationManager.shutdown();
  }
}

function parseArguments(): BuildArgs {
  const args: BuildArgs = {};
  
  for (let i = 2; i < process.argv.length; i += 2) {
    const key = process.argv[i];
    const value = process.argv[i + 1];
    
    switch (key) {
      case '--build-id':
        args.buildId = value;
        break;
      case '--branch':
        args.branch = value;
        break;
      case '--commit':
        args.commit = value;
        break;
      case '--threshold':
        args.threshold = parseInt(value, 10);
        break;
      case '--output':
        args.output = value as 'console' | 'json' | 'junit';
        break;
    }
  }
  
  return args;
}

async function outputResults(result: any, format: string = 'console'): Promise<void> {
  switch (format) {
    case 'json':
      console.log(JSON.stringify(result, null, 2));
      break;
    case 'junit':
      await outputJUnitXML(result);
      break;
    default:
      outputConsole(result);
  }
}

function outputConsole(result: any): void {
  console.log('\n📊 Validation Results:');
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Score: ${result.score}%`);
  console.log(`Duration: ${result.duration}ms`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((error: string) => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.warnings.forEach((warning: string) => console.log(`  - ${warning}`));
  }
  
  if (result.blockers.length > 0) {
    console.log('\n🚫 Blockers:');
    result.blockers.forEach((blocker: string) => console.log(`  - ${blocker}`));
  }
}

async function outputJUnitXML(result: any): Promise<void> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="AI Context Validation" tests="1" failures="${result.passed ? 0 : 1}" time="${result.duration / 1000}">
    <testcase name="Implementation Validation" time="${result.duration / 1000}">
      ${!result.passed ? `<failure message="Validation failed with score ${result.score}%">${result.errors.join('\n')}</failure>` : ''}
    </testcase>
  </testsuite>
</testsuites>`;
  
  console.log(xml);
}

// Run if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}
