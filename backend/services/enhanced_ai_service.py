"""
Enhanced AI Service that orchestrates specialized AI agents
for comprehensive SRS-to-Code analysis and validation
"""

import os
import asyncio
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime

from models import (
    UploadedFile, ChecklistItem, FileAnalysis, TraceabilityMapping, 
    HealthMetric, ChatContext, ChatMessage, ComprehensiveReport
)

from services.specialized_ai_agents import (
    TraceabilityAgent, ChecklistAgent, ValidationAgent,
    ChatAssistantAgent, HealthAnalysisAgent, ReportAgent, SuggestionAgent
)


class EnhancedAIService:
    """
    Enhanced AI Service that coordinates multiple specialized agents
    for comprehensive code analysis and review
    """
    
    def __init__(self):
        self.openai_key = os.environ.get('OPENAI_API_KEY')
        
        if not self.openai_key:
            raise ValueError("Missing required API key: OPENAI_API_KEY")
        
        # Initialize specialized agents
        self.traceability_agent = TraceabilityAgent(self.openai_key)
        self.checklist_agent = ChecklistAgent(self.openai_key)
        self.validation_agent = ValidationAgent(self.openai_key)
        self.chat_assistant = ChatAssistantAgent(self.openai_key)
        self.health_agent = HealthAnalysisAgent(self.openai_key)
        self.report_agent = ReportAgent(self.openai_key)
        self.suggestion_agent = SuggestionAgent(self.openai_key)
    
    async def comprehensive_analysis(
        self,
        srs_files: List[UploadedFile],
        code_files: List[UploadedFile],
        session_id: str
    ) -> Dict[str, Any]:
        """
        Perform comprehensive analysis using all specialized agents
        """
        try:
            results = {}
            
            # Step 1: Generate enhanced checklist (context-aware)
            print("Generating enhanced checklist...")
            checklist = await self.checklist_agent.generate_enhanced_checklist(
                srs_files, code_files, session_id
            )
            results['checklist'] = [item.dict() for item in checklist]
            
            # Step 2: Generate traceability matrix
            print("Creating traceability matrix...")
            traceability_mappings = await self.traceability_agent.generate_traceability_matrix(
                srs_files, code_files, session_id
            )
            results['traceability_matrix'] = [mapping.__dict__ for mapping in traceability_mappings]
            
            # Step 3: Perform contextual validation
            print("Performing semantic validation...")
            # Extract requirements for validation
            requirements = await self._extract_requirements_from_srs(srs_files)
            validation_results = await self.validation_agent.validate_code_semantically(
                code_files, requirements, checklist, session_id
            )
            results['file_analyses'] = [analysis.dict() for analysis in validation_results]
            
            # Step 4: Calculate comprehensive health metrics
            print("Analyzing code health...")
            analysis_data = {'file_analyses': results['file_analyses']}
            health_metrics = await self.health_agent.analyze_code_health(
                code_files, analysis_data, session_id
            )
            results['health_metrics'] = [metric.__dict__ for metric in health_metrics]
            
            # Step 5: Calculate summary statistics
            results['summary'] = self._calculate_comprehensive_summary(
                validation_results, traceability_mappings, health_metrics
            )
            
            return results
            
        except Exception as e:
            print(f"Error in comprehensive analysis: {e}")
            return {
                'error': str(e),
                'checklist': [],
                'traceability_matrix': [],
                'file_analyses': [],
                'health_metrics': [],
                'summary': {}
            }
    
    async def generate_traceability_matrix(
        self,
        srs_files: List[UploadedFile],
        code_files: List[UploadedFile],
        session_id: str
    ) -> List[TraceabilityMapping]:
        """Generate SRS-to-Code traceability matrix"""
        return await self.traceability_agent.generate_traceability_matrix(
            srs_files, code_files, session_id
        )
    
    async def generate_enhanced_checklist(
        self,
        srs_files: List[UploadedFile],
        code_files: List[UploadedFile],
        session_id: str
    ) -> List[ChecklistItem]:
        """Generate context-aware, comprehensive checklist"""
        return await self.checklist_agent.generate_enhanced_checklist(
            srs_files, code_files, session_id
        )
    
    async def validate_code_contextually(
        self,
        code_files: List[UploadedFile],
        srs_files: List[UploadedFile],
        checklist: List[ChecklistItem],
        session_id: str
    ) -> List[FileAnalysis]:
        """Perform contextual, semantic code validation"""
        requirements = await self._extract_requirements_from_srs(srs_files)
        return await self.validation_agent.validate_code_semantically(
            code_files, requirements, checklist, session_id
        )
    
    async def analyze_code_health(
        self,
        code_files: List[UploadedFile],
        analysis_results: Dict,
        session_id: str
    ) -> List[HealthMetric]:
        """Generate comprehensive code health metrics"""
        return await self.health_agent.analyze_code_health(
            code_files, analysis_results, session_id
        )
    
    async def chat_with_context(
        self,
        user_message: str,
        context: ChatContext
    ) -> str:
        """Handle context-aware chat interaction"""
        return await self.chat_assistant.chat_with_context(user_message, context)
    
    async def generate_comprehensive_report(
        self,
        session_data: Dict,
        analysis_results: Dict,
        traceability_matrix: List[TraceabilityMapping],
        health_metrics: List[HealthMetric],
        session_id: str
    ) -> ComprehensiveReport:
        """Generate comprehensive audit-ready report"""
        report_data = await self.report_agent.generate_comprehensive_report(
            session_data, analysis_results, traceability_matrix, health_metrics, session_id
        )
        
        return ComprehensiveReport(
            session_id=session_id,
            executive_summary=report_data.get('executive_summary', ''),
            detailed_findings=report_data.get('detailed_findings', ''),
            recommendations=report_data.get('recommendations', ''),
            compliance_status=report_data.get('metrics', {}).get('compliance_status', 'UNKNOWN'),
            traceability_coverage=len(traceability_matrix),
            health_overview=report_data.get('metrics', {}).get('health_overview', {})
        )
    
    async def get_code_suggestions(
        self,
        code_snippet: str,
        file_name: str,
        cursor_position: int,
        context: Dict,
        session_id: str
    ) -> List[Dict]:
        """Get real-time code suggestions"""
        return await self.suggestion_agent.get_code_suggestions(
            code_snippet, file_name, cursor_position, context, session_id
        )
    
    def create_chat_context(
        self,
        session_id: str,
        uploaded_files: List[str],
        analysis_results: Optional[Dict] = None
    ) -> ChatContext:
        """Create chat context for session"""
        return ChatContext(
            session_id=session_id,
            uploaded_files=uploaded_files,
            analysis_results=analysis_results,
            user_preferences={
                "preferred_language": "python",
                "focus_areas": ["security", "performance"],
                "experience_level": "intermediate"
            }
        )
    
    async def _extract_requirements_from_srs(self, srs_files: List[UploadedFile]) -> List[Dict]:
        """Extract requirements from SRS files for validation context"""
        try:
            # Simple extraction - could be enhanced with dedicated agent
            requirements = []
            
            for i, srs_file in enumerate(srs_files[:5]):  # Limit SRS files
                content = srs_file.content or ""
                
                # Basic requirement extraction
                req_id = f"SRS-{i+1}"
                requirements.append({
                    "id": req_id,
                    "description": f"Requirements from {srs_file.name}",
                    "category": "general",
                    "content": content[:2000]  # Truncate for processing
                })
            
            return requirements
            
        except Exception as e:
            print(f"Error extracting requirements: {e}")
            return [{"id": "REQ-001", "description": "General requirements", "category": "general"}]
    
    def _calculate_comprehensive_summary(
        self,
        validation_results: List[FileAnalysis],
        traceability_mappings: List,
        health_metrics: List
    ) -> Dict[str, Any]:
        """Calculate comprehensive summary statistics"""
        
        # Basic validation summary
        total_files = len(validation_results)
        total_issues = sum(len(analysis.issues) for analysis in validation_results)
        
        # Issue severity breakdown
        critical_issues = sum(
            len([i for i in analysis.issues if i.severity == "critical"]) 
            for analysis in validation_results
        )
        high_issues = sum(
            len([i for i in analysis.issues if i.severity == "high"]) 
            for analysis in validation_results
        )
        medium_issues = sum(
            len([i for i in analysis.issues if i.severity == "medium"]) 
            for analysis in validation_results
        )
        low_issues = sum(
            len([i for i in analysis.issues if i.severity == "low"]) 
            for analysis in validation_results
        )
        
        # Traceability metrics
        traceability_coverage = len(traceability_mappings)
        high_confidence_mappings = len([m for m in traceability_mappings if m.confidence_score > 0.8])
        
        # Health metrics summary
        if health_metrics:
            avg_complexity = sum(m.complexity_score for m in health_metrics) / len(health_metrics)
            avg_maintainability = sum(m.maintainability_index for m in health_metrics) / len(health_metrics)
            high_risk_files = len([m for m in health_metrics if m.security_risk_level in ['high', 'critical']])
        else:
            avg_complexity = 0
            avg_maintainability = 0
            high_risk_files = 0
        
        # Overall score calculation (0-100)
        base_score = 100
        score_deductions = (
            critical_issues * 20 +
            high_issues * 10 +
            medium_issues * 5 +
            low_issues * 2 +
            high_risk_files * 15
        )
        overall_score = max(0, min(100, base_score - score_deductions))
        
        return {
            "totalFiles": total_files,
            "totalIssues": total_issues,
            "criticalIssues": critical_issues,
            "highIssues": high_issues,
            "mediumIssues": medium_issues,
            "lowIssues": low_issues,
            "filesWithIssues": len([a for a in validation_results if a.issues]),
            "overallScore": overall_score,
            
            # Traceability metrics
            "traceabilityCoverage": traceability_coverage,
            "highConfidenceMappings": high_confidence_mappings,
            "traceabilityScore": (high_confidence_mappings / max(1, traceability_coverage)) * 100,
            
            # Health metrics
            "averageComplexity": round(avg_complexity, 1),
            "averageMaintainability": round(avg_maintainability, 1),
            "highRiskFiles": high_risk_files,
            "healthScore": round(avg_maintainability, 1),
            
            # Overall assessment
            "complianceStatus": self._determine_compliance_status(critical_issues, high_issues, high_risk_files),
            "recommendedAction": self._get_recommended_action(overall_score, critical_issues)
        }
    
    def _determine_compliance_status(self, critical_issues: int, high_issues: int, high_risk_files: int) -> str:
        """Determine overall compliance status"""
        if critical_issues > 0 or high_risk_files > 2:
            return "NON_COMPLIANT"
        elif high_issues > 5 or high_risk_files > 0:
            return "CONDITIONAL_COMPLIANCE"
        else:
            return "COMPLIANT"
    
    def _get_recommended_action(self, overall_score: int, critical_issues: int) -> str:
        """Get recommended action based on analysis"""
        if critical_issues > 0:
            return "IMMEDIATE_ACTION_REQUIRED"
        elif overall_score < 50:
            return "MAJOR_REVISION_NEEDED"
        elif overall_score < 75:
            return "IMPROVEMENTS_RECOMMENDED"
        else:
            return "MINOR_ADJUSTMENTS_ONLY"