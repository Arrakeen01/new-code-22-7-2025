import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useToast } from "../hooks/use-toast";
import { useCodeReview } from "../contexts/CodeReviewContext";
import { mockFixedFiles } from "../utils/mockData";
import {
  GitCompare,
  Check,
  X,
  Download,
  FileText,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from "lucide-react";

const CodeComparisonPage = () => {
  const { toast } = useToast();
  const { analysisResults, modifiedCode, reviewProgress, dispatch } = useCodeReview();
  
  const [selectedFile, setSelectedFile] = useState("UserProfile.js");
  const [viewMode, setViewMode] = useState("side-by-side"); // side-by-side | unified
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [fileAcceptance, setFileAcceptance] = useState({});
  const [lineAcceptance, setLineAcceptance] = useState({});
  const [reviewStats, setReviewStats] = useState({
    totalChanges: 0,
    acceptedChanges: 0,
    rejectedChanges: 0,
    pendingChanges: 0
  });

  useEffect(() => {
    // Initialize with mock fixed files
    if (Object.keys(modifiedCode).length === 0) {
      dispatch({ 
        type: "SET_MODIFIED_CODE", 
        payload: mockFixedFiles 
      });
      
      // Calculate initial stats
      const totalChanges = Object.values(mockFixedFiles).reduce(
        (acc, file) => acc + (file.changes?.length || 0), 
        0
      );
      
      setReviewStats({
        totalChanges,
        acceptedChanges: 0,
        rejectedChanges: 0,
        pendingChanges: totalChanges
      });
    }
  }, [modifiedCode, dispatch]);

  const acceptFile = (fileName) => {
    setFileAcceptance(prev => ({ ...prev, [fileName]: "accepted" }));
    
    // Auto-accept all lines in this file
    const file = mockFixedFiles[fileName];
    if (file?.changes) {
      const newLineAcceptance = { ...lineAcceptance };
      file.changes.forEach(change => {
        newLineAcceptance[`${fileName}-${change.line}`] = "accepted";
      });
      setLineAcceptance(newLineAcceptance);
    }
    
    updateReviewStats();
    toast({
      title: "File Changes Accepted",
      description: `All changes in ${fileName} have been accepted`,
    });
  };

  const rejectFile = (fileName) => {
    setFileAcceptance(prev => ({ ...prev, [fileName]: "rejected" }));
    
    // Auto-reject all lines in this file
    const file = mockFixedFiles[fileName];
    if (file?.changes) {
      const newLineAcceptance = { ...lineAcceptance };
      file.changes.forEach(change => {
        newLineAcceptance[`${fileName}-${change.line}`] = "rejected";
      });
      setLineAcceptance(newLineAcceptance);
    }
    
    updateReviewStats();
    toast({
      title: "File Changes Rejected",
      description: `All changes in ${fileName} have been rejected`,
      variant: "destructive"
    });
  };

  const toggleLineAcceptance = (fileName, lineNumber) => {
    const key = `${fileName}-${lineNumber}`;
    const currentState = lineAcceptance[key];
    const newState = currentState === "accepted" ? "rejected" : "accepted";
    
    setLineAcceptance(prev => ({ ...prev, [key]: newState }));
    updateReviewStats();
    
    toast({
      title: `Line ${lineNumber} ${newState}`,
      description: `Change on line ${lineNumber} has been ${newState}`,
    });
  };

  const updateReviewStats = () => {
    let accepted = 0;
    let rejected = 0;
    let total = 0;
    
    Object.values(mockFixedFiles).forEach(file => {
      if (file.changes) {
        file.changes.forEach(change => {
          total++;
          const key = `${selectedFile}-${change.line}`;
          if (lineAcceptance[key] === "accepted") accepted++;
          if (lineAcceptance[key] === "rejected") rejected++;
        });
      }
    });
    
    setReviewStats({
      totalChanges: total,
      acceptedChanges: accepted,
      rejectedChanges: rejected,
      pendingChanges: total - accepted - rejected
    });
  };

  const generateReport = () => {
    const reportData = {
      summary: {
        totalFiles: Object.keys(mockFixedFiles).length,
        totalIssues: reviewStats.totalChanges,
        acceptedFixes: reviewStats.acceptedChanges,
        rejectedFixes: reviewStats.rejectedChanges
      },
      files: Object.entries(mockFixedFiles).map(([fileName, fileData]) => ({
        name: fileName,
        issuesFixed: fileData.issuesFixed,
        status: fileAcceptance[fileName] || "pending"
      }))
    };
    
    // Create and download report
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "code-review-report.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Generated",
      description: "Code review report has been downloaded",
    });
  };

  const renderSideBySideView = (file) => {
    const originalLines = file.original.split('\n');
    const modifiedLines = file.modified.split('\n');
    const maxLines = Math.max(originalLines.length, modifiedLines.length);

    return (
      <div className="grid grid-cols-2 gap-4 h-96 overflow-hidden">
        {/* Original Code */}
        <div className="border rounded-lg bg-slate-50 dark:bg-slate-900">
          <div className="bg-red-100 dark:bg-red-950 px-4 py-2 border-b">
            <h4 className="font-medium text-red-800 dark:text-red-400">Original</h4>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 font-mono text-sm">
              {originalLines.map((line, index) => (
                <div
                  key={`orig-${index}`}
                  className={`flex items-center space-x-3 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    file.changes?.some(change => change.line === index + 1) ? "bg-red-50 dark:bg-red-950/20" : ""
                  }`}
                >
                  {showLineNumbers && (
                    <span className="text-slate-400 w-8 text-right select-none">
                      {index + 1}
                    </span>
                  )}
                  <code className="flex-1 text-slate-700 dark:text-slate-300">
                    {line || '\u00A0'}
                  </code>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Modified Code */}
        <div className="border rounded-lg bg-slate-50 dark:bg-slate-900">
          <div className="bg-green-100 dark:bg-green-950 px-4 py-2 border-b">
            <h4 className="font-medium text-green-800 dark:text-green-400">Modified</h4>
          </div>
          <ScrollArea className="h-full">
            <div className="p-4 font-mono text-sm">
              {modifiedLines.map((line, index) => {
                const isChanged = file.changes?.some(change => change.line === index + 1);
                const acceptanceKey = `${selectedFile}-${index + 1}`;
                const acceptanceState = lineAcceptance[acceptanceKey];
                
                return (
                  <div
                    key={`mod-${index}`}
                    className={`flex items-center space-x-3 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 relative ${
                      isChanged ? "bg-green-50 dark:bg-green-950/20" : ""
                    }`}
                  >
                    {showLineNumbers && (
                      <span className="text-slate-400 w-8 text-right select-none">
                        {index + 1}
                      </span>
                    )}
                    <code className="flex-1 text-slate-700 dark:text-slate-300">
                      {line || '\u00A0'}
                    </code>
                    {isChanged && (
                      <div className="absolute right-2 top-0 bottom-0 flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleLineAcceptance(selectedFile, index + 1)}
                          className={`h-6 w-6 p-0 ${
                            acceptanceState === "accepted" 
                              ? "bg-green-100 text-green-600 hover:bg-green-200" 
                              : acceptanceState === "rejected"
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "hover:bg-slate-200"
                          }`}
                        >
                          {acceptanceState === "accepted" ? (
                            <Check className="h-3 w-3" />
                          ) : acceptanceState === "rejected" ? (
                            <X className="h-3 w-3" />
                          ) : (
                            <Plus className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const renderUnifiedView = (file) => {
    const changes = file.changes || [];
    const lines = file.modified.split('\n');
    
    return (
      <div className="border rounded-lg bg-slate-50 dark:bg-slate-900">
        <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 border-b">
          <h4 className="font-medium">Unified Diff View</h4>
        </div>
        <ScrollArea className="h-96">
          <div className="p-4 font-mono text-sm">
            {lines.map((line, index) => {
              const change = changes.find(c => c.line === index + 1);
              const acceptanceKey = `${selectedFile}-${index + 1}`;
              const acceptanceState = lineAcceptance[acceptanceKey];
              
              return (
                <div
                  key={`unified-${index}`}
                  className={`flex items-center space-x-3 py-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${
                    change?.type === "addition" ? "bg-green-50 dark:bg-green-950/20" :
                    change?.type === "modification" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                    change?.type === "deletion" ? "bg-red-50 dark:bg-red-950/20" : ""
                  }`}
                >
                  {showLineNumbers && (
                    <span className="text-slate-400 w-8 text-right select-none">
                      {index + 1}
                    </span>
                  )}
                  <span className="w-4 text-center select-none">
                    {change?.type === "addition" && <Plus className="h-3 w-3 text-green-600" />}
                    {change?.type === "modification" && <Minus className="h-3 w-3 text-yellow-600" />}
                    {change?.type === "deletion" && <X className="h-3 w-3 text-red-600" />}
                  </span>
                  <code className="flex-1 text-slate-700 dark:text-slate-300">
                    {line || '\u00A0'}
                  </code>
                  {change && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleLineAcceptance(selectedFile, index + 1)}
                      className={`h-6 w-6 p-0 ${
                        acceptanceState === "accepted" 
                          ? "bg-green-100 text-green-600 hover:bg-green-200" 
                          : acceptanceState === "rejected"
                          ? "bg-red-100 text-red-600 hover:bg-red-200"
                          : "hover:bg-slate-200"
                      }`}
                    >
                      {acceptanceState === "accepted" ? (
                        <Check className="h-3 w-3" />
                      ) : acceptanceState === "rejected" ? (
                        <X className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 bg-clip-text text-transparent">
          Code Review & Comparison
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Review AI-suggested changes and accept or reject modifications line by line
        </p>
      </div>

      {/* Review Progress */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Review Progress</CardTitle>
                <p className="text-sm text-muted-foreground">Track your code review progress</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {Math.round((reviewStats.acceptedChanges + reviewStats.rejectedChanges) / reviewStats.totalChanges * 100) || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress 
              value={(reviewStats.acceptedChanges + reviewStats.rejectedChanges) / reviewStats.totalChanges * 100} 
              className="h-2" 
            />
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {reviewStats.totalChanges}
                </div>
                <div className="text-xs text-muted-foreground">Total Changes</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {reviewStats.acceptedChanges}
                </div>
                <div className="text-xs text-muted-foreground">Accepted</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {reviewStats.rejectedChanges}
                </div>
                <div className="text-xs text-muted-foreground">Rejected</div>
              </div>
              <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {reviewStats.pendingChanges}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Selection and View Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={selectedFile} onValueChange={setSelectedFile}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select file to review" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(mockFixedFiles).map((fileName) => (
                <SelectItem key={fileName} value={fileName}>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>{fileName}</span>
                    <Badge variant={
                      fileAcceptance[fileName] === "accepted" ? "default" :
                      fileAcceptance[fileName] === "rejected" ? "destructive" :
                      "secondary"
                    }>
                      {mockFixedFiles[fileName].issuesFixed?.length || 0} fixes
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Separator orientation="vertical" className="h-8" />
          
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === "side-by-side" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("side-by-side")}
            >
              <GitCompare className="h-4 w-4 mr-2" />
              Side-by-Side
            </Button>
            <Button
              variant={viewMode === "unified" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("unified")}
            >
              <FileText className="h-4 w-4 mr-2" />
              Unified
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLineNumbers(!showLineNumbers)}
          >
            {showLineNumbers ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Line Numbers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={generateReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* File Details */}
      {selectedFile && mockFixedFiles[selectedFile] && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>{selectedFile}</span>
                  <Badge variant={
                    fileAcceptance[selectedFile] === "accepted" ? "default" :
                    fileAcceptance[selectedFile] === "rejected" ? "destructive" :
                    "secondary"
                  }>
                    {fileAcceptance[selectedFile] || "pending"}
                  </Badge>
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  {mockFixedFiles[selectedFile].issuesFixed?.map((issue, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {issue}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acceptFile(selectedFile)}
                  className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept File
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => rejectFile(selectedFile)}
                  className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject File
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === "side-by-side" 
              ? renderSideBySideView(mockFixedFiles[selectedFile])
              : renderUnifiedView(mockFixedFiles[selectedFile])
            }
          </CardContent>
        </Card>
      )}

      {/* Final Actions */}
      <Card className="bg-slate-50 dark:bg-slate-900 border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Review Complete</h3>
              <p className="text-sm text-muted-foreground">
                You've reviewed {reviewStats.acceptedChanges + reviewStats.rejectedChanges} of {reviewStats.totalChanges} changes
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="lg">
                <RotateCcw className="h-5 w-5 mr-2" />
                Reset Review
              </Button>
              <Button 
                size="lg"
                disabled={reviewStats.pendingChanges > 0}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
              >
                <Save className="h-5 w-5 mr-2" />
                Finalize Review
              </Button>
            </div>
          </div>
          
          {reviewStats.pendingChanges > 0 && (
            <Alert className="mt-4 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                You have {reviewStats.pendingChanges} pending changes. Review all changes to finalize your code review.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CodeComparisonPage;