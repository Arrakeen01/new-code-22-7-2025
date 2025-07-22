import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Input } from '../components/ui/input';
import { 
  Network, 
  Search, 
  Filter,
  ArrowRight,
  FileCode,
  BookOpen,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { AIService } from '../services/api';
import { useCodeReview } from '../contexts/CodeReviewContext';

const TraceabilityMatrixPage = () => {
  const { sessionId } = useCodeReview();
  const [traceabilityData, setTraceabilityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('all'); // all, high, medium, low
  const [selectedMapping, setSelectedMapping] = useState(null);

  useEffect(() => {
    if (sessionId) {
      loadTraceabilityData();
    }
  }, [sessionId]);

  const loadTraceabilityData = async () => {
    try {
      setLoading(true);
      const data = await AIService.getTraceabilityMatrix(sessionId);
      setTraceabilityData(data);
      setError(null);
    } catch (err) {
      console.error('Traceability load error:', err);
      if (err.response?.status === 404) {
        setError('No traceability data found. Please run comprehensive analysis first.');
      } else {
        setError('Failed to load traceability matrix');
      }
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceLabel = (score) => {
    if (score >= 0.8) return 'High';
    if (score >= 0.6) return 'Medium';
    return 'Low';
  };

  const filterMappings = (mappings) => {
    if (!mappings) return [];

    let filtered = mappings.filter(mapping => {
      const matchesSearch = searchTerm === '' || 
        mapping.requirement_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.code_element.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mapping.file_path.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesConfidence = confidenceFilter === 'all' ||
        (confidenceFilter === 'high' && mapping.confidence_score >= 0.8) ||
        (confidenceFilter === 'medium' && mapping.confidence_score >= 0.6 && mapping.confidence_score < 0.8) ||
        (confidenceFilter === 'low' && mapping.confidence_score < 0.6);

      return matchesSearch && matchesConfidence;
    });

    return filtered.sort((a, b) => b.confidence_score - a.confidence_score);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-slate-600">Loading traceability matrix...</p>
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
                <h3 className="font-semibold text-red-800">Error Loading Traceability Matrix</h3>
                <p className="text-red-600">{error}</p>
                <Button 
                  onClick={loadTraceabilityData} 
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

  const { mappings, statistics } = traceabilityData;
  const filteredMappings = filterMappings(mappings);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">SRS-to-Code Traceability Matrix</h1>
          <p className="text-slate-600 mt-1">
            AI-generated mapping between requirements and code implementation
          </p>
        </div>
        
        <Button onClick={loadTraceabilityData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Mappings</CardTitle>
            <Network className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statistics?.total_mappings || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Requirements mapped to code
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            <TrendingUp className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics?.coverage_percentage?.toFixed(1) || 0}%
            </div>
            <Progress value={statistics?.coverage_percentage || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {statistics?.high_confidence_mappings || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Confidence score ≥ 80%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Requirements</CardTitle>
            <BookOpen className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {statistics?.unique_requirements || 0}
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Distinct requirements found
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters & Search</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search requirements, code elements, or files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant={confidenceFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setConfidenceFilter('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={confidenceFilter === 'high' ? 'default' : 'outline'}
                onClick={() => setConfidenceFilter('high')}
                size="sm"
              >
                High Confidence
              </Button>
              <Button
                variant={confidenceFilter === 'medium' ? 'default' : 'outline'}
                onClick={() => setConfidenceFilter('medium')}
                size="sm"
              >
                Medium
              </Button>
              <Button
                variant={confidenceFilter === 'low' ? 'default' : 'outline'}
                onClick={() => setConfidenceFilter('low')}
                size="sm"
              >
                Low
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Traceability Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>
            Traceability Mappings ({filteredMappings.length} of {mappings?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-0">
            {filteredMappings.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Network className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No mappings found matching your criteria.</p>
              </div>
            ) : (
              filteredMappings.map((mapping, index) => (
                <div
                  key={index}
                  className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMapping(mapping)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      {/* Requirement */}
                      <div className="flex items-start space-x-3">
                        <BookOpen className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {mapping.requirement_id}
                            </Badge>
                            <Badge 
                              className={`text-xs ${getConfidenceColor(mapping.confidence_score)}`}
                            >
                              {getConfidenceLabel(mapping.confidence_score)} 
                              ({(mapping.confidence_score * 100).toFixed(0)}%)
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 font-medium">
                            {mapping.requirement_text}
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                      </div>

                      {/* Code Implementation */}
                      <div className="flex items-start space-x-3">
                        <FileCode className="h-4 w-4 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {mapping.element_type}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              Line {mapping.line_number}
                            </span>
                          </div>
                          <p className="text-sm text-slate-700 font-mono">
                            <span className="font-medium">{mapping.code_element}</span>
                            <span className="text-slate-500"> in </span>
                            <span className="text-blue-600">{mapping.file_path}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Score Visual */}
                    <div className="ml-4 text-right">
                      <div className="w-16 h-16 relative">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="2"
                          />
                          <path
                            d="M18 2.0845
                              a 15.9155 15.9155 0 0 1 0 31.831
                              a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={mapping.confidence_score >= 0.8 ? "#10b981" : mapping.confidence_score >= 0.6 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="2"
                            strokeDasharray={`${mapping.confidence_score * 100}, 100`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-semibold">
                            {(mapping.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Mapping Detail Modal */}
      {selectedMapping && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Mapping Details</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMapping(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Requirement</h4>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <Badge variant="outline" className="mb-2">
                    {selectedMapping.requirement_id}
                  </Badge>
                  <p className="text-sm">{selectedMapping.requirement_text}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Code Implementation</h4>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Badge variant="secondary">
                      {selectedMapping.element_type}
                    </Badge>
                    <span className="text-sm text-slate-600">
                      {selectedMapping.file_path}:{selectedMapping.line_number}
                    </span>
                  </div>
                  <p className="text-sm font-mono">{selectedMapping.code_element}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Confidence Analysis</h4>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Progress value={selectedMapping.confidence_score * 100} />
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {(selectedMapping.confidence_score * 100).toFixed(1)}%
                    </div>
                    <Badge className={getConfidenceColor(selectedMapping.confidence_score)}>
                      {getConfidenceLabel(selectedMapping.confidence_score)}
                    </Badge>
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

export default TraceabilityMatrixPage;