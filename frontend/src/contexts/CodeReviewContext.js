import React, { createContext, useContext, useReducer } from "react";

const CodeReviewContext = createContext();

const initialState = {
  uploadedFiles: {
    codeFiles: [],
    srsFiles: []
  },
  analysisResults: null,
  checklist: [],
  modifiedCode: {},
  reviewProgress: {
    totalIssues: 0,
    issuesFixed: 0,
    filesModified: 0,
    changesReviewed: 0
  },
  selectedModel: "gpt-4o",
  isAnalyzing: false,
  sessionId: null
};

function codeReviewReducer(state, action) {
  switch (action.type) {
    case "SET_UPLOADED_FILES":
      return {
        ...state,
        uploadedFiles: action.payload
      };
    
    case "SET_ANALYSIS_RESULTS":
      return {
        ...state,
        analysisResults: action.payload,
        isAnalyzing: false
      };
    
    case "SET_CHECKLIST":
      return {
        ...state,
        checklist: action.payload
      };
    
    case "UPDATE_CHECKLIST_ITEM":
      return {
        ...state,
        checklist: state.checklist.map(item =>
          item.id === action.payload.id
            ? { ...item, ...action.payload.updates }
            : item
        )
      };
    
    case "SET_MODIFIED_CODE":
      return {
        ...state,
        modifiedCode: {
          ...state.modifiedCode,
          ...action.payload
        }
      };
    
    case "UPDATE_REVIEW_PROGRESS":
      return {
        ...state,
        reviewProgress: {
          ...state.reviewProgress,
          ...action.payload
        }
      };
    
    case "SET_SELECTED_MODEL":
      return {
        ...state,
        selectedModel: action.payload
      };
    
    case "SET_ANALYZING":
      return {
        ...state,
        isAnalyzing: action.payload
      };
    
    case "CLEAR_ALL_DATA":
      return initialState;
    
    default:
      return state;
  }
}

export function CodeReviewProvider({ children }) {
  const [state, dispatch] = useReducer(codeReviewReducer, initialState);

  const value = {
    ...state,
    dispatch
  };

  return (
    <CodeReviewContext.Provider value={value}>
      {children}
    </CodeReviewContext.Provider>
  );
}

export function useCodeReview() {
  const context = useContext(CodeReviewContext);
  if (!context) {
    throw new Error("useCodeReview must be used within a CodeReviewProvider");
  }
  return context;
}