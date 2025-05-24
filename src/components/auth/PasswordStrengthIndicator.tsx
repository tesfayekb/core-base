
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
}

interface PasswordCheck {
  label: string;
  met: boolean;
  description: string;
}

export function PasswordStrengthIndicator({ password, showDetails = true }: PasswordStrengthIndicatorProps) {
  const getPasswordChecks = (password: string): PasswordCheck[] => {
    return [
      {
        label: 'At least 8 characters',
        met: password.length >= 8,
        description: 'Minimum 8 characters required'
      },
      {
        label: 'Contains lowercase letter',
        met: /[a-z]/.test(password),
        description: 'Include at least one lowercase letter (a-z)'
      },
      {
        label: 'Contains uppercase letter',
        met: /[A-Z]/.test(password),
        description: 'Include at least one uppercase letter (A-Z)'
      },
      {
        label: 'Contains number',
        met: /\d/.test(password),
        description: 'Include at least one number (0-9)'
      },
      {
        label: 'Contains special character',
        met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        description: 'Include at least one special character (!@#$%^&*)'
      },
      {
        label: 'No common patterns',
        met: !isCommonPattern(password),
        description: 'Avoid common patterns like "123", "abc", or repeated characters'
      }
    ];
  };

  const isCommonPattern = (password: string): boolean => {
    const commonPatterns = [
      /123456/,
      /abcdef/,
      /qwerty/,
      /password/i,
      /(.)\1{2,}/, // repeated characters
      /012345/,
      /987654/
    ];
    
    return commonPatterns.some(pattern => pattern.test(password));
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '', textColor: '' };
    
    const checks = getPasswordChecks(password);
    const metChecks = checks.filter(check => check.met).length;
    const score = Math.round((metChecks / checks.length) * 100);
    
    if (score < 33) return { 
      score, 
      label: 'Weak', 
      color: 'bg-red-500',
      textColor: 'text-red-600'
    };
    if (score < 66) return { 
      score, 
      label: 'Fair', 
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    };
    if (score < 83) return { 
      score, 
      label: 'Good', 
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    };
    return { 
      score, 
      label: 'Strong', 
      color: 'bg-green-500',
      textColor: 'text-green-600'
    };
  };

  const strength = getPasswordStrength(password);
  const checks = getPasswordChecks(password);

  if (!password) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">Password strength:</span>
        <span className={`font-medium ${strength.textColor}`}>
          {strength.label}
        </span>
      </div>
      
      <Progress value={strength.score} className="h-2" />
      
      {showDetails && (
        <div className="space-y-2">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {check.met ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <XCircle className="h-3 w-3 text-red-500" />
              )}
              <span className={check.met ? 'text-green-600' : 'text-red-600'}>
                {check.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
