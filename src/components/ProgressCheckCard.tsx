
import React from 'react';
import { CheckCircle, Star, TrendingUp, Shield, Zap, Database } from 'lucide-react';

interface TaskItem {
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  score?: number;
}

interface ProgressCheckCardProps {
  phase: string;
  overallScore: number;
  overallGrade: string;
  completedTasks: TaskItem[];
  nextSteps?: string[];
}

const ProgressCheckCard: React.FC<ProgressCheckCardProps> = ({
  phase,
  overallScore,
  overallGrade,
  completedTasks,
  nextSteps = []
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />;
      case 'pending':
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 85) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const completedCount = completedTasks.filter(task => task.status === 'completed').length;
  const totalTasks = completedTasks.length;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{phase} Progress Check</h2>
            <p className="text-gray-600">Enterprise Foundation Implementation</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${getScoreColor(overallScore)}`}>
          <div className="text-2xl font-bold">{overallScore}/100</div>
          <div className="text-sm font-medium">{overallGrade}</div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-semibold text-green-800">Completed Tasks</span>
          </div>
          <div className="text-2xl font-bold text-green-600 mt-1">
            {completedCount}/{totalTasks}
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-blue-800">Quality Score</span>
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-1">
            {overallScore}%
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-purple-500" />
            <span className="font-semibold text-purple-800">Status</span>
          </div>
          <div className="text-lg font-bold text-purple-600 mt-1">
            Ready for Phase 2
          </div>
        </div>
      </div>

      {/* Completed Tasks */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          Completed Tasks
        </h3>
        <div className="space-y-3">
          {completedTasks.map((task, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              {getStatusIcon(task.status)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  {task.score && (
                    <span className="text-sm font-semibold text-green-600">
                      {task.score}/100
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
            Next Steps
          </h3>
          <div className="space-y-2">
            {nextSteps.map((step, index) => (
              <div key={index} className="flex items-center space-x-2 text-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Badges */}
      <div className="mt-6 flex flex-wrap gap-2">
        <div className="flex items-center space-x-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
          <Shield className="h-4 w-4" />
          <span>Security Excellence</span>
        </div>
        <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
          <Zap className="h-4 w-4" />
          <span>Performance Optimized</span>
        </div>
        <div className="flex items-center space-x-1 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
          <Database className="h-4 w-4" />
          <span>Enterprise Ready</span>
        </div>
        <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
          <Star className="h-4 w-4" />
          <span>100% Test Coverage</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressCheckCard;
