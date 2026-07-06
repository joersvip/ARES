import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderOpen, Database, MessageSquare, Map as MapIcon, Settings as SettingsIcon, LogOut, Menu, Paperclip, Send, Check, CheckCheck, Image as ImageIcon, Video, File, Mic, Bot, ScanFace, ScanText, FileSignature } from 'lucide-react';
import { login, getChats, getMessages, getUsers, createChat, uploadFile, getSocket } from './lib/api';

// App Context / State
function AppContent() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentUser && location.pathname !== '/login') {
      navigate('/login');
    } else if (currentUser) {
      const socket = getSocket();
      socket.emit('authenticate', currentUser.id);
    }
  }, [currentUser, location, navigate]);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50">
      <Sidebar onLogout={() => setCurrentUser(null)} currentUser={currentUser} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases" element={<Cases currentUser={currentUser} />} />
          <Route path="/evidence" element={<Evidence currentUser={currentUser} />} />
          <Route path="/ai" element={<AI currentUser={currentUser} />} />
          <Route path="/faces" element={<FaceRec currentUser={currentUser} />} />
          <Route path="/ocr" element={<OCR currentUser={currentUser} />} />
          <Route path="/chat" element={<Chat currentUser={currentUser} />} />
          <Route path="/maps" element={<Maps currentUser={currentUser} />} />
          <Route path="/reports" element={<Reporting currentUser={currentUser} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

// Components
function Sidebar({ onLogout, currentUser }: { onLogout: () => void, currentUser: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Cases', path: '/cases', icon: FolderOpen },
    { name: 'Evidence', path: '/evidence', icon: Database },
    { name: 'OCR', path: '/ocr', icon: ScanText },
    { name: 'AI Module', path: '/ai', icon: Bot },
    { name: 'Face Rec', path: '/faces', icon: ScanFace },
    { name: 'Reports', path: '/reports', icon: FileSignature },
    { name: 'Secure Chat', path: '/chat', icon: MessageSquare },
    { name: 'Maps', path: '/maps', icon: MapIcon },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="w-16 md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20">
      <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
          {currentUser.name.charAt(0).toUpperCase()}
        </div>
        <span className="hidden md:block ml-3 font-semibold text-sm truncate">{currentUser.name}</span>
      </div>
      
      <nav className="flex-1 py-4 flex flex-col gap-2 px-2 md:px-4">
        {navItems.map(item => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex items-center justify-center md:justify-start p-3 md:px-4 md:py-3 rounded-xl transition-colors ${
                isActive ? 'bg-blue-600/20 text-blue-500' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <item.icon className="w-6 h-6 md:w-5 md:h-5" />
              <span className="hidden md:block ml-3 font-medium">{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-2 md:p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="flex items-center justify-center md:justify-start w-full p-3 md:px-4 md:py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <LogOut className="w-6 h-6 md:w-5 md:h-5" />
          <span className="hidden md:block ml-3 font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}

export function Topbar({ title }: { title: string }) {
  return (
    <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
  );
}

import CasesComponent from './components/Cases';
import EvidenceComponent from './components/Evidence';
import AIComponent from './components/AI';
import FaceRecognitionComponent from './components/FaceRecognition';
import OCRComponent from './components/OCR';
import GISComponent from './components/GIS';
import ReportingComponent from './components/Reporting';

// Pages
function Login({ onLogin }: { onLogin: (user: any) => void }) {

  const [name, setName] = useState('Agent Smith');
  const [email, setEmail] = useState('smith@agency.gov');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(name, email);
      onLogin(user);
    } catch (err) {
      alert('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto mb-6 flex items-center justify-center">
          <span className="font-bold text-2xl text-white">S</span>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Secure Access</h2>
        <p className="text-slate-400 text-center mb-8">Identify yourself to continue</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Full Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors mt-6 disabled:opacity-50">
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  return (
    <div className="flex-1 overflow-y-auto">
      <Topbar title="Dashboard" />
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { title: 'Active Cases', value: '12', color: 'text-blue-500' },
            { title: 'New Evidence', value: '34', color: 'text-emerald-500' },
            { title: 'Alerts', value: '3', color: 'text-rose-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-slate-400 text-sm font-medium mb-2">{stat.title}</h3>
              <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Cases({ currentUser }: { currentUser: any }) { return <CasesComponent currentUser={currentUser} />; }
function Evidence({ currentUser }: { currentUser: any }) { return <EvidenceComponent currentUser={currentUser} />; }
function Maps({ currentUser }: { currentUser: any }) { return <GISComponent currentUser={currentUser} />; }
function AI({ currentUser }: { currentUser: any }) { return <AIComponent currentUser={currentUser} />; }
function FaceRec({ currentUser }: { currentUser: any }) { return <FaceRecognitionComponent currentUser={currentUser} />; }
function OCR({ currentUser }: { currentUser: any }) { return <OCRComponent currentUser={currentUser} />; }
function Reporting({ currentUser }: { currentUser: any }) { return <ReportingComponent currentUser={currentUser} />; }
function Settings() { return <div className="flex-1 overflow-y-auto"><Topbar title="Settings" /><div className="p-6">Module unavailable.</div></div>; }

function Chat({ currentUser }: { currentUser: any }) {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    getChats(currentUser.id).then(setChats);
    getUsers().then(setUsers);
  }, [currentUser.id]);

  useEffect(() => {
    if (activeChat) {
      socket.emit('join_chat', activeChat.id);
      getMessages(activeChat.id).then(setMessages);
    }
  }, [activeChat]);

  useEffect(() => {
    socket.on('new_message', (msg) => {
      if (activeChat && msg.chatId === activeChat.id) {
        setMessages(prev => [...prev, msg]);
        if (msg.senderId !== currentUser.id) {
          socket.emit('read_message', { messageId: msg.id, userId: currentUser.id, chatId: msg.chatId });
        }
      }
    });

    socket.on('user_typing', ({ chatId, senderId, isTyping }) => {
      setTypingUsers(prev => {
        const chatTyping = prev[chatId] || [];
        if (isTyping && !chatTyping.includes(senderId)) {
          return { ...prev, [chatId]: [...chatTyping, senderId] };
        } else if (!isTyping) {
          return { ...prev, [chatId]: chatTyping.filter(id => id !== senderId) };
        }
        return prev;
      });
    });

    socket.on('user_status', ({ userId, status, lastSeen }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status, lastSeen } : u));
    });
    
    socket.on('message_read', ({ messageId, userId }) => {
      // update message read status logic here if needed
    });

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_status');
      socket.off('message_read');
    };
  }, [activeChat, currentUser.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleSend = () => {
    if (input.trim() && activeChat) {
      socket.emit('send_message', {
        chatId: activeChat.id,
        senderId: currentUser.id,
        type: 'text',
        content: input,
      });
      setInput('');
      socket.emit('typing', { chatId: activeChat.id, senderId: currentUser.id, isTyping: false });
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (activeChat) {
      socket.emit('typing', { chatId: activeChat.id, senderId: currentUser.id, isTyping: e.target.value.length > 0 });
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChat) return;
    
    try {
      const data = await uploadFile(activeChat.id, file);
      let type = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'voice';

      socket.emit('send_message', {
        chatId: activeChat.id,
        senderId: currentUser.id,
        type,
        content: data.url,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
      });
    } catch (err) {
      alert('Upload failed');
    }
  };

  const startNewChat = async (userId: string) => {
    const chat = await createChat('private', null, [currentUser.id, userId]);
    setChats(prev => [...prev, chat]);
    setActiveChat(chat);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sidebar for chat list */}
      <div className={`w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold">Secure Comm</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.map(c => {
            const isGroup = c.type === 'group';
            // get other members for private chat name if needed
            return (
              <div 
                key={c.id} 
                onClick={() => setActiveChat(c)}
                className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors ${activeChat?.id === c.id ? 'bg-slate-800' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                    {isGroup ? 'G' : 'P'}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-medium truncate">{isGroup ? c.name : 'Private Chat'}</h3>
                    <p className="text-xs text-slate-400 truncate">Tap to view</p>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="p-4 mt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Directory</h3>
            {users.filter(u => u.id !== currentUser.id).map(u => (
              <div key={u.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-xs">
                    {u.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className={`text-xs ${u.status === 'online' ? 'text-emerald-400' : 'text-slate-500'}`}>{u.status}</p>
                  </div>
                </div>
                <button onClick={() => startNewChat(u.id)} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors">
                  Chat
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className={`flex-1 flex flex-col ${!activeChat ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            <div className="h-16 border-b border-slate-800 px-6 flex items-center bg-slate-950/80 backdrop-blur-sm z-10 shrink-0">
              <button onClick={() => setActiveChat(null)} className="md:hidden mr-4 text-slate-400">Back</button>
              <h2 className="font-semibold">{activeChat.type === 'group' ? activeChat.name : 'Private Chat'}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 bg-slate-950">
              {messages.map(m => {
                const isMe = m.senderId === currentUser.id;
                const sender = users.find(u => u.id === m.senderId);
                return (
                  <div key={m.id} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                    {!isMe && <span className="text-xs text-slate-500 mb-1 ml-1">{sender?.name}</span>}
                    <div className={`p-3 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-slate-800 text-slate-100 rounded-tl-sm'}`}>
                      {m.type === 'text' && <p className="text-sm break-words">{m.content}</p>}
                      {m.type === 'image' && <img src={m.content} alt="Upload" className="max-w-full rounded-lg" />}
                      {m.type === 'video' && <video src={m.content} controls className="max-w-full rounded-lg" />}
                      {m.type === 'file' && (
                        <a href={m.content} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm underline">
                          <File className="w-4 h-4" /> {m.fileName}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {isMe && <CheckCheck className="w-3 h-3 text-blue-400" />}
                    </div>
                  </div>
                );
              })}
              
              {typingUsers[activeChat.id]?.filter(id => id !== currentUser.id).length > 0 && (
                <div className="self-start text-xs text-slate-400 italic flex items-center gap-1">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  Someone is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }} className="flex gap-2 items-center">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-slate-200 transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  value={input}
                  onChange={handleTyping}
                  placeholder="Secure message..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-white"
                />
                <button type="submit" disabled={!input.trim()} className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-full transition-colors flex items-center justify-center">
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-slate-300">No Chat Selected</h2>
            <p className="mt-2 text-sm max-w-sm">Select a conversation from the sidebar or start a new secure communication channel from the directory.</p>
          </div>
        )}
      </div>
    </div>
  );
}

