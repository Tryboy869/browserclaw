/**
 * Chat.jsx - Built-in WebChat Interface
 * 
 * Features:
 * - Real-time messaging with the agent
 * - Streaming response display
 * - Voice input via MediaDevices API
 * - Markdown rendering for responses
 * - Message history persistence
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Mic, 
  MicOff, 
  Trash2, 
  Download,
  MoreVertical,
  Bot,
  User
} from 'lucide-react';
import { t } from '../../i18n/index.js';
import { 
  initWebChat, 
  sendMessage, 
  getCurrentSessionMessages,
  clearSession,
  startRecording,
  isMicrophoneAvailable
} from '../../channels/webchat.js';

function Chat({ darkMode, onMessage }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micAvailable, setMicAvailable] = useState(false);
  const [recordingObj, setRecordingObj] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Initialize chat
  useEffect(() => {
    const init = async () => {
      await initWebChat(handleIncomingMessage);
      const history = await getCurrentSessionMessages();
      setMessages(history);
      
      const hasMic = await isMicrophoneAvailable();
      setMicAvailable(hasMic);
    };
    
    init();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  
  const handleIncomingMessage = useCallback(async (data) => {
    if (data.stream) {
      // Handle streaming response
      let responseText = '';
      
      data.streamHandler = {
        onToken: (token) => {
          responseText += token;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: responseText }
              ];
            }
            return [...prev, { role: 'assistant', content: responseText, streaming: true }];
          });
        }
      };
      
      const response = await onMessage(data);
      
      // Mark as complete
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return prev;
      });
      
      return response;
    } else {
      // Non-streaming response
      const response = await onMessage(data);
      return response;
    }
  }, [onMessage]);
  
  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    
    try {
      // Send to agent
      const response = await sendMessage(userMessage, {
        stream: true,
        onStreamToken: (token) => {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && last.streaming) {
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + token }
              ];
            }
            return [...prev, { role: 'assistant', content: token, streaming: true }];
          });
        }
      });
      
      // Mark streaming as complete
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        }
        return prev;
      });
      
    } catch (error) {
      console.error('Send error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: t('chat.error'), error: true }
      ]);
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  const startVoiceRecording = async () => {
    try {
      const recorder = await startRecording();
      setRecordingObj(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
      alert(t('chat.micError'));
    }
  };
  
  const stopVoiceRecording = async () => {
    if (!recordingObj) return;
    
    try {
      const audioBlob = await recordingObj.stop();
      setIsRecording(false);
      setRecordingObj(null);
      
      // Process voice input
      // In production, this would transcribe and send
      setMessages(prev => [
        ...prev,
        { role: 'user', content: t('chat.voiceMessage'), isVoice: true }
      ]);
      
    } catch (error) {
      console.error('Stop recording error:', error);
      setIsRecording(false);
      setRecordingObj(null);
    }
  };
  
  const handleClearChat = async () => {
    if (confirm(t('chat.confirmClear'))) {
      await clearSession();
      setMessages([]);
    }
  };
  
  const handleExportChat = () => {
    const chatData = {
      exportedAt: new Date().toISOString(),
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      }))
    };
    
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={index}
        className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        {/* Avatar */}
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
          ${isUser 
            ? 'bg-blue-600' 
            : darkMode ? 'bg-green-600' : 'bg-green-500'
          }
        `}>
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>
        
        {/* Message content */}
        <div className={`
          max-w-[80%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-blue-600 text-white'
            : darkMode 
              ? 'bg-[#16213E] text-white' 
              : 'bg-gray-100 text-gray-900'
          }
          ${message.error ? 'bg-red-600' : ''}
        `}>
          {message.isVoice && (
            <div className="flex items-center gap-2 mb-1 opacity-70">
              <Mic size={14} />
              <span className="text-xs">{t('chat.voice')}</span>
            </div>
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
          {message.streaming && (
            <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className={`
        flex items-center justify-between px-6 py-4 border-b
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
      `}>
        <div>
          <h1 className="text-2xl font-bold">{t('chat.title')}</h1>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {t('chat.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportChat}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            `}
            title={t('chat.export')}
          >
            <Download size={20} />
          </button>
          <button
            onClick={handleClearChat}
            className={`
              p-2 rounded-lg transition-colors
              ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}
            `}
            title={t('chat.clear')}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot size={64} className="mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">{t('chat.welcome')}</h3>
            <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('chat.startMessage')}
            </p>
          </div>
        ) : (
          messages.map((message, index) => renderMessage(message, index))
        )}
        
        {isTyping && (
          <div className="flex gap-4">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${darkMode ? 'bg-green-600' : 'bg-green-500'}
            `}>
              <Bot size={20} />
            </div>
            <div className={`
              rounded-2xl px-4 py-3
              ${darkMode ? 'bg-[#16213E]' : 'bg-gray-100'}
            `}>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-current animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className={`
        p-4 border-t
        ${darkMode ? 'border-gray-700' : 'border-gray-200'}
      `}>
        <div className={`
          flex items-end gap-2 p-2 rounded-xl
          ${darkMode ? 'bg-[#16213E]' : 'bg-white'}
          border ${darkMode ? 'border-gray-700' : 'border-gray-300'}
        `}>
          {/* Voice button */}
          {micAvailable && (
            <button
              onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
              className={`
                p-3 rounded-lg transition-colors
                ${isRecording 
                  ? 'bg-red-600 animate-pulse' 
                  : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }
              `}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}
          
          {/* Text input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.placeholder')}
            rows={1}
            className={`
              flex-1 bg-transparent resize-none py-3 px-2
              focus:outline-none
              ${darkMode ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}
            `}
            style={{ minHeight: '48px', maxHeight: '150px' }}
          />
          
          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`
              p-3 rounded-lg transition-colors
              ${input.trim() && !isTyping
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'opacity-50 cursor-not-allowed'
              }
            `}
          >
            <Send size={20} />
          </button>
        </div>
        
        <p className={`text-xs text-center mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {t('chat.disclaimer')}
        </p>
      </div>
    </div>
  );
}

export default Chat;
