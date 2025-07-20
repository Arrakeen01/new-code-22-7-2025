import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useToast } from "../hooks/use-toast";
import { useCodeReview } from "../contexts/CodeReviewContext";
import {
  Upload,
  File,
  FileText,
  FolderOpen,
  X,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Code2,
  FileCode,
  Archive
} from "lucide-react";

const FileUploadPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { uploadedFiles, dispatch } = useCodeReview();
  
  const [dragActive, setDragActive] = useState({ code: false, srs: false });
  const [uploadProgress, setUploadProgress] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);

  // File type configurations
  const codeFileTypes = [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".php", ".rb", ".go", ".rs", ".swift", ".kt"];
  const srsFileTypes = [".pdf", ".doc", ".docx", ".md", ".txt"];
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const maxCodeFiles = 100;
  const maxSrsFiles = 10;

  // Drag and drop handlers
  const handleDrag = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [type]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [type]: false }));
    }
  }, []);

  const handleDrop = useCallback((e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files, type);
  }, []);

  // File validation
  const validateFile = (file, type) => {
    const errors = [];
    
    if (file.size > maxFileSize) {
      errors.push(`File "${file.name}" exceeds 50MB limit`);
    }

    const allowedTypes = type === "code" ? codeFileTypes : srsFileTypes;
    const fileExtension = "." + file.name.split(".").pop().toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(`File "${file.name}" has unsupported format. Allowed: ${allowedTypes.join(", ")}`);
    }

    return errors;
  };

  // File upload handler
  const handleFileUpload = async (files, type) => {
    const errors = [];
    const validFiles = [];

    // Check file count limits
    const currentFiles = uploadedFiles[type === "code" ? "codeFiles" : "srsFiles"];
    const maxFiles = type === "code" ? maxCodeFiles : maxSrsFiles;
    
    if (currentFiles.length + files.length > maxFiles) {
      errors.push(`Cannot upload more than ${maxFiles} ${type} files`);
    }

    // Validate each file
    files.forEach(file => {
      const fileErrors = validateFile(file, type);
      if (fileErrors.length === 0) {
        validFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified,
          content: null, // Will be populated when read
          file: file
        });
      } else {
        errors.push(...fileErrors);
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    // Simulate file processing with progress
    for (let file of validFiles) {
      setUploadProgress(prev => ({ ...prev, [file.id]: 0 }));
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev[file.id] || 0;
          if (currentProgress >= 100) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [file.id]: Math.min(currentProgress + 10, 100) };
        });
      }, 100);

      // Read file content for code files
      if (type === "code") {
        try {
          const content = await readFileContent(file.file);
          file.content = content;
        } catch (error) {
          console.error("Error reading file:", error);
        }
      }
    }

    // Update state
    const fileType = type === "code" ? "codeFiles" : "srsFiles";
    const updatedFiles = {
      ...uploadedFiles,
      [fileType]: [...uploadedFiles[fileType], ...validFiles]
    };

    dispatch({
      type: "SET_UPLOADED_FILES",
      payload: updatedFiles
    });

    toast({
      title: "Files uploaded successfully",
      description: `${validFiles.length} ${type} file(s) processed`,
    });

    setValidationErrors([]);
  };

  // Read file content
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Remove file
  const removeFile = (fileId, type) => {
    const fileType = type === "code" ? "codeFiles" : "srsFiles";
    const updatedFiles = {
      ...uploadedFiles,
      [fileType]: uploadedFiles[fileType].filter(file => file.id !== fileId)
    };

    dispatch({
      type: "SET_UPLOADED_FILES",
      payload: updatedFiles
    });

    // Remove from upload progress
    setUploadProgress(prev => {
      const { [fileId]: removed, ...rest } = prev;
      return rest;
    });
  };

  // Clear all files
  const clearAllFiles = (type) => {
    const fileType = type === "code" ? "codeFiles" : "srsFiles";
    const updatedFiles = {
      ...uploadedFiles,
      [fileType]: []
    };

    dispatch({
      type: "SET_UPLOADED_FILES",
      payload: updatedFiles
    });
  };

  // Proceed to analysis
  const proceedToAnalysis = () => {
    navigate("/validation");
  };

  // Download files as zip
  const downloadFilesAsZip = async () => {
    if (!uploadedFiles.codeFiles.length && !uploadedFiles.srsFiles.length) {
      toast({
        title: "No Files to Download",
        description: "Please upload some files first",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create a session ID if not exists
      const sessionId = "temp_session_" + Date.now();
      
      // Create download URL
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const downloadUrl = `${backendUrl}/api/files/download-zip/${sessionId}`;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `uploaded_files_${sessionId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: "Your files are being downloaded as a zip file",
      });
    } catch (error) {
      toast({
        title: "Download Failed", 
        description: "Could not download files. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Check if can proceed
  const canProceed = uploadedFiles.codeFiles.length > 0 && uploadedFiles.srsFiles.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Upload Your Files
        </h1>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Upload your source code and SRS documents to begin code analysis
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {validationErrors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Code Files Upload */}
        <Card className="border hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Code2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <CardTitle className="text-lg">Source Code Files</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Upload your project source files
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive.code
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                  : "border-slate-300 dark:border-slate-600 hover:border-blue-400"
              }`}
              onDragEnter={(e) => handleDrag(e, "code")}
              onDragLeave={(e) => handleDrag(e, "code")}
              onDragOver={(e) => handleDrag(e, "code")}
              onDrop={(e) => handleDrop(e, "code")}
              onClick={() => document.getElementById("codeFileInput").click()}
            >
              <input
                id="codeFileInput"
                type="file"
                multiple
                accept={codeFileTypes.join(",")}
                onChange={(e) => handleFileUpload(Array.from(e.target.files), "code")}
                className="hidden"
              />
              
              <div className="space-y-3">
                <Archive className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">
                    Drag & Drop Files Here
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    or click to browse
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {codeFileTypes.slice(0, 6).map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                  {codeFileTypes.length > 6 && (
                    <Badge variant="secondary" className="text-xs">
                      +{codeFileTypes.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.codeFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">
                    Uploaded Files ({uploadedFiles.codeFiles.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAllFiles("code")}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {uploadedFiles.codeFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border shadow-sm"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <FileCode className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        {uploadProgress[file.id] !== undefined && uploadProgress[file.id] < 100 ? (
                          <Progress value={uploadProgress[file.id]} className="w-16" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id, "code")}
                        className="ml-2 h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SRS Files Upload */}
        <Card className="border hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <CardTitle className="text-lg">SRS Documents</CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Upload requirement documents
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                dragActive.srs
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-slate-300 dark:border-slate-600 hover:border-green-400"
              }`}
              onDragEnter={(e) => handleDrag(e, "srs")}
              onDragLeave={(e) => handleDrag(e, "srs")}
              onDragOver={(e) => handleDrag(e, "srs")}
              onDrop={(e) => handleDrop(e, "srs")}
              onClick={() => document.getElementById("srsFileInput").click()}
            >
              <input
                id="srsFileInput"
                type="file"
                multiple
                accept={srsFileTypes.join(",")}
                onChange={(e) => handleFileUpload(Array.from(e.target.files), "srs")}
                className="hidden"
              />
              
              <div className="space-y-3">
                <FileText className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto" />
                <div>
                  <h3 className="font-medium text-slate-900 dark:text-slate-100">
                    Drag & Drop Documents
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    or click to browse
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {srsFileTypes.map(type => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.srsFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100">
                    Uploaded Documents ({uploadedFiles.srsFiles.length})
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearAllFiles("srs")}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    Clear All
                  </Button>
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {uploadedFiles.srsFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border shadow-sm"
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <File className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        {uploadProgress[file.id] !== undefined && uploadProgress[file.id] < 100 ? (
                          <Progress value={uploadProgress[file.id]} className="w-16" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id, "srs")}
                        className="ml-2 h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {(uploadedFiles.codeFiles.length > 0 || uploadedFiles.srsFiles.length > 0) && (
          <Button
            onClick={downloadFilesAsZip}
            variant="outline"
            className="px-6 py-2"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All Files
          </Button>
        )}
        
        <Button
          onClick={proceedToAnalysis}
          disabled={!canProceed}
          className={`px-6 py-2 ${
            canProceed
              ? "bg-blue-600 hover:bg-blue-700 text-white"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          Start Analysis
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      {!canProceed && uploadedFiles.codeFiles.length === 0 && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Upload both code files and SRS documents to begin analysis
        </p>
      )}
    </div>
  );
};

export default FileUploadPage;