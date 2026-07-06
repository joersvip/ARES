import React, { useState, useEffect, useRef } from 'react';
import { Topbar } from '../App';
import { getCases, getCaseDetails, createCase, updateCase, deleteCase, uploadEvidence, addTimelineNote, getUsers } from '../lib/api';
import { Plus, Edit2, Trash2, FileText, Image as ImageIcon, Video, File, Download, X, Clock, Upload } from 'lucide-react';

export default function Cases({ currentUser }: { currentUser: any }) {
  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseDetails, setCaseDetails] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    loadCases();
    getUsers().then(setUsers);
  }, []);

  const loadCases = async () => {
    const data = await getCases();
    setCases(data);
  };

  useEffect(() => {
    if (selectedCaseId) {
      loadCaseDetails(selectedCaseId);
    } else {
      setCaseDetails(null);
    }
  }, [selectedCaseId]);

  const loadCaseDetails = async (id: string) => {
    const data = await getCaseDetails(id);
    setCaseDetails(data);
  };

  const handleSaveCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.id) {
      await updateCase(formData.id, { ...formData, updatedBy: currentUser.id });
    } else {
      await createCase({ ...formData, createdBy: currentUser.id });
    }
    setIsFormOpen(false);
    loadCases();
    if (formData.id === selectedCaseId) loadCaseDetails(selectedCaseId);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this case?')) {
      await deleteCase(id);
      if (selectedCaseId === id) setSelectedCaseId(null);
      loadCases();
    }
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCaseId) return;
    
    try {
      await uploadEvidence(selectedCaseId, file, currentUser.id);
      loadCaseDetails(selectedCaseId);
    } catch (err) {
      alert('Failed to upload evidence');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteInput.trim() || !selectedCaseId) return;
    
    await addTimelineNote(selectedCaseId, noteInput, currentUser.id);
    setNoteInput('');
    loadCaseDetails(selectedCaseId);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`w-full md:w-1/3 border-r border-slate-800 flex flex-col bg-slate-900 ${selectedCaseId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Cases</h2>
          <button 
            onClick={() => { setFormData({}); setIsFormOpen(true); }}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cases.map((c) => (
            <div 
              key={c.id} 
              onClick={() => setSelectedCaseId(c.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                selectedCaseId === c.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium truncate pr-2">{c.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  c.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
                  c.status === 'closed' ? 'bg-slate-800 text-slate-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {c.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-slate-400 truncate mb-3">{c.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Off: {c.officerName || 'Unassigned'}</span>
                <span className={`px-1.5 py-0.5 rounded ${
                  c.priority === 'critical' ? 'bg-rose-500/20 text-rose-400' : ''
                }`}>{c.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-slate-950 print:bg-white print:text-black overflow-y-auto ${!selectedCaseId ? 'hidden md:flex' : 'flex'}`}>
        {selectedCaseId && caseDetails ? (
          <div className="p-6 max-w-4xl mx-auto w-full">
            <div className="flex items-start justify-between mb-8 print:hidden">
              <button onClick={() => setSelectedCaseId(null)} className="md:hidden text-slate-400 hover:text-white">
                Back to Cases
              </button>
              <div className="flex gap-2 ml-auto">
                <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
                  <Download className="w-4 h-4" /> Export PDF
                </button>
                <button onClick={() => { setFormData(caseDetails); setIsFormOpen(true); }} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(caseDetails.id)} className="p-1.5 bg-rose-900/30 text-rose-500 hover:bg-rose-900/50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{caseDetails.title}</h1>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                  caseDetails.status === 'open' ? 'bg-emerald-500/20 text-emerald-400 print:text-emerald-700' :
                  caseDetails.status === 'closed' ? 'bg-slate-800 text-slate-400 print:text-slate-600' :
                  'bg-amber-500/20 text-amber-400 print:text-amber-700'
                }`}>
                  {caseDetails.status}
                </span>
              </div>
              <p className="text-slate-400 print:text-slate-600 text-lg mb-4">{caseDetails.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-900 print:bg-slate-100 rounded-xl">
                <div>
                  <p className="text-xs text-slate-500 print:text-slate-500 uppercase font-semibold mb-1">Priority</p>
                  <p className="font-medium capitalize">{caseDetails.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 print:text-slate-500 uppercase font-semibold mb-1">Officer</p>
                  <p className="font-medium">{caseDetails.officerName || 'Unassigned'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 print:text-slate-500 uppercase font-semibold mb-1">Created</p>
                  <p className="font-medium text-sm">{new Date(caseDetails.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 print:text-slate-500 uppercase font-semibold mb-1">Updated</p>
                  <p className="font-medium text-sm">{new Date(caseDetails.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-500" /> Evidence
                  </h3>
                  <div className="print:hidden">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleUploadEvidence} />
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300">
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {caseDetails.evidence?.length === 0 && <p className="text-sm text-slate-500">No evidence attached.</p>}
                  {caseDetails.evidence?.map((e: any) => (
                    <div key={e.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-3">
                      <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
                        {e.type === 'image' ? <ImageIcon className="w-5 h-5" /> :
                         e.type === 'video' ? <Video className="w-5 h-5" /> : <File className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-medium text-sm truncate">{e.name}</p>
                        <p className="text-xs text-slate-500">{new Date(e.uploadedAt).toLocaleString()}</p>
                      </div>
                      <a href={e.url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-400 transition-colors print:hidden">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-purple-500" /> Timeline
                </h3>
                <div className="space-y-4">
                  <form onSubmit={handleAddNote} className="mb-4 flex gap-2 print:hidden">
                    <input 
                      type="text" 
                      value={noteInput}
                      onChange={e => setNoteInput(e.target.value)}
                      placeholder="Add a timeline note..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button type="submit" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors">
                      Add
                    </button>
                  </form>
                  
                  <div className="relative border-l-2 border-slate-800 ml-3 space-y-6">
                    {caseDetails.timeline?.map((t: any) => (
                      <div key={t.id} className="relative pl-6">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-950 border-2 border-purple-500"></div>
                        <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                          <p className="text-sm">{t.description}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                            <span>{new Date(t.createdAt).toLocaleString()}</span>
                            {t.creatorName && <span>• by {t.creatorName}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-6 text-center">
            <FolderOpen className="w-16 h-16 mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-slate-300">No Case Selected</h2>
            <p className="mt-2 text-sm max-w-sm">Select a case from the sidebar to view its details, timeline, and evidence.</p>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">{formData.id ? 'Edit Case' : 'New Case'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveCase} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
                <input required type="text" value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500"></textarea>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Status</label>
                  <select value={formData.status || 'open'} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Priority</label>
                  <select value={formData.priority || 'medium'} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Assign Officer</label>
                <select value={formData.officerId || ''} onChange={e => setFormData({...formData, officerId: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500">
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors">
                  Save Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
