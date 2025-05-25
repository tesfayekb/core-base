
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SecurityTester, SecurityTestResult } from '@/utils/securityTesting';
import { validateAllApplicationForms } from '@/services/formValidationService';
import { Shield, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export function SecurityTestDashboard() {
  const [testResults, setTestResults] = useState<{
    summary: {
      totalTests: number;
      vulnerabilitiesFound: number;
      preventionRate: number;
    };
    xssResults: SecurityTestResult[];
    sqlResults: SecurityTestResult[];
    formValidation: {
      formsValidated: string[];
      securityIssues: string[];
      recommendations: string[];
    };
  } | null>(null);
  
  const [isRunning, setIsRunning] = useState(false);

  const runSecurityTests = async () => {
    setIsRunning(true);
    
    try {
      // Run comprehensive security tests
      const securityReport = SecurityTester.generateSecurityReport();
      const formValidationReport = await validateAllApplicationForms();
      
      setTestResults({
        summary: securityReport.summary,
        xssResults: securityReport.xssResults,
        sqlResults: securityReport.sqlResults,
        formValidation: formValidationReport
      });
    } catch (error) {
      console.error('Security test failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Auto-run tests on component mount
    runSecurityTests();
  }, []);

  const getSecurityBadge = (isPrevented: boolean) => (
    <Badge variant={isPrevented ? "default" : "destructive"} className="ml-2">
      {isPrevented ? (
        <><CheckCircle className="w-3 h-3 mr-1" /> Prevented</>
      ) : (
        <><XCircle className="w-3 h-3 mr-1" /> Vulnerable</>
      )}
    </Badge>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Security Test Dashboard</h2>
        </div>
        <Button onClick={runSecurityTests} disabled={isRunning}>
          {isRunning ? 'Running Tests...' : 'Run Security Tests'}
        </Button>
      </div>

      {testResults && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Test Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{testResults.summary.totalTests}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${testResults.summary.vulnerabilitiesFound === 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {testResults.summary.vulnerabilitiesFound}
                  </div>
                  <div className="text-sm text-muted-foreground">Vulnerabilities Found</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${testResults.summary.preventionRate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {testResults.summary.preventionRate}%
                  </div>
                  <div className="text-sm text-muted-foreground">Prevention Rate</div>
                </div>
              </div>
              
              {testResults.summary.vulnerabilitiesFound > 0 && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {testResults.summary.vulnerabilitiesFound} potential vulnerabilities detected. Review the detailed results below.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* XSS Prevention Results */}
          <Card>
            <CardHeader>
              <CardTitle>XSS Prevention Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {testResults.xssResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {result.inputVector.length > 50 
                          ? result.inputVector.substring(0, 50) + '...'
                          : result.inputVector
                        }
                      </code>
                    </div>
                    {getSecurityBadge(result.isPrevented)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* SQL Injection Prevention Results */}
          <Card>
            <CardHeader>
              <CardTitle>SQL Injection Prevention Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {testResults.sqlResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex-1">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {result.inputVector}
                      </code>
                    </div>
                    {getSecurityBadge(result.isPrevented)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Form Validation Status */}
          <Card>
            <CardHeader>
              <CardTitle>Form Validation Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Forms Validated:</h4>
                  <div className="flex gap-2 flex-wrap">
                    {testResults.formValidation.formsValidated.map((form, index) => (
                      <Badge key={index} variant="outline">{form}</Badge>
                    ))}
                  </div>
                </div>
                
                {testResults.formValidation.securityIssues.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-red-600">Security Issues:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {testResults.formValidation.securityIssues.map((issue, index) => (
                        <li key={index} className="text-sm text-red-600">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium mb-2">Recommendations:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {testResults.formValidation.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
