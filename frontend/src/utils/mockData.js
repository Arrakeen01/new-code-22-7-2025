// Mock data for the code review application

export const mockChecklist = [
  {
    id: "1",
    category: "Code Quality",
    title: "Function Length and Complexity",
    description: "Functions should be concise and focused on a single responsibility",
    severity: "Medium",
    checked: false,
    automated: true,
    items: [
      "Functions should not exceed 50 lines",
      "Cyclomatic complexity should be below 10",
      "Avoid deeply nested code structures"
    ]
  },
  {
    id: "2",
    category: "Security",
    title: "Input Validation",
    description: "All user inputs must be properly validated and sanitized",
    severity: "Critical",
    checked: false,
    automated: true,
    items: [
      "Validate all API endpoint inputs",
      "Sanitize data before database operations",
      "Implement proper authentication checks"
    ]
  },
  {
    id: "3",
    category: "Performance",
    title: "Database Query Optimization",
    description: "Ensure efficient database queries and proper indexing",
    severity: "High",
    checked: false,
    automated: true,
    items: [
      "Use proper database indexes",
      "Avoid N+1 query problems",
      "Implement query result caching"
    ]
  },
  {
    id: "4",
    category: "Architecture",
    title: "Component Structure",
    description: "Follow proper architectural patterns and separation of concerns",
    severity: "Medium",
    checked: false,
    automated: false,
    items: [
      "Separate business logic from presentation",
      "Use dependency injection properly",
      "Follow SOLID principles"
    ]
  },
  {
    id: "5",
    category: "Documentation",
    title: "Code Documentation",
    description: "Code should be well-documented with clear comments",
    severity: "Low",
    checked: false,
    automated: false,
    items: [
      "Add JSDoc comments for functions",
      "Document complex business logic",
      "Keep README files up to date"
    ]
  },
  {
    id: "6",
    category: "Testing",
    title: "Test Coverage",
    description: "Maintain adequate test coverage for all components",
    severity: "High",
    checked: false,
    automated: true,
    items: [
      "Unit tests for all functions",
      "Integration tests for API endpoints",
      "End-to-end tests for critical flows"
    ]
  }
];

export const mockAnalysisResults = {
  summary: {
    totalFiles: 12,
    totalIssues: 47,
    criticalIssues: 3,
    highIssues: 8,
    mediumIssues: 21,
    lowIssues: 15,
    filesWithIssues: 8,
    overallScore: 72
  },
  fileStructure: [
    {
      name: "src",
      type: "folder",
      children: [
        {
          name: "components",
          type: "folder",
          children: [
            {
              name: "UserProfile.js",
              type: "file",
              language: "javascript",
              size: 2840,
              issues: [
                {
                  id: "1",
                  line: 23,
                  type: "Security",
                  severity: "Critical",
                  message: "Potential XSS vulnerability: User input not sanitized",
                  description: "User input from props.userData.bio is directly rendered without sanitization",
                  suggestion: "Use DOMPurify or similar library to sanitize HTML content",
                  autoFixable: true
                },
                {
                  id: "2",
                  line: 45,
                  type: "Performance",
                  severity: "Medium",
                  message: "Expensive operation in render method",
                  description: "Array sorting operation running on every render",
                  suggestion: "Move sorting logic to useMemo hook",
                  autoFixable: true
                }
              ]
            },
            {
              name: "Dashboard.js",
              type: "file",
              language: "javascript",
              size: 4120,
              issues: [
                {
                  id: "3",
                  line: 67,
                  type: "Code Quality",
                  severity: "High",
                  message: "Function too complex",
                  description: "handleUserAction function has cyclomatic complexity of 12",
                  suggestion: "Break down into smaller functions",
                  autoFixable: false
                },
                {
                  id: "4",
                  line: 89,
                  type: "Security",
                  severity: "Critical",
                  message: "SQL injection vulnerability",
                  description: "User input concatenated directly into SQL query",
                  suggestion: "Use parameterized queries",
                  autoFixable: true
                }
              ]
            }
          ]
        },
        {
          name: "utils",
          type: "folder",
          children: [
            {
              name: "api.js",
              type: "file",
              language: "javascript",
              size: 1890,
              issues: [
                {
                  id: "5",
                  line: 34,
                  type: "Security",
                  severity: "Critical",
                  message: "API keys exposed in client-side code",
                  description: "Hardcoded API key found in source code",
                  suggestion: "Move API keys to environment variables",
                  autoFixable: true
                }
              ]
            },
            {
              name: "helpers.js",
              type: "file",
              language: "javascript",
              size: 967,
              issues: [
                {
                  id: "6",
                  line: 12,
                  type: "Code Quality",
                  severity: "Low",
                  message: "Unused variable",
                  description: "Variable 'tempValue' is declared but never used",
                  suggestion: "Remove unused variable",
                  autoFixable: true
                }
              ]
            }
          ]
        },
        {
          name: "App.js",
          type: "file",
          language: "javascript",
          size: 890,
          issues: []
        }
      ]
    },
    {
      name: "package.json",
      type: "file",
      language: "json",
      size: 1240,
      issues: [
        {
          id: "7",
          line: 15,
          type: "Security",
          severity: "High",
          message: "Vulnerable dependency detected",
          description: "Package 'lodash' version 4.17.15 has known vulnerabilities",
          suggestion: "Update to lodash version 4.17.21 or higher",
          autoFixable: true
        }
      ]
    }
  ]
};

export const mockCodeSample = {
  original: `import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserProfile = ({ userId }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Issue: Hardcoded API key
      const response = await axios.get(\`/api/users/\${userId}\`, {
        headers: {
          'Authorization': 'Bearer sk-1234567890abcdef'
        }
      });
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedFriends = userData?.friends?.sort((a, b) => a.name.localeCompare(b.name));

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-profile">
      <h2>{userData.name}</h2>
      <div 
        // Issue: XSS vulnerability
        dangerouslySetInnerHTML={{ __html: userData.bio }}
      />
      <div className="friends-list">
        <h3>Friends ({sortedFriends?.length || 0})</h3>
        {sortedFriends?.map(friend => (
          <div key={friend.id}>{friend.name}</div>
        ))}
      </div>
    </div>
  );
};

export default UserProfile;`,
  modified: `import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import DOMPurify from 'dompurify';

const UserProfile = ({ userId }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      // Fixed: Use environment variable for API key
      const response = await axios.get(\`/api/users/\${userId}\`, {
        headers: {
          'Authorization': \`Bearer \${process.env.REACT_APP_API_KEY}\`
        }
      });
      setUserData(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fixed: Move sorting to useMemo to prevent unnecessary re-calculations
  const sortedFriends = useMemo(() => {
    return userData?.friends?.sort((a, b) => a.name.localeCompare(b.name)) || [];
  }, [userData?.friends]);

  // Fixed: Sanitize HTML content to prevent XSS
  const sanitizedBio = useMemo(() => {
    return userData?.bio ? DOMPurify.sanitize(userData.bio) : '';
  }, [userData?.bio]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-profile">
      <h2>{userData.name}</h2>
      <div 
        // Fixed: Use sanitized HTML content
        dangerouslySetInnerHTML={{ __html: sanitizedBio }}
      />
      <div className="friends-list">
        <h3>Friends ({sortedFriends.length})</h3>
        {sortedFriends.map(friend => (
          <div key={friend.id}>{friend.name}</div>
        ))}
      </div>
    </div>
  );
};

export default UserProfile;`
};

export const mockFixedFiles = {
  "UserProfile.js": {
    original: mockCodeSample.original,
    modified: mockCodeSample.modified,
    changes: [
      {
        type: "addition",
        line: 3,
        content: "import DOMPurify from 'dompurify';"
      },
      {
        type: "modification",
        line: 16,
        oldContent: "'Authorization': 'Bearer sk-1234567890abcdef'",
        newContent: "'Authorization': `Bearer ${process.env.REACT_APP_API_KEY}`"
      },
      {
        type: "addition",
        line: 25,
        content: "// Fixed: Move sorting to useMemo to prevent unnecessary re-calculations"
      },
      {
        type: "modification",
        line: 26,
        oldContent: "const sortedFriends = userData?.friends?.sort((a, b) => a.name.localeCompare(b.name));",
        newContent: "const sortedFriends = useMemo(() => {\n    return userData?.friends?.sort((a, b) => a.name.localeCompare(b.name)) || [];\n  }, [userData?.friends]);"
      }
    ],
    issuesFixed: [
      "Security: API keys exposed in client-side code",
      "Security: Potential XSS vulnerability",
      "Performance: Expensive operation in render method"
    ],
    status: "modified"
  },
  "Dashboard.js": {
    original: "// Original Dashboard.js content...",
    modified: "// Modified Dashboard.js content...",
    changes: [],
    issuesFixed: ["SQL injection vulnerability fixed"],
    status: "modified"
  },
  "api.js": {
    original: "// Original api.js content...",
    modified: "// Modified api.js content...",
    changes: [],
    issuesFixed: ["Moved API keys to environment variables"],
    status: "modified"
  }
};

export const generateMockChecklist = (srsContent) => {
  // Simulate AI analysis of SRS content
  const requirements = [
    "User authentication system",
    "Data validation and security",
    "Performance optimization",
    "Error handling and logging",
    "Database operations",
    "API documentation"
  ];

  return mockChecklist.map(item => ({
    ...item,
    relevantRequirement: requirements[Math.floor(Math.random() * requirements.length)]
  }));
};