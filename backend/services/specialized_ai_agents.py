"""
Specialized AI Agents for Advanced SRS-to-Code Analysis
Each agent is responsible for a specific use case with optimized prompts and processing
"""

import os
import json
import asyncio
import ast
import re
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from dataclasses import dataclass

from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

from models import (
    UploadedFile, ChecklistItem, CodeIssue, FileAnalysis, 
    AnalysisSeverity, AnalysisStatus, CodeChange
)
from services.file_processor import FileProcessor


@dataclass
class TraceabilityMapping:
    """Represents a mapping between SRS requirement and code element"""
    requirement_id: str
    requirement_text: str
    code_element: str
    file_path: str
    line_number: int
    confidence_score: float
    element_type: str  # function, class, method, variable


@dataclass
class HealthMetric:
    """Code health metric for a specific file or component"""
    file_path: str
    complexity_score: int
    maintainability_index: float
    test_coverage: float
    code_duplication: int
    security_risk_level: str
    performance_issues: int


@dataclass
class ChatContext:
    """Chat context for conversation memory"""
    session_id: str
    conversation_history: List[Dict[str, str]]
    uploaded_files: List[str]
    analysis_results: Optional[Dict]
    user_preferences: Dict[str, Any]


class TraceabilityAgent:
    """AI Agent for SRS-to-Code traceability matrix generation"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str) -> LlmChat:
        """Create specialized chat instance for traceability analysis"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="""You are an expert software architect specializing in requirements traceability analysis. 
            Your role is to map Software Requirements Specifications (SRS) to specific code implementations with high precision.
            
            Focus on:
            1. Identifying exact requirement-to-code mappings
            2. Analyzing function/class names for requirement correlation
            3. Detecting implementation gaps
            4. Providing confidence scores for each mapping
            5. Understanding business logic implementation"""
        ).with_model("openai", "gpt-4o").with_max_tokens(8192)
    
    async def generate_traceability_matrix(
        self, 
        srs_files: List[UploadedFile], 
        code_files: List[UploadedFile],
        session_id: str
    ) -> List[TraceabilityMapping]:
        """Generate comprehensive traceability matrix between SRS and code"""
        
        try:
            chat = self._create_chat_instance(session_id)
            
            # Extract and structure SRS requirements
            requirements = await self._extract_requirements(srs_files, chat)
            
            # Analyze code structure
            code_structure = await self._analyze_code_structure(code_files, chat)
            
            # Generate mappings
            mappings = await self._generate_mappings(requirements, code_structure, chat)
            
            return mappings
            
        except Exception as e:
            print(f"Error in traceability analysis: {e}")
            return []
    
    async def _extract_requirements(self, srs_files: List[UploadedFile], chat: LlmChat) -> List[Dict]:
        """Extract structured requirements from SRS documents"""
        
        srs_content = []
        for srs_file in srs_files:
            content = await FileProcessor.process_srs_file(srs_file)
            srs_content.append(f"=== {srs_file.name} ===\n{content}")
        
        combined_srs = "\n\n".join(srs_content)
        
        prompt = f"""Analyze the following SRS documents and extract structured requirements.
        
        For each requirement, identify:
        1. Unique requirement ID
        2. Clear requirement description
        3. Functional category (authentication, data processing, UI, etc.)
        4. Priority level (critical, high, medium, low)
        5. Expected implementation approach
        
        SRS Content:
        {combined_srs[:15000]}
        
        Format response as JSON array:
        [
          {{
            "id": "REQ-001",
            "description": "User must be able to login with email and password",
            "category": "authentication",
            "priority": "critical",
            "implementation_hints": ["login function", "authentication middleware", "password validation"]
          }}
        ]"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        try:
            # Parse JSON response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                requirements_data = json.loads(json_match.group(0))
                return requirements_data[:50]  # Limit to prevent overflow
        except Exception as e:
            print(f"Error parsing requirements: {e}")
        
        return []
    
    async def _analyze_code_structure(self, code_files: List[UploadedFile], chat: LlmChat) -> Dict:
        """Analyze code structure to extract functions, classes, and key components"""
        
        code_structure = {}
        
        for code_file in code_files[:20]:  # Limit files analyzed
            try:
                language = FileProcessor.detect_programming_language(code_file.name, code_file.content or "")
                
                prompt = f"""Analyze the following {language} code and extract its structure:
                
                File: {code_file.name}
                
                Code:
                {code_file.content[:8000]}
                
                Extract:
                1. All function/method names and their purposes
                2. Class names and their responsibilities  
                3. Key variables and constants
                4. API endpoints (if any)
                5. Database models/schemas (if any)
                
                Format as JSON:
                {{
                  "functions": [
                    {{
                      "name": "function_name",
                      "line": 45,
                      "purpose": "what it does",
                      "parameters": ["param1", "param2"]
                    }}
                  ],
                  "classes": [
                    {{
                      "name": "ClassName", 
                      "line": 12,
                      "purpose": "class responsibility"
                    }}
                  ],
                  "endpoints": [
                    {{
                      "path": "/api/login",
                      "method": "POST",
                      "line": 78,
                      "purpose": "user authentication"
                    }}
                  ]
                }}"""
                
                message = UserMessage(text=prompt)
                response = await chat.send_message(message)
                
                # Parse structure
                try:
                    json_match = re.search(r'\{.*\}', response, re.DOTALL)
                    if json_match:
                        structure_data = json.loads(json_match.group(0))
                        code_structure[code_file.name] = {
                            'structure': structure_data,
                            'language': language,
                            'content': code_file.content[:2000]  # Store snippet
                        }
                except Exception as e:
                    print(f"Error parsing code structure for {code_file.name}: {e}")
                
                await asyncio.sleep(0.5)  # Rate limiting
                
            except Exception as e:
                print(f"Error analyzing {code_file.name}: {e}")
                continue
        
        return code_structure
    
    async def _generate_mappings(
        self, 
        requirements: List[Dict], 
        code_structure: Dict, 
        chat: LlmChat
    ) -> List[TraceabilityMapping]:
        """Generate requirement-to-code mappings"""
        
        mappings = []
        
        for req in requirements:
            try:
                prompt = f"""Map the following requirement to specific code implementations:
                
                Requirement: {req['id']} - {req['description']}
                Category: {req['category']}
                Implementation hints: {req.get('implementation_hints', [])}
                
                Available Code Structure:
                {json.dumps(code_structure, indent=2)[:10000]}
                
                Find the best matches and provide confidence scores (0-1).
                
                Format as JSON:
                {{
                  "mappings": [
                    {{
                      "code_element": "function_name",
                      "file_path": "file.py",
                      "line_number": 45,
                      "confidence_score": 0.9,
                      "element_type": "function",
                      "reasoning": "This function handles the exact requirement"
                    }}
                  ]
                }}"""
                
                message = UserMessage(text=prompt)
                response = await chat.send_message(message)
                
                # Parse mappings
                try:
                    json_match = re.search(r'\{.*\}', response, re.DOTALL)
                    if json_match:
                        mapping_data = json.loads(json_match.group(0))
                        
                        for mapping in mapping_data.get('mappings', []):
                            if mapping.get('confidence_score', 0) >= 0.5:  # Only high confidence
                                traceability_mapping = TraceabilityMapping(
                                    requirement_id=req['id'],
                                    requirement_text=req['description'],
                                    code_element=mapping['code_element'],
                                    file_path=mapping['file_path'],
                                    line_number=mapping.get('line_number', 1),
                                    confidence_score=mapping['confidence_score'],
                                    element_type=mapping.get('element_type', 'unknown')
                                )
                                mappings.append(traceability_mapping)
                
                except Exception as e:
                    print(f"Error parsing mappings for {req['id']}: {e}")
                
                await asyncio.sleep(0.5)  # Rate limiting
                
            except Exception as e:
                print(f"Error generating mappings for requirement {req['id']}: {e}")
                continue
        
        return mappings


class ChecklistAgent:
    """AI Agent for dynamic, intelligent checklist generation from SRS"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str) -> LlmChat:
        """Create specialized chat instance for checklist generation"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="""You are an expert software quality assurance architect specializing in comprehensive code review checklist generation.
            
            Your expertise includes:
            1. Converting natural language requirements into actionable review points
            2. Understanding domain-specific compliance needs
            3. Prioritizing security, performance, and maintainability concerns
            4. Creating measurable validation criteria
            5. Adapting checklists to technology stacks and architectural patterns"""
        ).with_model("openai", "gpt-4o").with_max_tokens(8192)
    
    async def generate_enhanced_checklist(
        self, 
        srs_files: List[UploadedFile], 
        code_files: List[UploadedFile],
        session_id: str
    ) -> List[ChecklistItem]:
        """Generate context-aware, comprehensive checklist from SRS and code analysis"""
        
        try:
            chat = self._create_chat_instance(session_id)
            
            # Analyze SRS for domain and requirements
            srs_analysis = await self._analyze_srs_context(srs_files, chat)
            
            # Analyze code for technology stack
            tech_stack = await self._analyze_technology_stack(code_files, chat)
            
            # Generate specialized checklist
            checklist = await self._generate_contextual_checklist(srs_analysis, tech_stack, chat)
            
            return checklist
            
        except Exception as e:
            print(f"Error generating enhanced checklist: {e}")
            return self._get_fallback_checklist()
    
    async def _analyze_srs_context(self, srs_files: List[UploadedFile], chat: LlmChat) -> Dict:
        """Analyze SRS for domain, compliance needs, and special requirements"""
        
        srs_content = []
        for srs_file in srs_files:
            content = await FileProcessor.process_srs_file(srs_file)
            srs_content.append(content)
        
        combined_srs = "\n\n".join(srs_content)[:20000]  # Limit content
        
        prompt = f"""Analyze this SRS document to understand the domain and special requirements:
        
        {combined_srs}
        
        Identify:
        1. Application domain (e-commerce, healthcare, finance, etc.)
        2. Compliance requirements (GDPR, HIPAA, SOX, etc.)
        3. Security sensitivity level (low, medium, high, critical)
        4. Performance requirements 
        5. Integration requirements
        6. User types and access levels
        7. Data sensitivity (PII, financial, health, etc.)
        
        Format as JSON:
        {{
          "domain": "healthcare",
          "compliance": ["HIPAA", "FDA"],
          "security_level": "critical",
          "performance_requirements": ["sub-second response", "99.9% uptime"],
          "integrations": ["payment gateway", "third-party APIs"],
          "user_types": ["admin", "doctor", "patient"],
          "data_sensitivity": "high"
        }}"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            print(f"Error parsing SRS analysis: {e}")
        
        return {"domain": "general", "security_level": "medium"}
    
    async def _analyze_technology_stack(self, code_files: List[UploadedFile], chat: LlmChat) -> Dict:
        """Analyze code to identify technology stack and architectural patterns"""
        
        file_extensions = set()
        frameworks_detected = set()
        
        for code_file in code_files[:10]:  # Sample files
            ext = code_file.name.split('.')[-1].lower()
            file_extensions.add(ext)
            
            # Simple framework detection
            content = (code_file.content or "").lower()
            if 'fastapi' in content or 'from fastapi' in content:
                frameworks_detected.add('FastAPI')
            if 'react' in content or 'import react' in content:
                frameworks_detected.add('React')
            if 'mongoose' in content or 'mongodb' in content:
                frameworks_detected.add('MongoDB')
            if 'express' in content:
                frameworks_detected.add('Express')
            if 'django' in content:
                frameworks_detected.add('Django')
            if 'spring' in content:
                frameworks_detected.add('Spring')
        
        return {
            "languages": list(file_extensions),
            "frameworks": list(frameworks_detected),
            "architecture": "web_application"  # Could be enhanced
        }
    
    async def _generate_contextual_checklist(
        self, 
        srs_analysis: Dict, 
        tech_stack: Dict, 
        chat: LlmChat
    ) -> List[ChecklistItem]:
        """Generate checklist tailored to specific context"""
        
        prompt = f"""Generate a comprehensive, context-specific code review checklist based on:
        
        Domain Context: {srs_analysis}
        Technology Stack: {tech_stack}
        
        Create checklist categories relevant to this specific context. For each item:
        1. Make it specific to the domain and technology
        2. Include measurable criteria where possible
        3. Prioritize by risk and impact
        4. Include automation recommendations
        
        Format as JSON array:
        [
          {{
            "category": "Security",
            "title": "Healthcare Data Encryption",
            "description": "All PHI must be encrypted at rest and in transit per HIPAA requirements",
            "severity": "critical",
            "automated": true,
            "items": [
              "Verify AES-256 encryption for database fields containing PHI",
              "Confirm TLS 1.3 for all API endpoints",
              "Check audit logging for data access"
            ],
            "relevant_requirement": "REQ-SEC-001: Patient data protection"
          }}
        ]
        
        Focus on creating 15-25 high-quality, specific items rather than generic ones."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                checklist_data = json.loads(json_match.group(0))
                
                checklist_items = []
                for item_data in checklist_data[:25]:  # Limit items
                    try:
                        item = ChecklistItem(
                            category=item_data.get('category', 'General'),
                            title=item_data.get('title', 'Review Item'),
                            description=item_data.get('description', ''),
                            severity=AnalysisSeverity(item_data.get('severity', 'medium').lower()),
                            automated=item_data.get('automated', True),
                            items=item_data.get('items', []),
                            relevant_requirement=item_data.get('relevant_requirement')
                        )
                        checklist_items.append(item)
                    except Exception as e:
                        print(f"Error parsing checklist item: {e}")
                        continue
                
                return checklist_items
        
        except Exception as e:
            print(f"Error parsing checklist: {e}")
        
        return self._get_fallback_checklist()
    
    def _get_fallback_checklist(self) -> List[ChecklistItem]:
        """Fallback checklist if AI generation fails"""
        return [
            ChecklistItem(
                category="Security",
                title="Input Validation",
                description="All user inputs must be properly validated",
                severity=AnalysisSeverity.CRITICAL,
                automated=True,
                items=["Validate API inputs", "Sanitize database queries"]
            ),
            ChecklistItem(
                category="Performance",
                title="Database Efficiency",
                description="Optimize database queries and indexing",
                severity=AnalysisSeverity.HIGH,
                automated=True,
                items=["Check query performance", "Verify proper indexing"]
            )
        ]


class ValidationAgent:
    """AI Agent for contextual, semantic code validation beyond syntax"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str) -> LlmChat:
        """Create specialized chat instance for semantic validation"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="""You are an expert code analyst specializing in semantic validation and intent analysis.
            
            Your capabilities include:
            1. Understanding code intent vs implementation
            2. Detecting logic flaws and business rule violations
            3. Identifying architectural inconsistencies
            4. Validating requirement satisfaction at code level
            5. Analyzing data flow and state management correctness"""
        ).with_model("openai", "gpt-4o").with_max_tokens(8192)
    
    async def validate_code_semantically(
        self,
        code_files: List[UploadedFile],
        requirements: List[Dict],
        checklist: List[ChecklistItem],
        session_id: str
    ) -> List[FileAnalysis]:
        """Perform deep semantic validation of code against requirements"""
        
        try:
            chat = self._create_chat_instance(session_id)
            file_analyses = []
            
            for code_file in code_files[:15]:  # Limit processing
                try:
                    analysis = await self._validate_single_file(
                        code_file, requirements, checklist, chat
                    )
                    file_analyses.append(analysis)
                    await asyncio.sleep(0.5)
                    
                except Exception as e:
                    print(f"Error validating {code_file.name}: {e}")
                    continue
            
            return file_analyses
            
        except Exception as e:
            print(f"Error in semantic validation: {e}")
            return []
    
    async def _validate_single_file(
        self,
        code_file: UploadedFile,
        requirements: List[Dict],
        checklist: List[ChecklistItem],
        chat: LlmChat
    ) -> FileAnalysis:
        """Validate individual file semantically"""
        
        language = FileProcessor.detect_programming_language(code_file.name, code_file.content or "")
        
        # Create context for validation
        requirements_text = "\n".join([f"- {req.get('id', '')}: {req.get('description', '')}" for req in requirements[:10]])
        checklist_text = "\n".join([f"- {item.category}: {item.title}" for item in checklist[:10]])
        
        prompt = f"""Perform deep semantic analysis of this {language} code file:
        
        File: {code_file.name}
        
        Requirements Context:
        {requirements_text}
        
        Validation Checklist:
        {checklist_text}
        
        Code:
        {code_file.content[:10000]}
        
        Analyze for:
        1. Logic correctness and business rule implementation
        2. Data flow and state management issues
        3. Error handling completeness
        4. Security vulnerabilities (injection, XSS, etc.)
        5. Performance bottlenecks
        6. Requirement satisfaction gaps
        7. Code smells and architectural violations
        
        For each issue found, provide:
        - Exact line number
        - Severity (critical/high/medium/low)
        - Clear explanation of the semantic issue
        - Specific fix recommendation
        - Whether it can be auto-fixed
        
        Format as JSON:
        {{
          "issues": [
            {{
              "line": 45,
              "type": "Logic Error",
              "severity": "high",
              "message": "Null pointer dereference possible",
              "description": "Function may receive null parameter without validation",
              "suggestion": "Add null check before dereferencing object",
              "auto_fixable": true,
              "business_impact": "Could cause application crash during user signup"
            }}
          ]
        }}"""
        
        try:
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse issues
            issues = self._parse_validation_issues(response)
            
            return FileAnalysis(
                file_name=code_file.name,
                language=language,
                size=code_file.size,
                issues=issues,
                issue_count=len(issues),
                status=AnalysisStatus.COMPLETED
            )
            
        except Exception as e:
            print(f"Error in semantic validation for {code_file.name}: {e}")
            return FileAnalysis(
                file_name=code_file.name,
                language=language,
                size=code_file.size,
                issues=[],
                status=AnalysisStatus.FAILED
            )
    
    def _parse_validation_issues(self, response: str) -> List[CodeIssue]:
        """Parse semantic validation issues from AI response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                
                issues = []
                for issue_data in data.get('issues', [])[:30]:  # Limit issues
                    try:
                        issue = CodeIssue(
                            line=issue_data.get('line', 1),
                            type=issue_data.get('type', 'Semantic Issue'),
                            severity=AnalysisSeverity(issue_data.get('severity', 'medium').lower()),
                            message=issue_data.get('message', 'Semantic issue detected'),
                            description=issue_data.get('description', ''),
                            suggestion=issue_data.get('suggestion', ''),
                            auto_fixable=issue_data.get('auto_fixable', False)
                        )
                        issues.append(issue)
                    except Exception as e:
                        print(f"Error parsing issue: {e}")
                        continue
                
                return issues
        
        except Exception as e:
            print(f"Error parsing validation response: {e}")
        
        return []


class ChatAssistantAgent:
    """AI Agent for persistent, context-aware chat assistance"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str, context: ChatContext) -> LlmChat:
        """Create chat instance with full context awareness"""
        
        # Build comprehensive system message with context
        system_message = f"""You are an expert software development assistant with complete awareness of the current code review session.
        
        Session Context:
        - Session ID: {context.session_id}
        - Uploaded Files: {', '.join(context.uploaded_files)}
        - Analysis Results Available: {'Yes' if context.analysis_results else 'No'}
        
        Your capabilities:
        1. Answer questions about uploaded code and SRS documents
        2. Provide architectural guidance and recommendations
        3. Help with code improvements and refactoring
        4. Explain analysis results and traceability mappings
        5. Guide through compliance and review processes
        6. Suggest best practices for identified issues
        
        Always reference specific files, requirements, and analysis results when relevant.
        Be conversational but precise in your technical guidance."""
        
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o").with_max_tokens(4096)
    
    async def chat_with_context(
        self,
        user_message: str,
        context: ChatContext
    ) -> str:
        """Handle chat message with full session context"""
        
        try:
            chat = self._create_chat_instance(context.session_id, context)
            
            # Add context to user message if relevant
            enhanced_message = await self._enhance_message_with_context(user_message, context)
            
            message = UserMessage(text=enhanced_message)
            response = await chat.send_message(message)
            
            # Update conversation history
            context.conversation_history.append({
                "user": user_message,
                "assistant": response,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Keep conversation history manageable
            if len(context.conversation_history) > 20:
                context.conversation_history = context.conversation_history[-15:]
            
            return response
            
        except Exception as e:
            print(f"Error in chat assistant: {e}")
            return "I apologize, but I encountered an error processing your request. Please try again."
    
    async def _enhance_message_with_context(self, user_message: str, context: ChatContext) -> str:
        """Enhance user message with relevant context information"""
        
        enhanced = user_message
        
        # Add recent conversation context if relevant
        if len(context.conversation_history) > 0:
            recent_context = "\n".join([
                f"Previous: {msg['user']} -> {msg['assistant'][:100]}..."
                for msg in context.conversation_history[-3:]
            ])
            enhanced += f"\n\nRecent conversation context:\n{recent_context}"
        
        # Add analysis results if user asks about issues, problems, or analysis
        if any(word in user_message.lower() for word in ['issue', 'problem', 'analysis', 'error', 'bug']):
            if context.analysis_results:
                summary = context.analysis_results.get('summary', {})
                enhanced += f"\n\nCurrent Analysis Summary: {summary.get('totalIssues', 0)} issues found across {summary.get('totalFiles', 0)} files"
        
        return enhanced


class HealthAnalysisAgent:
    """AI Agent for comprehensive code health metrics and visualization"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str) -> LlmChat:
        """Create specialized chat instance for health analysis"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="""You are an expert code quality analyst specializing in comprehensive health metrics.
            
            Your expertise includes:
            1. Cyclomatic complexity analysis
            2. Maintainability index calculation
            3. Code duplication detection
            4. Security risk assessment
            5. Performance bottleneck identification
            6. Technical debt quantification"""
        ).with_model("openai", "gpt-4o").with_max_tokens(8192)
    
    async def analyze_code_health(
        self,
        code_files: List[UploadedFile],
        analysis_results: Dict,
        session_id: str
    ) -> List[HealthMetric]:
        """Generate comprehensive health metrics for all code files"""
        
        try:
            chat = self._create_chat_instance(session_id)
            health_metrics = []
            
            for code_file in code_files:
                try:
                    metric = await self._analyze_file_health(code_file, analysis_results, chat)
                    health_metrics.append(metric)
                    await asyncio.sleep(0.3)
                    
                except Exception as e:
                    print(f"Error analyzing health for {code_file.name}: {e}")
                    continue
            
            return health_metrics
            
        except Exception as e:
            print(f"Error in health analysis: {e}")
            return []
    
    async def _analyze_file_health(
        self,
        code_file: UploadedFile,
        analysis_results: Dict,
        chat: LlmChat
    ) -> HealthMetric:
        """Analyze health metrics for a single file"""
        
        language = FileProcessor.detect_programming_language(code_file.name, code_file.content or "")
        
        # Get existing issues for this file
        file_issues = []
        for analysis in analysis_results.get('file_analyses', []):
            if analysis.get('file_name') == code_file.name:
                file_issues = analysis.get('issues', [])
                break
        
        prompt = f"""Analyze the code health of this {language} file and provide comprehensive metrics:
        
        File: {code_file.name}
        Size: {code_file.size} bytes
        
        Code:
        {code_file.content[:12000]}
        
        Existing Issues Found:
        {json.dumps([{
            'type': issue.get('type'),
            'severity': issue.get('severity'),
            'message': issue.get('message')
        } for issue in file_issues[:10]], indent=2)}
        
        Calculate and analyze:
        1. Cyclomatic complexity (0-100 scale)
        2. Maintainability index (0-100, higher is better)
        3. Code duplication percentage
        4. Security risk level (low/medium/high/critical)
        5. Performance risk score (0-100)
        6. Technical debt hours estimate
        7. Test coverage gaps
        
        Format as JSON:
        {{
          "complexity_score": 25,
          "maintainability_index": 78,
          "test_coverage": 65,
          "code_duplication": 12,
          "security_risk_level": "medium",
          "performance_issues": 3,
          "technical_debt_hours": 4.5,
          "overall_health_grade": "B",
          "key_concerns": ["High complexity in main function", "Missing input validation"]
        }}"""
        
        try:
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            # Parse health data
            health_data = self._parse_health_response(response)
            
            return HealthMetric(
                file_path=code_file.name,
                complexity_score=health_data.get('complexity_score', 50),
                maintainability_index=health_data.get('maintainability_index', 70.0),
                test_coverage=health_data.get('test_coverage', 0.0),
                code_duplication=health_data.get('code_duplication', 0),
                security_risk_level=health_data.get('security_risk_level', 'medium'),
                performance_issues=health_data.get('performance_issues', 0)
            )
            
        except Exception as e:
            print(f"Error analyzing health for {code_file.name}: {e}")
            return HealthMetric(
                file_path=code_file.name,
                complexity_score=50,
                maintainability_index=70.0,
                test_coverage=0.0,
                code_duplication=0,
                security_risk_level='medium',
                performance_issues=0
            )
    
    def _parse_health_response(self, response: str) -> Dict:
        """Parse health analysis response"""
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            print(f"Error parsing health response: {e}")
        
        return {}


class ReportAgent:
    """AI Agent for generating comprehensive compliance and review reports"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str) -> LlmChat:
        """Create specialized chat instance for report generation"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="""You are an expert technical writer specializing in software compliance and audit reports.
            
            Your expertise includes:
            1. Creating executive summaries for technical stakeholders
            2. Documenting compliance adherence and gaps
            3. Risk assessment and mitigation recommendations
            4. Traceability documentation for audits
            5. Technical debt analysis and prioritization"""
        ).with_model("openai", "gpt-4o").with_max_tokens(8192)
    
    async def generate_comprehensive_report(
        self,
        session_data: Dict,
        analysis_results: Dict,
        traceability_matrix: List[TraceabilityMapping],
        health_metrics: List[HealthMetric],
        session_id: str
    ) -> Dict:
        """Generate comprehensive audit-ready report"""
        
        try:
            chat = self._create_chat_instance(session_id)
            
            # Compile all data
            report_data = {
                "session_info": session_data,
                "analysis_summary": analysis_results.get('summary', {}),
                "file_analyses": analysis_results.get('file_analyses', []),
                "traceability_coverage": len(traceability_matrix),
                "health_overview": self._summarize_health_metrics(health_metrics),
                "compliance_status": self._assess_compliance_status(analysis_results)
            }
            
            # Generate executive summary
            executive_summary = await self._generate_executive_summary(report_data, chat)
            
            # Generate detailed findings
            detailed_findings = await self._generate_detailed_findings(report_data, chat)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(report_data, chat)
            
            return {
                "executive_summary": executive_summary,
                "detailed_findings": detailed_findings,
                "recommendations": recommendations,
                "metrics": report_data,
                "generated_at": datetime.utcnow().isoformat(),
                "session_id": session_id
            }
            
        except Exception as e:
            print(f"Error generating report: {e}")
            return self._get_fallback_report(session_id)
    
    async def _generate_executive_summary(self, report_data: Dict, chat: LlmChat) -> str:
        """Generate executive summary for stakeholders"""
        
        prompt = f"""Create an executive summary for this code review analysis:
        
        Analysis Data:
        {json.dumps(report_data, indent=2)[:8000]}
        
        The summary should:
        1. Start with overall assessment (Pass/Conditional Pass/Fail)
        2. Highlight key metrics and findings
        3. Identify top 3 risks or concerns
        4. Provide business impact assessment
        5. Give timeline recommendations for remediation
        
        Write in professional, non-technical language suitable for executives and project managers.
        Keep it to 300-500 words."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return response
    
    async def _generate_detailed_findings(self, report_data: Dict, chat: LlmChat) -> str:
        """Generate detailed technical findings"""
        
        prompt = f"""Create detailed technical findings section based on:
        
        {json.dumps(report_data, indent=2)[:10000]}
        
        Include:
        1. Security findings with risk levels
        2. Performance issues and bottlenecks
        3. Code quality metrics and violations
        4. Architecture and design concerns
        5. Compliance gaps and violations
        6. Traceability coverage analysis
        
        Format as structured technical documentation with specific file references and line numbers where applicable."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return response
    
    async def _generate_recommendations(self, report_data: Dict, chat: LlmChat) -> str:
        """Generate actionable recommendations"""
        
        prompt = f"""Based on the analysis data, provide prioritized recommendations:
        
        {json.dumps(report_data, indent=2)[:8000]}
        
        Provide:
        1. Immediate actions (critical issues)
        2. Short-term improvements (1-2 weeks)
        3. Long-term strategic changes (1-3 months)
        4. Process improvements for future development
        5. Tool and automation recommendations
        
        Each recommendation should include effort estimate and business value."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        return response
    
    def _summarize_health_metrics(self, health_metrics: List[HealthMetric]) -> Dict:
        """Summarize health metrics across all files"""
        if not health_metrics:
            return {"average_complexity": 0, "average_maintainability": 0}
        
        return {
            "total_files": len(health_metrics),
            "average_complexity": sum(m.complexity_score for m in health_metrics) / len(health_metrics),
            "average_maintainability": sum(m.maintainability_index for m in health_metrics) / len(health_metrics),
            "high_risk_files": len([m for m in health_metrics if m.security_risk_level in ['high', 'critical']]),
            "average_test_coverage": sum(m.test_coverage for m in health_metrics) / len(health_metrics)
        }
    
    def _assess_compliance_status(self, analysis_results: Dict) -> str:
        """Assess overall compliance status"""
        summary = analysis_results.get('summary', {})
        critical_issues = summary.get('criticalIssues', 0)
        high_issues = summary.get('highIssues', 0)
        
        if critical_issues > 0:
            return "NON_COMPLIANT"
        elif high_issues > 5:
            return "CONDITIONAL_COMPLIANCE"
        else:
            return "COMPLIANT"
    
    def _get_fallback_report(self, session_id: str) -> Dict:
        """Fallback report if generation fails"""
        return {
            "executive_summary": "Report generation encountered an error. Manual review recommended.",
            "detailed_findings": "Technical analysis could not be completed automatically.",
            "recommendations": "Please review uploaded files manually and re-run analysis.",
            "session_id": session_id,
            "generated_at": datetime.utcnow().isoformat(),
            "error": True
        }


class SuggestionAgent:
    """AI Agent for real-time code suggestions and improvements"""
    
    def __init__(self, openai_key: str):
        self.api_key = openai_key
    
    def _create_chat_instance(self, session_id: str) -> LlmChat:
        """Create specialized chat instance for code suggestions"""
        return LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message="""You are an expert code assistant providing real-time suggestions and improvements.
            
            Your specialties:
            1. Context-aware code completion and improvement
            2. Best practice recommendations
            3. Security vulnerability prevention
            4. Performance optimization suggestions
            5. Code refactoring recommendations"""
        ).with_model("openai", "gpt-4o").with_max_tokens(4096)
    
    async def get_code_suggestions(
        self,
        code_snippet: str,
        file_name: str,
        cursor_position: int,
        context: Dict,
        session_id: str
    ) -> List[Dict]:
        """Get real-time code suggestions for editing"""
        
        try:
            chat = self._create_chat_instance(session_id)
            
            language = FileProcessor.detect_programming_language(file_name, code_snippet)
            
            prompt = f"""Provide code suggestions for this {language} code at cursor position {cursor_position}:
            
            File: {file_name}
            Context: {json.dumps(context, indent=2)[:2000]}
            
            Code:
            {code_snippet[:5000]}
            
            Provide 3-5 suggestions including:
            1. Code completion if at end of line
            2. Refactoring improvements
            3. Security enhancements
            4. Performance optimizations
            5. Best practice fixes
            
            Format as JSON array:
            [
              {{
                "type": "completion",
                "suggestion": "suggested code",
                "description": "why this helps",
                "priority": "high"
              }}
            ]"""
            
            message = UserMessage(text=prompt)
            response = await chat.send_message(message)
            
            return self._parse_suggestions(response)
            
        except Exception as e:
            print(f"Error getting code suggestions: {e}")
            return []
    
    def _parse_suggestions(self, response: str) -> List[Dict]:
        """Parse code suggestions from AI response"""
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                suggestions = json.loads(json_match.group(0))
                return suggestions[:5]  # Limit suggestions
        except Exception as e:
            print(f"Error parsing suggestions: {e}")
        
        return []