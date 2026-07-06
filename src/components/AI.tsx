import React, { useState, useEffect } from 'react';
import { Topbar } from '../App';
import { getAISettings, updateAISettings, analyzeText, getRAGDocuments, addRAGDocument, deleteRAGDocument } from '../lib/api';
import { Settings, Cpu, Database, Search, FileText, Bot, Plus, Trash2, Send, AlertTriangle } from 'lucide-react';

export default function AI({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'chat' | 'analysis' | 'rag' | 'settings'>('chat');
  
  // Settings State
  const [settings, setSettings] = useState<any>({});
  
  // Analysis State
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [analyzeTask, setAnalyzeTask] = useState('summarize');
  const [analyzeResult, setAnalyzeResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [useRag, setUseRag] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // RAG State
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  useEffect(() => {
    loadSettings();
    loadRagDocs();
  }, []);

  const loadSettings = async () => {
    const data = await getAISettings(currentUser.id);
    setSettings(data);
  };

  const loadRagDocs = async () => {
    const data = await getRAGDocuments(currentUser.id);
    setRagDocs(data);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateAISettings({ ...settings, userId: currentUser.id });
    alert('Settings saved successfully');
  };

  const handleAnalyze = async () => {
    if (!analyzeInput.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeResult('');
    try {
      const data = await analyzeText(currentUser.id, analyzeInput, analyzeTask);
      setAnalyzeResult(data.result);
    } catch (err: any) {
      setAnalyzeResult('Error: ' + err.message);
    }
    setIsAnalyzing(false);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isStreaming) return;
    
    const newMsgs = [...chatMessages, { role: 'user', content: chatInput }];
    setChatMessages(newMsgs);
    setChatInput('');
    setIsStreaming(true);
    
    try {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, messages: newMsgs, useRag })
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      setChatMessages([...newMsgs, { role: 'assistant', content: '' }]);
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const data = JSON.parse(line.slice(6));
            if (data.text) {
              setChatMessages(prev => {
                const newArr = [...prev];
                newArr[newArr.length - 1].content += data.text;
                return newArr;
              });
            } else if (data.error) {
              setChatMessages(prev => {
                const newArr = [...prev];
                newArr[newArr.length - 1].content += `\n[Error: ${data.error}]`;
                return newArr;
              });
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
    }
    
    setIsStreaming(false);
  };

  const handleAddRagDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    setIsAddingDoc(true);
    try {
      await addRAGDocument(currentUser.id, newDocTitle, newDocContent);
      setNewDocTitle('');
      setNewDocContent('');
      loadRagDocs();
    } catch (err: any) {
      alert('Error adding document: ' + err.message);
    }
    setIsAddingDoc(false);
  };

  const handleDeleteRagDoc = async (id: string) => {
    if (confirm('Delete this document?')) {
      await deleteRAGDocument(id);
      loadRagDocs();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      <Topbar title="AI Intelligence" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('chat')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Bot className="w-5 h-5" /> Chat & Analysis
          </button>
          <button 
            onClick={() => setActiveTab('analysis')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'analysis' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Search className="w-5 h-5" /> Text Operations
          </button>
          <button 
            onClick={() => setActiveTab('rag')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'rag' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Database className="w-5 h-5" /> RAG Knowledge
          </button>
          <button 
            onClick={() => setActiveTab('settings')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Settings className="w-5 h-5" /> Config (Ollama/OpenAI)
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            
            {activeTab === 'settings' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Cpu className="w-6 h-6 text-blue-500" /> AI Provider Configuration
                </h2>
                
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Provider Type</label>
                    <select 
                      value={settings.provider || 'ollama'} 
                      onChange={e => setSettings({...settings, provider: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                    >
                      <option value="ollama">Ollama (Local/Self-Hosted)</option>
                      <option value="openai">OpenAI Compatible API</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Endpoint URL</label>
                    <input 
                      type="url" 
                      value={settings.endpoint || ''} 
                      onChange={e => setSettings({...settings, endpoint: e.target.value})}
                      placeholder="e.g. http://localhost:11434/v1 or https://api.openai.com/v1"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">API Key (Optional for Ollama)</label>
                    <input 
                      type="password" 
                      value={settings.apiKey || ''} 
                      onChange={e => setSettings({...settings, apiKey: e.target.value})}
                      placeholder="sk-..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Chat Model Name</label>
                      <input 
                        type="text" 
                        value={settings.model || ''} 
                        onChange={e => setSettings({...settings, model: e.target.value})}
                        placeholder="llama3, gpt-4o, etc."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-1">Embedding Model Name</label>
                      <input 
                        type="text" 
                        value={settings.embeddingModel || ''} 
                        onChange={e => setSettings({...settings, embeddingModel: e.target.value})}
                        placeholder="nomic-embed-text, text-embedding-3-small"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" 
                      />
                    </div>
                  </div>
                  
                  <button type="submit" className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors">
                    Save Configuration
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="h-full flex flex-col space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Search className="w-6 h-6 text-purple-500" /> Intelligence Operations
                  </h2>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Select Operation</label>
                    <div className="flex flex-wrap gap-2">
                      {['summarize', 'classify', 'extract', 'risk'].map(task => (
                        <button 
                          key={task}
                          onClick={() => setAnalyzeTask(task)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                            analyzeTask === task ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {task === 'extract' ? 'Entity Extraction' : task === 'risk' ? 'Risk Score' : task}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-400 mb-2">Input Text</label>
                    <textarea 
                      rows={5}
                      value={analyzeInput}
                      onChange={e => setAnalyzeInput(e.target.value)}
                      placeholder="Paste text for analysis..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  
                  <button 
                    onClick={handleAnalyze} 
                    disabled={isAnalyzing || !analyzeInput.trim()}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
                  >
                    {isAnalyzing ? 'Processing...' : 'Run Analysis'}
                  </button>
                </div>
                
                {analyzeResult && (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase mb-3">Result</h3>
                    <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-emerald-400">
                      {analyzeResult}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rag' && (
              <div className="h-full flex flex-col space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Database className="w-6 h-6 text-emerald-500" /> Knowledge Base
                  </h2>
                  <p className="text-slate-400 text-sm mb-6">Upload documents to be used as context for the AI during chat (Retrieval-Augmented Generation).</p>
                  
                  <form onSubmit={handleAddRagDoc} className="space-y-4">
                    <div>
                      <input 
                        type="text"
                        required
                        value={newDocTitle}
                        onChange={e => setNewDocTitle(e.target.value)}
                        placeholder="Document Title"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <textarea 
                        required
                        rows={4}
                        value={newDocContent}
                        onChange={e => setNewDocContent(e.target.value)}
                        placeholder="Paste document content here..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={isAddingDoc}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {isAddingDoc ? 'Generating Embeddings...' : 'Add Document'}
                    </button>
                  </form>
                </div>
                
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-hidden flex flex-col">
                  <h3 className="text-lg font-semibold mb-4">Indexed Documents</h3>
                  <div className="flex-1 overflow-y-auto space-y-3">
                    {ragDocs.length === 0 && <p className="text-slate-500 text-sm">No documents indexed yet.</p>}
                    {ragDocs.map(doc => (
                      <div key={doc.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-slate-200">{doc.title}</p>
                            <p className="text-xs text-slate-500">Indexed {new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteRagDoc(doc.id)} className="p-2 text-rose-400 hover:bg-rose-900/30 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-full flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-500" /> AI Assistant
                  </h2>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={useRag}
                      onChange={e => setUseRag(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-600"
                    />
                    <Database className="w-4 h-4 text-emerald-500" /> Search Knowledge Base (RAG)
                  </label>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                      <Bot className="w-12 h-12 mb-4 opacity-50" />
                      <p>Start a conversation with the AI.</p>
                      {useRag && <p className="text-xs mt-2 text-emerald-500"><AlertTriangle className="w-3 h-3 inline mr-1"/> Knowledge base searching enabled.</p>}
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'}`}>
                        <p className="whitespace-pre-wrap text-sm">{msg.content || (isStreaming && i === chatMessages.length - 1 ? '...' : '')}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
                  <form onSubmit={handleSendChat} className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask anything..."
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      type="submit" 
                      disabled={!chatInput.trim() || isStreaming}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
