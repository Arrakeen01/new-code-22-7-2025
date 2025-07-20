import React from "react";
import { useLocation, Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  Upload, 
  CheckSquare, 
  GitCompare, 
  Moon, 
  Sun,
  Code2
} from "lucide-react";
import { useCodeReview } from "../contexts/CodeReviewContext";

const Layout = ({ children }) => {
  const location = useLocation();
  const { reviewProgress } = useCodeReview();
  const [darkMode, setDarkMode] = React.useState(false);

  const navItems = [
    { 
      path: "/", 
      label: "File Upload", 
      icon: Upload
    },
    { 
      path: "/validation", 
      label: "Code Analysis", 
      icon: CheckSquare
    },
    { 
      path: "/comparison", 
      label: "Review & Compare", 
      icon: GitCompare
    }
  ];

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-900 ${darkMode ? "dark" : ""}`}>
      {/* Header */}
      <header className="border-b bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Code2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  CodeReview AI
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Simple Code Analysis Tool</p>
              </div>
            </div>

            {/* Stats */}
            {reviewProgress.totalIssues > 0 && (
              <div className="hidden md:flex items-center space-x-3">
                <Badge variant="outline">
                  {reviewProgress.totalIssues} Issues
                </Badge>
                <Badge variant="secondary">
                  {reviewProgress.issuesFixed} Fixed
                </Badge>
              </div>
            )}

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Simple Navigation */}
      <nav className="border-b bg-slate-50 dark:bg-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex space-x-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link 
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-3 border-b-2 transition-colors ${
                    isActive 
                      ? "border-blue-600 text-blue-600 dark:text-blue-400" 
                      : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;