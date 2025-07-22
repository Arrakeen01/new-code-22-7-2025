import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  MessageSquare, 
  Send,
  Bot,
  User,
  FileText,
  Code,
  Brain,
  Clock,
  Trash2,
  Download,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  AlertCircle
} from 'lucide-react';
import { AIService } from '../services/api';
import { useCodeReview } from '../contexts/CodeReviewContext';

const ChatInterface = () => {
  const { sessionId } = useCodeReview();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (sessionId) {
      loadChatHistory();
      // Add welcome message
      setMessages([
        {
          id: 'welcome',
          type: 'assistant',
          message: `👋 Hi! I'm your AI assistant with full awareness of your code review session. I can help you with:

• **Code Analysis**: Explain issues found in your files
• **Requirements**: Discuss SRS requirements and their implementation  
• **Architecture**: Provide guidance on code structure and patterns
• **Best Practices**: Suggest improvements and optimizations
• **Traceability**: Help understand requirement-to-code mappings

What would you like to know about your project?`,
          timestamp: new Date().toISOString(),
          isWelcome: true
        }
      ]);
    }
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const history = await AIService.getChatHistory(sessionId);
      setChatHistory(history.conversations || []);
      
      // Convert history to messages format (most recent first, so reverse)
      const historyMessages = history.conversations
        .reverse()
        .map((conv, index) => [
          {
            id: `history-user-${index}`,
            type: 'user',
            message: conv.message,
            timestamp: conv.timestamp
          },
          {
            id: `history-assistant-${index}`,
            type: 'assistant',
            message: conv.response,
            timestamp: conv.timestamp
          }
        ])
        .flat();
      
      if (historyMessages.length > 0) {
        setMessages(prev => [...historyMessages, ...prev]);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      message: inputMessage.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await AIService.chatWithAssistant(sessionId, userMessage.message);
      
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        message: response.response,
        timestamp: new Date().toISOString(),
        conversation_id: response.conversation_id
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setError('Failed to send message. Please try again.');
      
      const errorMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        message: '❌ I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        timestamp: new Date().toISOString(),
        isError: true
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        message: `Chat history cleared. How can I help you with your code review session?`,
        timestamp: new Date().toISOString(),
        isWelcome: true
      }
    ]);
  };

  const formatMessage = (text) => {
    // Simple markdown-like formatting
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-100 px-1 py-0.5 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br>');
  };

  const getMessageIcon = (type, isError = false, isWelcome = false) => {
    if (isError) return <AlertCircle className="h-5 w-5 text-red-500" />;
    if (isWelcome) return <Lightbulb className="h-5 w-5 text-blue-500" />;
    if (type === 'user') return <User className="h-5 w-5 text-blue-600" />;
    return <Bot className="h-5 w-5 text-green-600" />;
  };

  const suggestedQuestions = [
    "What are the main issues found in my code?",
    "Explain the traceability between my requirements and code",
    "Which files have the highest complexity?",
    "How can I improve my code's maintainability?",
    "What security concerns should I address first?",
    "Show me the health metrics summary",
  ];

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Assistant</h1>
          <p className="text-slate-600 mt-1">
            Context-aware chat assistant for your code review session
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Brain className="h-3 w-3" />
            <span>GPT-4o</span>
          </Badge>
          
          <Button onClick={loadChatHistory} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <Button onClick={clearChat} variant="outline" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex-1 flex space-x-6 min-h-0">
        {/* Main Chat */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0 pb-4">
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Conversation</span>
              <Badge variant="secondary" className="ml-auto">
                {messages.length - 1} messages
              </Badge>
            </CardTitle>
          </CardHeader>
          
          {/* Messages */}
          <CardContent className="flex-1 flex flex-col min-h-0 p-0">
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex space-x-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type === 'assistant' && (
                    <div className="flex-shrink-0">
                      {getMessageIcon(message.type, message.isError, message.isWelcome)}
                    </div>
                  )}
                  
                  <div className={`max-w-3xl ${
                    message.type === 'user' 
                      ? 'bg-blue-600 text-white rounded-lg px-4 py-3' 
                      : `bg-slate-50 rounded-lg px-4 py-3 ${message.isError ? 'border-red-200' : ''}`
                  }`}>
                    <div 
                      className={`text-sm ${message.type === 'user' ? 'text-white' : 'text-slate-800'}`}
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.message) }}
                    />
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${
                        message.type === 'user' ? 'text-blue-200' : 'text-slate-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                      
                      {message.type === 'assistant' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(message.message, index)}
                          className="h-6 px-2 text-slate-500 hover:text-slate-700"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="flex-shrink-0">
                      {getMessageIcon(message.type)}
                    </div>
                  )}
                </div>
              ))}
              
              {loading && (
                <div className="flex space-x-3 justify-start">
                  <div className="flex-shrink-0">
                    <Bot className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="bg-slate-50 rounded-lg px-4 py-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="border-t p-4">
              {error && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about your code, requirements, or analysis results..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={loading || !inputMessage.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* Session Context */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Session Context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Files uploaded</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4 text-green-600" />
                <span className="text-sm">Analysis completed</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="text-sm">AI features available</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-sm">Session: {sessionId?.substring(0, 8)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Questions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Suggested Questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestedQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full text-left justify-start h-auto py-2 px-3"
                  onClick={() => setInputMessage(question)}
                >
                  <span className="text-xs text-slate-600">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setInputMessage("Show me a summary of all issues found in my code")}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Issues Summary
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setInputMessage("What are the top 3 recommendations for improving my code?")}
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                Get Recommendations
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => setInputMessage("Explain the traceability matrix results")}
              >
                <Brain className="h-4 w-4 mr-2" />
                Traceability Help
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;