
// Phase 1.2 Validation Dashboard Component
// Real-time validation status display

import React, { useState, useEffect } from 'react';
import { phase1ValidationRunner, ValidationReport } from './Phase1ValidationRunner';

interface ValidationComponentProps {
  report: ValidationReport | null;
  isRunning: boolean;
  onRunValidation: () => void;
}

export const ValidationDashboard: React.FC<ValidationComponentProps> = ({ 
  report, 
  isRunning, 
  onRunValidation 
}) => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Phase 1.2 Validation Dashboard
        </h1>
        <button
          onClick={onRunValidation}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg font-medium ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? 'Running...' : 'Run Validation'}
        </button>
      </div>

      {report && (
        <>
          <ScoreOverview report={report} />
          <ComponentScores report={report} />
          <IssuesAndRecommendations report={report} />
        </>
      )}
    </div>
  );
};

const ScoreOverview: React.FC<{ report: ValidationReport }> = ({ report }) => {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (ready: boolean) => {
    return ready ? (
      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
        Ready for Phase 2
      </span>
    ) : (
      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
        Needs Improvement
      </span>
    );
  };

  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Overall Score</h2>
          <div className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
            {report.overallScore}%
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600 mb-2">
            Last run: {report.timestamp.toLocaleString()}
          </div>
          {getStatusBadge(report.readyForNextPhase)}
        </div>
      </div>
    </div>
  );
};

const ComponentScores: React.FC<{ report: ValidationReport }> = ({ report }) => {
  const components = [
    { key: 'database', label: 'Database Foundation', icon: '🗄️' },
    { key: 'rbac', label: 'RBAC Foundation', icon: '🔐' },
    { key: 'multiTenant', label: 'Multi-Tenant Foundation', icon: '🏢' },
    { key: 'audit', label: 'Audit Foundation', icon: '📝' },
    { key: 'performance', label: 'Performance Targets', icon: '⚡' },
    { key: 'endToEnd', label: 'End-to-End Integration', icon: '🔄' }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Component Scores</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {components.map(({ key, label, icon }) => {
          const score = report.componentScores[key as keyof typeof report.componentScores];
          return (
            <div key={key} className="p-4 border rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-xl mr-2">{icon}</span>
                <span className="font-medium text-gray-900">{label}</span>
              </div>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                  <div
                    className={`h-2 rounded-full ${getScoreColor(score)}`}
                    style={{ width: `${score}%` }}
                  />
                </div>
                <span className="font-medium">{score}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const IssuesAndRecommendations: React.FC<{ report: ValidationReport }> = ({ report }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Issues Found</h2>
        {report.issues.length > 0 ? (
          <ul className="space-y-2">
            {report.issues.map((issue, index) => (
              <li key={index} className="flex items-start">
                <span className="text-red-500 mr-2">⚠️</span>
                <span className="text-gray-700">{issue}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-green-600 flex items-center">
            <span className="mr-2">✅</span>
            No issues found
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h2>
        <ul className="space-y-2">
          {report.recommendations.map((recommendation, index) => (
            <li key={index} className="flex items-start">
              <span className="text-blue-500 mr-2">💡</span>
              <span className="text-gray-700">{recommendation}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ValidationDashboard;
