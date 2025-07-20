import os
import asyncio
from typing import List, Dict, Optional, Any
from datetime import datetime

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

from models import (
    UploadedFile, ChecklistItem, CodeIssue, FileAnalysis, 
    AnalysisSeverity, AnalysisStatus, CodeChange
)
from services.file_processor import FileProcessor


class AIService:
    """Service for AI-powered code analysis and review"""
    
    def __init__(self):
        self.openai_key = os.environ.get('OPENAI_API_KEY')
        self.gemini_key = os.environ.get('GEMINI_API_KEY')
        
        if not self.openai_key or not self.gemini_key:
            raise ValueError("Missing required API keys: OPENAI_API_KEY and GEMINI_API_KEY")

    def _get_model_config(self, model: str) -> tuple:
        """Get provider and model name from model string"""
        model_configs = {
            'gpt-4o': ('openai', 'gpt-4o'),
            'gpt-4o-mini': ('openai', 'gpt-4o-mini'),
            'claude-3-5-sonnet': ('anthropic', 'claude-3-5-sonnet-20241022'),
            'gemini-2.0-flash': ('gemini', 'gemini-2.0-flash'),
            'deepseek-coder': ('openai', 'deepseek-coder'),  # Using OpenAI-compatible API
            'llama-3.2': ('ollama', 'llama3.2')
        }
        return model_configs.get(model, ('openai', 'gpt-4o'))

    def _create_chat_instance(self, model: str, session_id: str) -> LlmChat:
        """Create LLM chat instance based on model"""
        provider, model_name = self._get_model_config(model)
        
        if provider == 'openai':
            api_key = self.openai_key
        elif provider == 'gemini':
            api_key = self.gemini_key
        elif provider == 'anthropic':
            # For now, use OpenAI key - can be extended later
            api_key = self.openai_key
            provider = 'openai'
            model_name = 'gpt-4o'
        else:
            api_key = self.openai_key
            provider = 'openai'
            model_name = 'gpt-4o'
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message="You are an expert code reviewer and software architect. Provide detailed, actionable feedback."
        ).with_model(provider, model_name).with_max_tokens(8192)
        
        return chat

    async def generate_checklist_from_srs(
        self, 
        srs_files: List[UploadedFile], 
        model: str, 
        session_id: str
    ) -> List[ChecklistItem]:
        """Generate code review checklist from SRS documents"""
        
        try:
            # Extract SRS content
            srs_content = []
            for srs_file in srs_files:
                content = await FileProcessor.process_srs_file(srs_file)
                srs_content.append(f"=== {srs_file.name} ===\n{content}")
            
            combined_srs = "\n\n".join(srs_content)
            
            # Create AI chat instance
            chat = self._create_chat_instance(model, session_id)
            
            # Generate checklist using AI
            prompt = f"""Based on the following Software Requirements Specification (SRS) documents, generate a comprehensive code review checklist. 
            
Focus on:
1. Security requirements and vulnerabilities
2. Performance criteria and optimization
3. Code quality and maintainability
4. Architecture and design patterns
5. Testing and validation requirements
6. Documentation standards

SRS Documents:
{combined_srs[:10000]}  # Limit to prevent token overflow

Please provide a structured checklist with categories, specific items, severity levels (Critical, High, Medium, Low), and indicate which items can be automated vs manual review.

Format your response as a JSON array with this structure:
[
  {{
    "category": "Security",
    "title": "Input Validation",
    "description": "All user inputs must be properly validated and sanitized",
    "severity": "Critical",
    "automated": true,
    "items": ["Validate all API endpoint inputs", "Sanitize data before database operations"]
  }}
]"""

            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse AI response and create checklist items
            checklist = self._parse_checklist_response(response, combined_srs)
            
            return checklist
            
        except Exception as e:
            print(f"Error generating checklist: {e}")
            # Return default checklist if AI fails
            return self._get_default_checklist()

    async def analyze_code_files(
        self, 
        code_files: List[UploadedFile], 
        checklist: List[ChecklistItem],
        model: str, 
        session_id: str
    ) -> List[FileAnalysis]:
        """Analyze code files for issues and violations"""
        
        file_analyses = []
        
        try:
            chat = self._create_chat_instance(model, session_id)
            
            # Process files in batches to avoid token limits
            batch_size = 3
            for i in range(0, len(code_files), batch_size):
                batch = code_files[i:i + batch_size]
                
                for code_file in batch:
                    try:
                        analysis = await self._analyze_single_file(
                            code_file, checklist, chat, session_id
                        )
                        file_analyses.append(analysis)
                        
                        # Add small delay to avoid rate limits
                        await asyncio.sleep(0.5)
                        
                    except Exception as e:
                        print(f"Error analyzing {code_file.name}: {e}")
                        # Create empty analysis for failed files
                        analysis = FileAnalysis(
                            file_name=code_file.name,
                            language=FileProcessor.detect_programming_language(code_file.name, code_file.content or ""),
                            size=code_file.size,
                            issues=[],
                            status=AnalysisStatus.FAILED
                        )
                        file_analyses.append(analysis)
        
        except Exception as e:
            print(f"Error in code analysis: {e}")
        
        return file_analyses

    async def _analyze_single_file(
        self, 
        code_file: UploadedFile, 
        checklist: List[ChecklistItem], 
        chat: LlmChat,
        session_id: str
    ) -> FileAnalysis:
        """Analyze a single code file"""
        
        language = FileProcessor.detect_programming_language(code_file.name, code_file.content or "")
        
        # Create checklist context
        checklist_context = "\n".join([
            f"- {item.category}: {item.title} ({item.severity}) - {item.description}"
            for item in checklist
        ])
        
        prompt = f"""Analyze the following {language} code file for issues based on the provided checklist and general best practices:

File: {code_file.name}
Language: {language}

Checklist Context:
{checklist_context}

Code:
{code_file.content[:8000]}  # Limit code size

Please identify specific issues including:
1. Line numbers where issues occur
2. Severity level (Critical, High, Medium, Low)
3. Issue type/category
4. Clear description of the problem
5. Specific suggestion for fixing
6. Whether the issue can be auto-fixed

Format your response as JSON:
{{
  "issues": [
    {{
      "line": 23,
      "type": "Security",
      "severity": "Critical",
      "message": "Potential XSS vulnerability",
      "description": "User input is not sanitized before rendering",
      "suggestion": "Use DOMPurify or similar library to sanitize HTML content",
      "auto_fixable": true,
      "original_code": "innerHTML = userData.bio",
      "fixed_code": "innerHTML = DOMPurify.sanitize(userData.bio)"
    }}
  ]
}}"""

        try:
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse response and create issues
            issues = self._parse_code_issues(response, code_file.name)
            
            analysis = FileAnalysis(
                file_name=code_file.name,
                language=language,
                size=code_file.size,
                issues=issues,
                issue_count=len(issues),
                status=AnalysisStatus.COMPLETED
            )
            
            return analysis
            
        except Exception as e:
            print(f"Error analyzing file {code_file.name}: {e}")
            return FileAnalysis(
                file_name=code_file.name,
                language=language,
                size=code_file.size,
                issues=[],
                status=AnalysisStatus.FAILED
            )

    async def fix_code_issues(
        self,
        original_content: str,
        issues: List[CodeIssue],
        file_name: str,
        model: str,
        session_id: str
    ) -> tuple[str, List[CodeChange]]:
        """Fix identified code issues and return modified content"""
        
        try:
            chat = self._create_chat_instance(model, session_id)
            
            # Create context about issues to fix
            issues_context = "\n".join([
                f"Line {issue.line}: {issue.message} - {issue.suggestion}"
                for issue in issues if issue.auto_fixable
            ])
            
            prompt = f"""Fix the following issues in the code file '{file_name}':

Issues to fix:
{issues_context}

Original code:
{original_content}

Please provide:
1. The complete fixed code
2. A summary of changes made
3. List of issues that were addressed

Format your response as JSON:
{{
  "fixed_code": "complete fixed code here",
  "changes_summary": "description of what was changed",
  "issues_fixed": ["issue1", "issue2"]
}}"""

            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse response and create changes
            fixed_content, changes = self._parse_fix_response(response, original_content)
            
            return fixed_content, changes
            
        except Exception as e:
            print(f"Error fixing code issues: {e}")
            return original_content, []

    def _parse_checklist_response(self, response: str, srs_content: str) -> List[ChecklistItem]:
        """Parse AI response to extract checklist items"""
        try:
            # Try to extract JSON from response
            import json
            import re
            
            # Find JSON array in response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                checklist_data = json.loads(json_str)
                
                checklist_items = []
                for item_data in checklist_data[:20]:  # Limit to 20 items
                    try:
                        item = ChecklistItem(
                            category=item_data.get('category', 'General'),
                            title=item_data.get('title', 'Code Review Item'),
                            description=item_data.get('description', ''),
                            severity=AnalysisSeverity(item_data.get('severity', 'medium').lower()),
                            automated=item_data.get('automated', True),
                            items=item_data.get('items', []),
                            relevant_requirement=self._extract_requirement(item_data.get('title', ''), srs_content)
                        )
                        checklist_items.append(item)
                    except Exception as e:
                        print(f"Error parsing checklist item: {e}")
                        continue
                
                return checklist_items if checklist_items else self._get_default_checklist()
            
        except Exception as e:
            print(f"Error parsing checklist response: {e}")
        
        return self._get_default_checklist()

    def _parse_code_issues(self, response: str, file_name: str) -> List[CodeIssue]:
        """Parse AI response to extract code issues"""
        try:
            import json
            import re
            
            # Find JSON in response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                data = json.loads(json_str)
                
                issues = []
                for issue_data in data.get('issues', [])[:50]:  # Limit to 50 issues
                    try:
                        issue = CodeIssue(
                            line=issue_data.get('line', 1),
                            type=issue_data.get('type', 'Code Quality'),
                            severity=AnalysisSeverity(issue_data.get('severity', 'medium').lower()),
                            message=issue_data.get('message', 'Code issue detected'),
                            description=issue_data.get('description', ''),
                            suggestion=issue_data.get('suggestion', ''),
                            auto_fixable=issue_data.get('auto_fixable', False),
                            original_code=issue_data.get('original_code'),
                            fixed_code=issue_data.get('fixed_code')
                        )
                        issues.append(issue)
                    except Exception as e:
                        print(f"Error parsing issue: {e}")
                        continue
                
                return issues
                
        except Exception as e:
            print(f"Error parsing issues response: {e}")
        
        return []

    def _parse_fix_response(self, response: str, original_content: str) -> tuple[str, List[CodeChange]]:
        """Parse AI fix response and generate change list"""
        try:
            import json
            import re
            
            # Find JSON in response
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                data = json.loads(json_str)
                
                fixed_code = data.get('fixed_code', original_content)
                issues_fixed = data.get('issues_fixed', [])
                
                # Generate simple changes list (basic implementation)
                changes = [
                    CodeChange(
                        type="modification",
                        line=1,
                        content="Code has been modified by AI",
                        description=data.get('changes_summary', 'AI applied fixes')
                    )
                ]
                
                return fixed_code, changes
                
        except Exception as e:
            print(f"Error parsing fix response: {e}")
        
        return original_content, []

    def _extract_requirement(self, title: str, srs_content: str) -> str:
        """Extract relevant requirement from SRS content"""
        # Simple keyword matching - could be improved with NLP
        keywords = title.lower().split()
        requirements = [
            "User authentication and authorization",
            "Data validation and security",
            "Performance optimization",
            "Error handling and logging",
            "Database operations and integrity",
            "API documentation and testing"
        ]
        
        # Return first matching requirement or default
        for req in requirements:
            if any(keyword in req.lower() for keyword in keywords):
                return req
        
        return requirements[0]  # Default requirement

    def _get_default_checklist(self) -> List[ChecklistItem]:
        """Get default checklist if AI generation fails"""
        return [
            ChecklistItem(
                category="Security",
                title="Input Validation",
                description="All user inputs must be properly validated and sanitized",
                severity=AnalysisSeverity.CRITICAL,
                automated=True,
                items=[
                    "Validate all API endpoint inputs",
                    "Sanitize data before database operations",
                    "Implement proper authentication checks"
                ]
            ),
            ChecklistItem(
                category="Code Quality",
                title="Function Complexity",
                description="Functions should be concise and focused",
                severity=AnalysisSeverity.MEDIUM,
                automated=True,
                items=[
                    "Functions should not exceed 50 lines",
                    "Cyclomatic complexity should be below 10",
                    "Avoid deeply nested code structures"
                ]
            ),
            ChecklistItem(
                category="Performance",
                title="Database Optimization",
                description="Ensure efficient database queries and proper indexing",
                severity=AnalysisSeverity.HIGH,
                automated=True,
                items=[
                    "Use proper database indexes",
                    "Avoid N+1 query problems",
                    "Implement query result caching"
                ]
            )
        ]