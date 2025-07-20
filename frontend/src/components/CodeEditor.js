import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import {
  Folder,
  FolderOpen,
  FileText,
  Code,
  ChevronRight,
  ChevronDown,
  Plus,
  Save,
  FileCode
} from "lucide-react";

const CodeEditor = ({ files = [], onFileChange, onFileCreate }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState("");
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [isEditing, setIsEditing] = useState(false);

  // File type icons
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <Code className="h-4 w-4 text-yellow-500" />;
      case 'py':
        return <Code className="h-4 w-4 text-blue-500" />;
      case 'java':
        return <Code className="h-4 w-4 text-red-500" />;
      case 'html':
        return <Code className="h-4 w-4 text-orange-500" />;
      case 'css':
        return <Code className="h-4 w-4 text-blue-400" />;
      default:
        return <FileCode className="h-4 w-4 text-slate-500" />;
    }
  };

  const toggleFolder = (folderName) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderName)) {
      newExpanded.delete(folderName);
    } else {
      newExpanded.add(folderName);
    }
    setExpandedFolders(newExpanded);
  };

  const selectFile = (file) => {
    if (selectedFile?.id !== file.id) {
      setSelectedFile(file);
      setFileContent(file.content || "");
      setIsEditing(false);
    }
  };

  const handleContentChange = (content) => {
    setFileContent(content);
    setIsEditing(true);
  };

  const saveFile = () => {
    if (selectedFile && onFileChange) {
      onFileChange(selectedFile.id, fileContent);
      setIsEditing(false);
    }
  };

  const createNewFile = () => {
    const fileName = prompt("Enter file name:");
    if (fileName && onFileCreate) {
      onFileCreate(fileName);
    }
  };

  // Organize files into folder structure
  const organizeFiles = (files) => {
    const structure = {
      'src': [],
      'components': [],
      'utils': [],
      'root': []
    };

    files.forEach(file => {
      const fileName = file.name.toLowerCase();
      if (fileName.includes('component') || fileName.includes('jsx') || fileName.includes('tsx')) {
        structure.components.push(file);
      } else if (fileName.includes('util') || fileName.includes('helper')) {
        structure.utils.push(file);
      } else if (fileName.includes('src') || fileName.includes('main') || fileName.includes('index')) {
        structure.src.push(file);
      } else {
        structure.root.push(file);
      }
    });

    return structure;
  };

  const fileStructure = organizeFiles(files);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-96">
      {/* File Explorer */}
      <Card className="lg:col-span-1">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-medium text-sm">Explorer</h3>
          <Button size="sm" variant="ghost" onClick={createNewFile}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2 space-y-1">
            {Object.entries(fileStructure).map(([folderName, folderFiles]) => {
              if (folderFiles.length === 0) return null;
              
              const isExpanded = expandedFolders.has(folderName);
              const Icon = isExpanded ? FolderOpen : Folder;
              const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;

              return (
                <div key={folderName}>
                  {/* Folder */}
                  <div
                    className="flex items-center space-x-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"
                    onClick={() => toggleFolder(folderName)}
                  >
                    <ChevronIcon className="h-3 w-3" />
                    <Icon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium capitalize">{folderName}</span>
                  </div>
                  
                  {/* Files in folder */}
                  {isExpanded && (
                    <div className="ml-6 space-y-1">
                      {folderFiles.map(file => (
                        <div
                          key={file.id}
                          className={`flex items-center space-x-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer ${
                            selectedFile?.id === file.id ? 'bg-blue-100 dark:bg-blue-900' : ''
                          }`}
                          onClick={() => selectFile(file)}
                        >
                          {getFileIcon(file.name)}
                          <span className="text-sm truncate">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Card>

      {/* Code Editor */}
      <Card className="lg:col-span-3">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {selectedFile && (
              <>
                {getFileIcon(selectedFile.name)}
                <span className="font-medium text-sm">{selectedFile.name}</span>
                {isEditing && <span className="text-xs text-orange-500">• modified</span>}
              </>
            )}
          </div>
          {selectedFile && isEditing && (
            <Button size="sm" onClick={saveFile}>
              <Save className="h-3 w-3 mr-1" />
              Save
            </Button>
          )}
        </div>
        
        <div className="h-80">
          {selectedFile ? (
            <textarea
              value={fileContent}
              onChange={(e) => handleContentChange(e.target.value)}
              className="w-full h-full p-3 font-mono text-sm border-none outline-none resize-none bg-transparent"
              placeholder="Start typing your code..."
            />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-2" />
                <p>Select a file to view or edit</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CodeEditor;