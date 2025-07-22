import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { 
  Heart, 
  BarChart3, 
  AlertTriangle,
  Shield,
  Zap,
  Code,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity,
  File
} from 'lucide-react';
import { AIService } from '../services/api';
import { useCodeReview } from '../contexts/CodeReviewContext';

const HealthMetricsPage = () => {
  const { sessionId } = useCodeReview();
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [sortBy, setSortBy] = useState('complexity_score'); // complexity_score, maintainability_index, security_risk_level

  useEffect(() => {
    if (sessionId) {
      loadHealthData();
    }
  }, [sessionId]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      const data = await AIService.getHealthMetrics(sessionId);
      setHealthData(data);
      setError(null);
    } catch (err) {
      console.error('Health metrics load error:', err);
      if (err.response?.status === 404) {
        setError('No health metrics found. Please run comprehensive analysis first.');
      } else {
        setError('Failed to load health metrics');
      }
    } finally {
      setLoading(false);
    }
  };

  const getComplexityColor = (score) => {
    if (score <= 25) return 'bg-green-100 text-green-800 border-green-200';
    if (score <= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score <= 75) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getMaintainabilityColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (score >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHealthGrade = (complexity, maintainability, riskLevel) => {
    let score = 0;
    
    // Maintainability weight: 40%
    score += (maintainability / 100) * 40;
    
    // Complexity weight: 30% (inverted - lower is better)
    score += ((100 - complexity) / 100) * 30;
    
    // Security risk weight: 30%
    const riskScore = {
      'low': 30,
      'medium': 20,
      'high': 10,
      'critical': 0
    };
    score += riskScore[riskLevel?.toLowerCase()] || 15;
    
    if (score >= 80) return { grade: 'A', color: 'text-green-600' };
    if (score >= 70) return { grade: 'B', color: 'text-green-500' };
    if (score >= 60) return { grade: 'C', color: 'text-yellow-600' };
    if (score >= 50) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  const sortMetrics = (metrics) => {
    if (!metrics) return [];
    
    return [...metrics].sort((a, b) => {
      switch (sortBy) {
        case 'maintainability_index':
          return a.maintainability_index - b.maintainability_index; // ascending (worse first)
        case 'security_risk_level':
          const riskOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
          return (riskOrder[b.security_risk_level?.toLowerCase()] || 0) - 
                 (riskOrder[a.security_risk_level?.toLowerCase()] || 0);
        default: // complexity_score
          return b.complexity_score - a.complexity_score; // descending (worst first)
      }
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-600">Loading health metrics...</p>
          </div>
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
                <h3 className="font-semibold text-red-800">Error Loading Health Metrics</h3>
                <p className="text-red-600">{error}</p>
                <Button 
                  onClick={loadHealthData} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics, summary } = healthData;
  const sortedMetrics = sortMetrics(metrics);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Code Health Metrics</h1>
          <p className="text-slate-600 mt-1">
            Comprehensive analysis of code quality, complexity, and maintainability
          </p>
        </div>
        
        <Button onClick={loadHealthData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
            <Heart className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center py-2">
              <span className={summary?.overall_health_grade === 'A' ? 'text-green-600' : 
                             summary?.overall_health_grade === 'B' ? 'text-green-500' :
                             summary?.overall_health_grade === 'C' ? 'text-yellow-600' : 'text-red-600'}>
                {summary?.overall_health_grade || 'N/A'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Complexity</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.average_complexity?.toFixed(1) || 0}
            </div>
            <Progress value={summary?.average_complexity || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintainability</CardTitle>
            <Code className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.average_maintainability?.toFixed(1) || 0}%
            </div>
            <Progress value={summary?.average_maintainability || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk Files</CardTitle>
            <AlertTriangle className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.high_risk_files || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              of {summary?.total_files || 0} total files
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Health Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-2">
              <Button
                variant={sortBy === 'complexity_score' ? 'default' : 'outline'}
                onClick={() => setSortBy('complexity_score')}
                size="sm"
              >
                Sort by Complexity
              </Button>
              <Button
                variant={sortBy === 'maintainability_index' ? 'default' : 'outline'}
                onClick={() => setSortBy('maintainability_index')}
                size="sm"
              >
                Sort by Maintainability
              </Button>
              <Button
                variant={sortBy === 'security_risk_level' ? 'default' : 'outline'}
                onClick={() => setSortBy('security_risk_level')}
                size="sm"
              >
                Sort by Risk
              </Button>
            </div>
            
            <Badge variant="outline">
              {sortedMetrics.length} files analyzed
            </Badge>
          </div>

          {/* Heatmap Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedMetrics.map((metric, index) => {
              const healthGrade = getHealthGrade(
                metric.complexity_score, 
                metric.maintainability_index, 
                metric.security_risk_level
              );
              
              return (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedFile === metric ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedFile(metric)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm truncate" title={metric.file_path}>
                          {metric.file_path.split('/').pop()}
                        </h4>
                        <p className="text-xs text-slate-500 truncate">
                          {metric.file_path}
                        </p>
                      </div>
                      
                      <div className={`text-2xl font-bold ${healthGrade.color}`}>
                        {healthGrade.grade}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Complexity</span>
                        <Badge className={getComplexityColor(metric.complexity_score)}>
                          {metric.complexity_score}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span>Maintainability</span>
                        <Badge className={getMaintainabilityColor(metric.maintainability_index)}>
                          {metric.maintainability_index.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between text-xs">
                        <span>Security Risk</span>
                        <Badge className={getRiskColor(metric.security_risk_level)}>
                          {metric.security_risk_level || 'Unknown'}
                        </Badge>
                      </div>
                      
                      {metric.performance_issues > 0 && (
                        <div className="flex justify-between text-xs">
                          <span>Performance Issues</span>
                          <Badge variant="destructive">
                            {metric.performance_issues}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <File className="h-5 w-5" />
                    <span>{selectedFile.file_path.split('/').pop()}</span>
                  </CardTitle>
                  <p className="text-sm text-slate-600 mt-1">{selectedFile.file_path}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Health Score */}
              <div className="text-center py-4 bg-slate-50 rounded-lg">
                <div className={`text-6xl font-bold mb-2 ${
                  getHealthGrade(selectedFile.complexity_score, selectedFile.maintainability_index, selectedFile.security_risk_level).color
                }`}>
                  {getHealthGrade(selectedFile.complexity_score, selectedFile.maintainability_index, selectedFile.security_risk_level).grade}
                </div>
                <p className="text-slate-600">Overall Health Grade</p>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Complexity Score</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {selectedFile.complexity_score}
                    </div>
                    <Progress value={selectedFile.complexity_score} />
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedFile.complexity_score <= 25 ? 'Low complexity' :
                       selectedFile.complexity_score <= 50 ? 'Moderate complexity' :
                       selectedFile.complexity_score <= 75 ? 'High complexity' : 'Very high complexity'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Code className="h-4 w-4" />
                      <span>Maintainability</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {selectedFile.maintainability_index.toFixed(1)}%
                    </div>
                    <Progress value={selectedFile.maintainability_index} />
                    <p className="text-xs text-slate-600 mt-1">
                      {selectedFile.maintainability_index >= 80 ? 'Highly maintainable' :
                       selectedFile.maintainability_index >= 60 ? 'Moderately maintainable' :
                       selectedFile.maintainability_index >= 40 ? 'Difficult to maintain' : 'Very difficult to maintain'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Shield className="h-4 w-4" />
                      <span>Security Risk</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={`${getRiskColor(selectedFile.security_risk_level)} text-lg px-3 py-1`}>
                      {selectedFile.security_risk_level || 'Unknown'}
                    </Badge>
                    <p className="text-xs text-slate-600 mt-2">
                      Security vulnerability assessment
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Zap className="h-4 w-4" />
                      <span>Performance</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {selectedFile.performance_issues}
                    </div>
                    <p className="text-xs text-slate-600">
                      Performance issues detected
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Metrics */}
              <div className="space-y-3">
                <h4 className="font-semibold">Additional Metrics</h4>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Test Coverage</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={selectedFile.test_coverage} className="w-24" />
                    <span className="text-sm font-medium">{selectedFile.test_coverage.toFixed(1)}%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Code Duplication</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={selectedFile.code_duplication} className="w-24" />
                    <span className="text-sm font-medium">{selectedFile.code_duplication}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default HealthMetricsPage;