import React, { useState, useEffect, useRef } from 'react';
import { Topbar } from '../App';
import { getFaces, addFaceProfile, matchFace, deleteFaceProfile } from '../lib/api';
import * as faceapi from '@vladmandic/face-api';
import { ScanFace, UserPlus, Database, Search, Trash2, ShieldAlert, CheckCircle2, User, Loader2 } from 'lucide-react';

export default function FaceRecognition({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'match' | 'database'>('match');
  const [faces, setFaces] = useState<any[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Initializing Face Recognition Engine (OpenCV/InsightFace architecture)...');
  
  // Matching State
  const [matchImage, setMatchImage] = useState<string | null>(null);
  const [matchFile, setMatchFile] = useState<File | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const matchImageRef = useRef<HTMLImageElement>(null);

  // Database State
  const [newSubjectName, setNewSubjectName] = useState('');
  const [dbImage, setDbImage] = useState<string | null>(null);
  const [dbFile, setDbFile] = useState<File | null>(null);
  const dbImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    loadModels();
    fetchFaces();
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/';
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      setLoadingMsg('');
    } catch (err) {
      setLoadingMsg('Failed to load neural network models.');
      console.error(err);
    }
  };

  const fetchFaces = async () => {
    const data = await getFaces();
    setFaces(data);
  };

  const getFaceEmbedding = async (imageElement: HTMLImageElement) => {
    const detection = await faceapi.detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection?.descriptor;
  };

  const handleMatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMatchFile(file);
      setMatchImage(URL.createObjectURL(file));
      setMatches([]);
    }
  };

  const handleRunMatch = async () => {
    if (!matchFile || !matchImageRef.current) return;
    setIsProcessing(true);
    setMatches([]);
    
    try {
      const descriptor = await getFaceEmbedding(matchImageRef.current);
      if (!descriptor) {
        alert('No face detected in the image.');
        setIsProcessing(false);
        return;
      }
      
      const embeddingArray = Array.from(descriptor);
      const data = await matchFace(matchFile, JSON.stringify(embeddingArray));
      setMatches(data);
    } catch (e) {
      console.error(e);
      alert('Error processing face match.');
    }
    
    setIsProcessing(false);
  };

  const handleDbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDbFile(file);
      setDbImage(URL.createObjectURL(file));
    }
  };

  const handleAddProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbFile || !dbImageRef.current || !newSubjectName.trim()) return;
    
    setIsProcessing(true);
    try {
      const descriptor = await getFaceEmbedding(dbImageRef.current);
      if (!descriptor) {
        alert('No face detected. Please try a clearer image.');
        setIsProcessing(false);
        return;
      }
      
      const embeddingArray = Array.from(descriptor);
      await addFaceProfile(newSubjectName, dbFile, JSON.stringify(embeddingArray));
      
      setNewSubjectName('');
      setDbFile(null);
      setDbImage(null);
      fetchFaces();
      alert('Profile added successfully.');
    } catch (e) {
      console.error(e);
      alert('Error adding profile.');
    }
    setIsProcessing(false);
  };

  const handleDeleteProfile = async (id: string) => {
    if (confirm('Delete this face profile?')) {
      await deleteFaceProfile(id);
      fetchFaces();
    }
  };

  if (!modelsLoaded) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        <Topbar title="Face Recognition" />
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
          <p className="font-mono text-sm">{loadingMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      <Topbar title="Biometric Intelligence (Face)" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('match')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'match' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Search className="w-5 h-5" /> Face Matching
          </button>
          <button 
            onClick={() => setActiveTab('database')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'database' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Database className="w-5 h-5" /> Subject Database
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            
            {activeTab === 'match' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <ScanFace className="w-6 h-6 text-blue-500" /> Identity Verification
                  </h2>
                  <p className="text-sm text-slate-400 mb-6">Upload an unknown face to match against the biometric database using 128D embeddings.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-950 min-h-[300px]">
                        {matchImage ? (
                          <img ref={matchImageRef} src={matchImage} alt="Query" className="max-h-[250px] object-contain rounded-lg" crossOrigin="anonymous" />
                        ) : (
                          <div className="text-center text-slate-500">
                            <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Select image to analyze</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-center py-3 rounded-xl cursor-pointer transition-colors font-medium text-slate-200">
                          Select Image
                          <input type="file" accept="image/*" className="hidden" onChange={handleMatchUpload} />
                        </label>
                        <button 
                          onClick={handleRunMatch}
                          disabled={!matchImage || isProcessing}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-center py-3 rounded-xl transition-colors font-medium text-white flex items-center justify-center gap-2"
                        >
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                          Run Scan
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-y-auto max-h-[400px]">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Match Results</h3>
                      
                      {matches.length === 0 && !isProcessing && (
                        <div className="text-center text-slate-500 mt-10">
                          <p>No matches found yet.</p>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {matches.map((m, idx) => (
                          <div key={m.id} className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center gap-4">
                            <div className="text-lg font-bold text-slate-600 w-6">#{idx + 1}</div>
                            <img src={m.imageUrl} alt={m.subjectName} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                            <div className="flex-1">
                              <p className="font-semibold text-slate-200">{m.subjectName}</p>
                              <p className="text-xs text-slate-500 font-mono">ID: {m.id.split('-')[0]}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${m.similarity > 0.8 ? 'text-emerald-500' : m.similarity > 0.6 ? 'text-amber-500' : 'text-rose-500'}`}>
                                {(m.similarity * 100).toFixed(1)}%
                              </p>
                              <p className="text-[10px] text-slate-500 uppercase">Confidence</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <UserPlus className="w-6 h-6 text-emerald-500" /> Enroll New Subject
                  </h2>
                  
                  <form onSubmit={handleAddProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-950 min-h-[250px]">
                      {dbImage ? (
                        <img ref={dbImageRef} src={dbImage} alt="New Subject" className="max-h-[200px] object-contain rounded-lg" crossOrigin="anonymous" />
                      ) : (
                        <div className="text-center text-slate-500">
                          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Subject Photo</p>
                        </div>
                      )}
                      <label className="mt-4 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm font-medium">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleDbUpload} />
                      </label>
                    </div>
                    
                    <div className="space-y-4 flex flex-col justify-center">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Subject Full Name</label>
                        <input 
                          type="text"
                          required
                          value={newSubjectName}
                          onChange={e => setNewSubjectName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      
                      <button 
                        type="submit"
                        disabled={!dbImage || !newSubjectName.trim() || isProcessing}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 py-3 rounded-xl font-medium transition-colors text-white flex justify-center items-center gap-2"
                      >
                        {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                        Extract Embedding & Save
                      </button>
                    </div>
                  </form>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">Enrolled Subjects ({faces.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {faces.map(f => (
                      <div key={f.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 relative group">
                        <img src={f.imageUrl} alt={f.subjectName} className="w-full aspect-square object-cover rounded-lg mb-2" />
                        <p className="font-medium text-sm truncate">{f.subjectName}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">128D Encoded</p>
                        
                        <button 
                          onClick={() => handleDeleteProfile(f.id)}
                          className="absolute top-4 right-4 p-2 bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
