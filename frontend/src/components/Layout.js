import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { 
  Upload, 
  CheckSquare, 
  GitCompare, 
  Moon, 
  Sun,
  Code2,
  Zap
} from "lucide-react";
import { useCodeReview } from "../contexts/CodeReviewContext";

const Layout = ({ children }) => {
  const location = useLocation();
  const { currentStep, reviewProgress } = useCodeReview();
  const [darkMode, setDarkMode] = React.useState(false);

  const steps = [
    { 
      id: 1, 
      path: "/", 
      label: "File Upload", 
      icon: Upload,
      description: "Upload code and SRS files"
    },
    { 
      id: 2, 
      path: "/validation", 
      label: "Code Analysis", 
      icon: CheckSquare,
      description: "AI-powered validation"
    },
    { 
      id: 3, 
      path: "/comparison", 
      label: "Review & Compare", 
      icon: GitCompare,
      description: "Review suggested changes"
    }
  ];

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500 ${darkMode ? "dark" : ""}`}>
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Code2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <Zap className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  CodeReview AI
                </h1>
                <p className="text-sm text-muted-foreground">Intelligent Code Analysis Platform</p>
              </div>
            </div>

            {/* Stats */}
            {reviewProgress.totalIssues > 0 && (
              <div className="hidden md:flex items-center space-x-4">
                <Badge variant="outline" className="px-3 py-1">
                  {reviewProgress.totalIssues} Issues Found
                </Badge>
                <Badge variant="secondary" className="px-3 py-1">
                  {reviewProgress.issuesFixed} Fixed
                </Badge>
                <Badge variant="default" className="px-3 py-1">
                  {reviewProgress.filesModified} Files Modified
                </Badge>
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Progress Navigation */}
      <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = location.pathname === step.path;
                const isCompleted = currentStep > step.id;
                const isAccessible = currentStep >= step.id;

                return (
                  <Link 
                    key={step.id}
                    to={step.path}
                    className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                      !isAccessible 
                        ? "opacity-50 cursor-not-allowed pointer-events-none" 
                        : "cursor-pointer hover:shadow-md"
                    }`}
                  >
                    <div className={`p-2 rounded-full transition-all duration-300 ${
                      isActive 
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 shadow-lg" 
                        : isCompleted
                        ? "bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className={`font-medium transition-colors ${
                        isActive 
                          ? "text-blue-600 dark:text-blue-400" 
                          : isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {step.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;