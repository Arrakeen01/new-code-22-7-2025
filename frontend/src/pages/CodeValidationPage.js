import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { useCodeReview } from "../contexts/CodeReviewContext";
import { 
  mockChecklist, 
  mockAnalysisResults, 
  generateMockChecklist 
} from "../utils/mockData";
import {
  CheckSquare,
  AlertTriangle,
  Shield,
  Zap,
  Settings,
  FileText,
  Bug,
  Wrench,
  ArrowRight,
  Play,
  Loader2,
  ChevronDown,
  ChevronRight,
  Code,
  AlertCircle,
  CheckCircle,
  Clock,
  Bot
} from "lucide-react";

const CodeValidationPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    uploadedFiles, 
    analysisResults, 
    checklist, 
    selectedModel,
    isAnalyzing,
    dispatch 
  } = useCodeReview();

  const [activeTab, setActiveTab] = useState("checklist");
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [fixingIssues, setFixingIssues] = useState(new Set());

  // Available AI models
  const availableModels = [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", description: "Most capable model for code analysis" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", description: "Faster, cost-effective" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", description: "Excellent for code review" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", description: "Great with file attachments" },
    { id: "deepseek-coder", name: "DeepSeek Coder", provider: "DeepSeek", description: "Specialized for coding" },
    { id: "llama-3.2", name: "Llama 3.2", provider: "Ollama", description: "Open-source alternative" }
  ];

  useEffect(() => {
    if (uploadedFiles.codeFiles.length === 0 || uploadedFiles.srsFiles.length === 0) {
      navigate("/");
      return;
    }

    // Generate checklist if not already done
    if (checklist.length === 0) {
      const generatedChecklist = generateMockChecklist(uploadedFiles.srsFiles);
      dispatch({ type: "SET_CHECKLIST", payload: generatedChecklist });
    }
  }, [uploadedFiles, checklist, navigate, dispatch]);

  const startAnalysis = async () => {
    dispatch({ type: "SET_ANALYZING", payload: true });
    setAnalysisProgress(0);

    try {
      // Simulate analysis progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + Math.random() * 15;
        });
      }, 500);

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Set mock results
      dispatch({ type: "SET_ANALYSIS_RESULTS", payload: mockAnalysisResults });
      dispatch({ 
        type: "UPDATE_REVIEW_PROGRESS", 
        payload: {
          totalIssues: mockAnalysisResults.summary.totalIssues,
          filesModified: 0,
          issuesFixed: 0,
          changesReviewed: 0
        }
      });

      clearInterval(progressInterval);
      setAnalysisProgress(100);

      toast({
        title: "Analysis Complete",
        description: `Found ${mockAnalysisResults.summary.totalIssues} issues across ${mockAnalysisResults.summary.filesWithIssues} files`,
      });

    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Something went wrong during analysis. Please try again.",
        variant: "destructive"
      });
    }
  };

  const toggleFileExpansion = (fileName) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileName)) {
      newExpanded.delete(fileName);
    } else {
      newExpanded.add(fileName);
    }
    setExpandedFiles(newExpanded);
  };

  const autoFixIssue = async (fileIssue, issueId) => {
    const key = `${fileIssue.name}-${issueId}`;
    setFixingIssues(prev => new Set([...prev, key]));

    // Simulate fixing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    setFixingIssues(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });

    toast({
      title: "Issue Fixed",
      description: `Fixed ${fileIssue.name} issue on line ${issueId}`,
    });
  };

  const proceedToComparison = () => {
    navigate("/comparison");
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical": return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950";
      case "high": return "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-950";
      case "medium": return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950";
      case "low": return "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950";
      default: return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-950";
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case "critical": return <AlertTriangle className="h-4 w-4" />;
      case "high": return <AlertCircle className="h-4 w-4" />;
      case "medium": return <Clock className="h-4 w-4" />;
      case "low": return <CheckCircle className="h-4 w-4" />;
      default: return <Bug className="h-4 w-4" />;
    }
  };

  const renderFileStructure = (items, depth = 0) => {
    return items.map((item, index) => {
      const hasIssues = item.issues && item.issues.length > 0;
      const isExpanded = expandedFiles.has(item.name);

      if (item.type === "folder") {
        return (
          <div key={`${item.name}-${depth}`} className="space-y-1">
            <div
              className="flex items-center space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"
              onClick={() => toggleFileExpansion(item.name)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
              <div className="p-1 rounded bg-blue-100 dark:bg-blue-900">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300" style={{ marginLeft: `${depth * 16}px` }}>
                {item.name}
              </span>
            </div>
            {isExpanded && item.children && (
              <div className="ml-4">
                {renderFileStructure(item.children, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={`${item.name}-${depth}`} className="space-y-2">
          <div
            className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
              hasIssues
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 hover:shadow-md"
                : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750"
            }`}
            style={{ marginLeft: `${depth * 16}px` }}
          >
            <div className="flex items-center space-x-3 flex-1">
              <div className={`p-1 rounded ${hasIssues ? "bg-red-100 dark:bg-red-900" : "bg-green-100 dark:bg-green-900"}`}>
                <Code className={`h-4 w-4 ${hasIssues ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {item.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {item.language}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(item.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {hasIssues && (
                <div className="flex items-center space-x-2">
                  <Badge variant="destructive" className="text-xs">
                    {item.issues.length} issues
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFileExpansion(item.name)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {hasIssues && isExpanded && (
            <div className="ml-8 space-y-2">
              {item.issues
                .filter(issue => selectedSeverity === "all" || issue.severity.toLowerCase() === selectedSeverity)
                .map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 border rounded-lg bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(issue.severity)}
                          <Badge className={`text-xs px-2 py-1 ${getSeverityColor(issue.severity)}`}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Line {issue.line}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {issue.type}
                          </Badge>
                        </div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          {issue.message}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {issue.description}
                        </p>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded border-l-4 border-blue-500">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                            💡 Suggestion: {issue.suggestion}
                          </p>
                        </div>
                      </div>
                      {issue.autoFixable && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => autoFixIssue(item, issue.line)}
                          disabled={fixingIssues.has(`${item.name}-${issue.line}`)}
                          className="ml-4 hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-950"
                        >
                          {fixingIssues.has(`${item.name}-${issue.line}`) ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Fixing...
                            </>
                          ) : (
                            <>
                              <Wrench className="h-4 w-4 mr-2" />
                              Auto Fix
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      );
    });
  };

  if (uploadedFiles.codeFiles.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          AI Code Analysis Dashboard
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Review AI-generated checklist and analyze your code for potential issues
        </p>
      </div>

      {/* Model Selection & Analysis Controls */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>AI Model Configuration</CardTitle>
                <p className="text-sm text-muted-foreground">Choose the AI model for code analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select 
                value={selectedModel} 
                onValueChange={(value) => dispatch({ type: "SET_SELECTED_MODEL", payload: value })}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select AI Model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col">
                        <div className="font-medium">{model.name}</div>
                        <div className="text-xs text-muted-foreground">{model.provider} • {model.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {!analysisResults ? (
            <div className="space-y-4">
              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Analyzing code with {availableModels.find(m => m.id === selectedModel)?.name}...</span>
                    <span className="text-sm text-muted-foreground">{Math.round(analysisProgress)}%</span>
                  </div>
                  <Progress value={analysisProgress} className="h-2" />
                </div>
              )}
              
              <Button
                onClick={startAnalysis}
                disabled={isAnalyzing}
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Analyzing Code...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Start AI Analysis
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analysisResults.summary.criticalIssues}
                </div>
                <div className="text-sm text-muted-foreground">Critical Issues</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {analysisResults.summary.highIssues}
                </div>
                <div className="text-sm text-muted-foreground">High Priority</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {analysisResults.summary.mediumIssues}
                </div>
                <div className="text-sm text-muted-foreground">Medium Priority</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analysisResults.summary.overallScore}%
                </div>
                <div className="text-sm text-muted-foreground">Code Quality</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="checklist" className="flex items-center space-x-2">
            <CheckSquare className="h-4 w-4" />
            <span>AI Generated Checklist</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center space-x-2" disabled={!analysisResults}>
            <Bug className="h-4 w-4" />
            <span>Code Analysis Results</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklist" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Quality Assurance Checklist</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                AI-generated checklist based on your SRS documents and best practices
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all duration-200 bg-white dark:bg-slate-800"
                  >
                    <div className="flex items-start space-x-4">
                      <Checkbox
                        id={item.id}
                        checked={item.checked}
                        onCheckedChange={(checked) =>
                          dispatch({
                            type: "UPDATE_CHECKLIST_ITEM",
                            payload: {
                              id: item.id,
                              updates: { checked }
                            }
                          })
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center space-x-3">
                          <Badge className={getSeverityColor(item.severity)}>
                            {item.severity}
                          </Badge>
                          <Badge variant="outline">{item.category}</Badge>
                          {item.automated && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
                              <Settings className="h-3 w-3 mr-1" />
                              Automated
                            </Badge>
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                        <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-1">
                          {item.items.map((subItem, index) => (
                            <li key={index} className="flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              <span>{subItem}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Analysis Results
            </h2>
            <div className="flex items-center space-x-4">
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical Only</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>File Structure & Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {analysisResults && renderFileStructure(analysisResults.fileStructure)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proceed Button */}
      {analysisResults && (
        <div className="text-center">
          <Button
            onClick={proceedToComparison}
            size="lg"
            className="px-8 py-3 text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Review Code Changes
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default CodeValidationPage;