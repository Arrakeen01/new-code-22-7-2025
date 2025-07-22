import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Brain, 
  Network, 
  Heart, 
  MessageSquare, 
  FileText, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Activity
} from 'lucide-react';
import { AIService } from '../../services/api';
import { useCodeReview } from '../../contexts/CodeReviewContext';

const AIDashboard = () => {
  const { sessionId } = useCodeReview();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runningAnalysis, setRunningAnalysis] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadDashboardData();
    }
  }, [sessionId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AIService.getDashboard(sessionId);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const runComprehensiveAnalysis = async () => {
    try {
      setRunningAnalysis(true);
      const result = await AIService.runComprehensiveAnalysis(sessionId);
      
      if (result.status === 'completed') {
        // Reload dashboard data
        await loadDashboardData();
      }
    } catch (err) {
      console.error('Comprehensive analysis error:', err);
      setError('Failed to run comprehensive analysis');
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading AI Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Dashboard Error</h3>
                <p className="text-red-600">{error}</p>
                <Button 
                  onClick={loadDashboardData} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <h3 className="text-lg font-semibold mb-2">AI Analysis Not Started</h3>
            <p className="text-slate-600 mb-4">
              Run comprehensive AI analysis to see dashboard insights
            </p>
            <Button 
              onClick={runComprehensiveAnalysis}
              disabled={runningAnalysis}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {runningAnalysis ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Start AI Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { 
    session_info, 
    analysis_summary, 
    traceability_stats, 
    health_overview, 
    chat_activity 
  } = dashboardData;

  const overallScore = analysis_summary?.overallScore || 0;
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Analysis Dashboard</h1>
          <p className="text-slate-600 mt-1">
            Comprehensive code review and requirements analysis
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>Session: {session_info?.id?.substring(0, 8)}</span>
          </Badge>
          
          <Button 
            onClick={runComprehensiveAnalysis}
            disabled={runningAnalysis}
            variant="outline"
          >
            {runningAnalysis ? (
              <>
                <Activity className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Refresh Analysis
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Score */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </div>
              <Badge variant={getScoreBadgeVariant(overallScore)}>
                {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : 'Needs Work'}
              </Badge>
            </div>
            <Progress value={overallScore} className="mt-2" />
          </CardContent>
        </Card>

        {/* Traceability Coverage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Traceability</CardTitle>
            <Network className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {traceability_stats?.coverage_percentage?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {traceability_stats?.total_mappings || 0} mappings found
            </p>
            <Progress 
              value={traceability_stats?.coverage_percentage || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        {/* Code Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Code Health</CardTitle>
            <Heart className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analysis_summary?.healthScore?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {health_overview?.high_risk_files || 0} high-risk files
            </p>
            <Progress 
              value={analysis_summary?.healthScore || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        {/* Chat Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Assistant</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {chat_activity?.total_messages || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              {chat_activity?.assistant_available ? 'Available' : 'Unavailable'}
            </p>
            <div className="mt-2">
              <Badge variant={chat_activity?.assistant_available ? 'default' : 'secondary'}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Ready
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issues Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Issues Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {analysis_summary?.criticalIssues || 0}
                </div>
                <p className="text-sm text-red-700">Critical</p>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {analysis_summary?.highIssues || 0}
                </div>
                <p className="text-sm text-orange-700">High</p>
              </div>
              
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {analysis_summary?.mediumIssues || 0}
                </div>
                <p className="text-sm text-yellow-700">Medium</p>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {analysis_summary?.lowIssues || 0}
                </div>
                <p className="text-sm text-blue-700">Low</p>
              </div>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-sm text-slate-600">
                <strong>{analysis_summary?.totalFiles || 0}</strong> files analyzed, 
                <strong> {analysis_summary?.filesWithIssues || 0}</strong> with issues
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Health & Complexity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Code Health Metrics</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Average Complexity</span>
                <span className="text-sm text-slate-600">
                  {health_overview?.average_complexity?.toFixed(1) || 0}/100
                </span>
              </div>
              <Progress value={health_overview?.average_complexity || 0} />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Maintainability</span>
                <span className="text-sm text-slate-600">
                  {analysis_summary?.averageMaintainability?.toFixed(1) || 0}%
                </span>
              </div>
              <Progress value={analysis_summary?.averageMaintainability || 0} />
            </div>

            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Files Analyzed:</span>
                <span className="text-sm font-medium">{health_overview?.files_analyzed || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">High Risk Files:</span>
                <span className="text-sm font-medium">{health_overview?.high_risk_files || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex-col">
              <Network className="h-6 w-6 mb-2" />
              <span className="text-sm">View Traceability</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col">
              <Heart className="h-6 w-6 mb-2" />
              <span className="text-sm">Health Metrics</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col">
              <MessageSquare className="h-6 w-6 mb-2" />
              <span className="text-sm">Chat Assistant</span>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 flex-col">
              <FileText className="h-6 w-6 mb-2" />
              <span className="text-sm">Generate Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIDashboard;