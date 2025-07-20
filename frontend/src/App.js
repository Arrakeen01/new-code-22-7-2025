import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CodeReviewProvider } from "./contexts/CodeReviewContext";
import { Toaster } from "./components/ui/toaster";
import FileUploadPage from "./pages/FileUploadPage";
import CodeValidationPage from "./pages/CodeValidationPage";
import CodeComparisonPage from "./pages/CodeComparisonPage";
import Layout from "./components/Layout";

function App() {
  return (
    <div className="App">
      <CodeReviewProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<FileUploadPage />} />
              <Route path="/validation" element={<CodeValidationPage />} />
              <Route path="/comparison" element={<CodeComparisonPage />} />
            </Routes>
          </Layout>
          <Toaster />
        </BrowserRouter>
      </CodeReviewProvider>
    </div>
  );
}

export default App;