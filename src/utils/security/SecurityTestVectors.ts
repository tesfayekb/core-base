
// Security test vectors and patterns
// Extracted from securityTesting.ts for better organization

// XSS test vectors
export const XSS_TEST_VECTORS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  'javascript:alert("XSS")',
  '<svg onload=alert("XSS")>',
  '<iframe src="javascript:alert(\'XSS\')"></iframe>',
  '<body onload=alert("XSS")>',
  '<div onclick=alert("XSS")>Click me</div>',
  '<a href="javascript:alert(\'XSS\')">Click</a>',
  '"><script>alert("XSS")</script>',
  '\';alert("XSS");//',
  '<object data="javascript:alert(\'XSS\')"></object>'
];

// SQL injection test vectors
export const SQL_INJECTION_TEST_VECTORS = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "'; DELETE FROM users WHERE 't'='t",
  "' UNION SELECT password FROM users--",
  "admin'--",
  "admin' OR 1=1--",
  "' OR 1=1#",
  "'; INSERT INTO users VALUES('hacker','pass');--",
  "1' AND 1=1",
  "1' OR 1=1",
  "'; EXEC xp_cmdshell('dir');--"
];
