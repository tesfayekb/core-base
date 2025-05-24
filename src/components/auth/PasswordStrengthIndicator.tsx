
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: '', color: '' };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score <= 1) return { score: 20, label: 'Very Weak', color: 'bg-red-500' };
    if (score === 2) return { score: 40, label: 'Weak', color: 'bg-orange-500' };
    if (score === 3) return { score: 60, label: 'Fair', color: 'bg-yellow-500' };
    if (score === 4) return { score: 80, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-green-500' };
  };

  const strength = getPasswordStrength(password);

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Password strength:</span>
        <span className={`font-medium ${
          strength.score <= 40 ? 'text-red-600' :
          strength.score <= 60 ? 'text-orange-600' :
          strength.score <= 80 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {strength.label}
        </span>
      </div>
      <Progress value={strength.score} className="h-2" />
    </div>
  );
}
