import React, { useState, useEffect } from 'react';
import { Topbar } from '../App';
import { getAllEvidence, getEvidenceDetails, addChainOfCustody, getUsers } from '../lib/api';
import { Database, Image as ImageIcon, Video, File, Download, Link, Eye, Activity, Key, FileText, X } from 'lucide-react';

export default function Evidence({ currentUser }: { currentUser: any }) {
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [evidenceDetails, setEvidenceDetails] = useState<any>(null);
  
  const [chainAction, setChainAction] = useState('transferred');
  const [chainNotes, setChainNotes] = useState('');
  
  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    const data = await getAllEvidence();
    setEvidenceList(data);
  };

  useEffect(() => {
    if (selectedEvidenceId) {
      loadEvidenceDetails(selectedEvidenceId);
    } else {
      setEvidenceDetails(null);
    }
  }, [selectedEvidenceId]);

  const loadEvidenceDetails = async (id: string) => {
    const data = await getEvidenceDetails(id);
    setEvidenceDetails(data);
  };

  const handleAddChainOfCustody = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvidenceId) return;
    
    await addChainOfCustody(selectedEvidenceId, {
      action: chainAction,
      notes: chainNotes,
      performedBy: currentUser.id
    });
    setChainNotes('');
    loadEvidenceDetails(selectedEvidenceId);
  };

  const getIcon = (type: string) => {
    if (type === 'image') return <ImageIcon className="w-5 h-5" />;
    if (type === 'video') return <Video className="w-5 h-5" />;
    if (type === 'audio') return <Activity className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`w-full md:w-1/3 border-r border-slate-800 flex flex-col bg-slate-900 ${selectedEvidenceId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-xl font-semibold">Evidence Locker</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {evidenceList.map((e) => (
            <div 
              key={e.id} 
              onClick={() => setSelectedEvidenceId(e.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-colors ${
                selectedEvidenceId === e.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-950 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-800 rounded-lg text-blue-400 shrink-0">
                  {getIcon(e.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate text-sm">{e.name}</h3>
                  <p className="text-xs text-slate-500 truncate mb-1">Case: {e.caseTitle}</p>
                  <p className="text-[10px] text-slate-500">{new Date(e.uploadedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-slate-950 overflow-y-auto ${!selectedEvidenceId ? 'hidden md:flex' : 'flex'}`}>
        {selectedEvidenceId && evidenceDetails ? (
          <div className="p-6 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-8">
              <button onClick={() => setSelectedEvidenceId(null)} className="md:hidden text-slate-400 hover:text-white">
                Back to List
              </button>
              <a 
                href={evidenceDetails.url} 
                download 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ml-auto"
              >
                <Download className="w-4 h-4" /> Download Original
              </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-slate-800 rounded-xl text-blue-400">
                      {getIcon(evidenceDetails.type)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold truncate">{evidenceDetails.name}</h2>
                      <p className="text-sm text-slate-400 capitalize">{evidenceDetails.type} Evidence</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold mb-1">Related Case</p>
                      <p className="text-sm">{evidenceDetails.caseTitle}</p>
                    </div>
                    
                    {evidenceDetails.hash && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                          <Key className="w-3 h-3" /> Integrity Hash (SHA-256)
                        </p>
                        <p className="text-xs font-mono bg-slate-950 p-2 rounded-lg border border-slate-800 break-all text-emerald-400">
                          {evidenceDetails.hash}
                        </p>
                      </div>
                    )}
                    
                    {evidenceDetails.metadata && (
                      <div>
                        <p className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> Metadata
                        </p>
                        <pre className="text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto text-slate-300">
                          {evidenceDetails.metadata}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col items-center justify-center p-4">
                  <p className="text-xs text-slate-500 uppercase font-semibold mb-4 w-full text-left">Preview</p>
                  {evidenceDetails.type === 'image' && (
                    <img src={evidenceDetails.url} alt="Evidence" className="max-h-96 rounded-lg object-contain" />
                  )}
                  {evidenceDetails.type === 'video' && (
                    <video src={evidenceDetails.url} controls className="max-h-96 rounded-lg w-full" />
                  )}
                  {evidenceDetails.type === 'audio' && (
                    <audio src={evidenceDetails.url} controls className="w-full" />
                  )}
                  {evidenceDetails.type === 'document' && (
                    <div className="flex flex-col items-center justify-center h-48 w-full bg-slate-950 rounded-lg border border-slate-800 border-dashed">
                      <File className="w-12 h-12 text-slate-600 mb-2" />
                      <p className="text-sm text-slate-400">Document preview not available</p>
                      <a href={evidenceDetails.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline mt-2 text-sm">Open File</a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
                    <Link className="w-5 h-5 text-purple-500" /> Chain of Custody
                  </h3>
                  
                  <form onSubmit={handleAddChainOfCustody} className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                    <div className="flex gap-2">
                      <select 
                        value={chainAction} 
                        onChange={e => setChainAction(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white"
                      >
                        <option value="transferred">Transferred</option>
                        <option value="analyzed">Analyzed</option>
                        <option value="stored">Stored</option>
                        <option value="released">Released</option>
                      </select>
                      <input 
                        type="text"
                        required
                        value={chainNotes}
                        onChange={e => setChainNotes(e.target.value)}
                        placeholder="Action notes..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 text-white"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                      Log Action
                    </button>
                  </form>
                  
                  <div className="relative border-l-2 border-slate-800 ml-3 space-y-6">
                    {evidenceDetails.chainOfCustody?.map((c: any) => (
                      <div key={c.id} className="relative pl-6">
                        <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-purple-500"></div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold capitalize text-purple-400">{c.action}</span>
                            <span className="text-xs text-slate-500">• {new Date(c.timestamp).toLocaleString()}</span>
                          </div>
                          <p className="text-sm text-slate-300 mb-1">{c.notes}</p>
                          <p className="text-xs text-slate-500">by {c.performedByName || 'System'}</p>
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
            <Database className="w-16 h-16 mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-slate-300">No Evidence Selected</h2>
            <p className="mt-2 text-sm max-w-sm">Select an item from the locker to view its details, integrity hash, and chain of custody.</p>
          </div>
        )}
      </div>
    </div>
  );
}
