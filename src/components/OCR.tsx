import React, { useState, useEffect, useRef } from 'react';
import { Topbar } from '../App';
import { getOCRResults, saveOCRResult, deleteOCRResult } from '../lib/api';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import { ScanText, FileText, Settings2, Download, Trash2, Loader2, RotateCw, Image as ImageIcon, CheckCircle2, History, Database } from 'lucide-react';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export default function OCR({ currentUser }: { currentUser: any }) {
  const [activeTab, setActiveTab] = useState<'scan' | 'history'>('scan');
  const [engine, setEngine] = useState<'tesseract' | 'paddle'>('tesseract');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [extractTable, setExtractTable] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [resultText, setResultText] = useState('');
  const [resultJson, setResultJson] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const data = await getOCRResults();
    setHistory(data);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (f.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(f));
      } else {
        setPreviewUrl(null); // PDF preview will be generated during processing
      }
      setResultText('');
      setResultJson(null);
    }
  };

  const processPDF = async (file: File): Promise<string[]> => {
    setProgressMsg('Parsing PDF...');
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const images: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
      setProgressMsg(`Rendering PDF page ${i}/${numPages}...`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
        images.push(canvas.toDataURL('image/jpeg'));
      }
    }
    return images;
  };

  const runOCR = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResultText('');
    setResultJson(null);
    
    try {
      let imageSources: string[] = [];
      
      if (file.type === 'application/pdf') {
        imageSources = await processPDF(file);
      } else {
        imageSources = [URL.createObjectURL(file)];
      }

      let allText = '';
      let allData: any[] = [];

      for (let i = 0; i < imageSources.length; i++) {
        let imgSrc = imageSources[i];
        setProgressMsg(`Processing image ${i + 1}/${imageSources.length}...`);

        if (engine === 'tesseract') {
          // Auto Rotate Logic (OSD)
          if (autoRotate) {
            setProgressMsg(`Analyzing orientation ${i + 1}/${imageSources.length}...`);
            try {
              const osdResult = await Tesseract.recognize(imgSrc, 'osd');
              const data = osdResult.data as any;
              const orientation = data.orientation_degrees;
              if (orientation && orientation !== 0) {
                // Rotate canvas
                setProgressMsg(`Rotating ${orientation} degrees...`);
                const rotatedSrc = await rotateImage(imgSrc, orientation);
                if (rotatedSrc) imgSrc = rotatedSrc;
              }
            } catch (err) {
              console.log("OSD skipped or failed:", err);
            }
          }

          setProgressMsg(`Extracting text ${i + 1}/${imageSources.length}...`);
          const result = await Tesseract.recognize(imgSrc, 'eng', {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProgressMsg(`Recognizing text: ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          
          allText += result.data.text + '\n\n';
          
          // Construct JSON data (Tables / Lines)
          const data = result.data as any;
          const linesData = data.lines ? data.lines.map((line: any) => ({
            text: line.text.trim(),
            confidence: line.confidence,
            bbox: line.bbox
          })) : [];
          
          allData.push({ page: i + 1, lines: linesData });
        } else {
          // PaddleOCR Simulated Fallback
          setProgressMsg('Sending to PaddleOCR node...');
          await new Promise(r => setTimeout(r, 2000)); // simulate network delay
          allText += `[Simulated PaddleOCR Output for Page ${i + 1}]\n`;
          allText += `This is a simulated result because PaddleOCR requires a Python/C++ backend.\nIn a production environment, this would hit the inference server.\n\n`;
          allData.push({ page: i + 1, mock: true, text: "Simulated" });
        }
      }
      
      setResultText(allText);
      const jsonRes = {
        filename: file.name,
        engine,
        autoRotated: autoRotate,
        tableExtraction: extractTable,
        timestamp: new Date().toISOString(),
        pages: allData
      };
      setResultJson(jsonRes);
      
      // Save to history
      await saveOCRResult({
        filename: file.name,
        fileType: file.type,
        engine,
        textContent: allText,
        jsonData: JSON.stringify(jsonRes)
      });
      
      fetchHistory();
      
    } catch (e: any) {
      console.error(e);
      alert('Error processing document: ' + e.message);
    }
    
    setIsProcessing(false);
    setProgressMsg('');
  };

  const rotateImage = (src: string, degrees: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);
        
        if (degrees === 90 || degrees === 270) {
          canvas.width = img.height;
          canvas.height = img.width;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.src = src;
    });
  };

  const handleDownloadJSON = () => {
    if (!resultJson) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(resultJson, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${file?.name || 'ocr_result'}.json`;
    a.click();
  };
  
  const handleDeleteHistory = async (id: string) => {
    if (confirm('Delete this record?')) {
      await deleteOCRResult(id);
      fetchHistory();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      <Topbar title="Optical Character Recognition (OCR)" />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-slate-800 bg-slate-900 p-4 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('scan')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'scan' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ScanText className="w-5 h-5" /> Document Scanner
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <History className="w-5 h-5" /> OCR History
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            
            {activeTab === 'scan' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[600px]">
                
                {/* Left Panel: Configuration & Input */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-blue-500" /> Extraction Settings
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">OCR Engine</label>
                        <select 
                          value={engine} 
                          onChange={e => setEngine(e.target.value as 'tesseract' | 'paddle')}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 text-sm"
                        >
                          <option value="tesseract">Tesseract.js (Local/Browser)</option>
                          <option value="paddle">PaddleOCR (High Accuracy API)</option>
                        </select>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="autoRotate"
                          checked={autoRotate}
                          onChange={e => setAutoRotate(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-blue-600"
                        />
                        <label htmlFor="autoRotate" className="text-sm text-slate-300 flex items-center gap-1">
                          <RotateCw className="w-4 h-4 text-slate-500" /> Auto-Detect Orientation
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="extractTable"
                          checked={extractTable}
                          onChange={e => setExtractTable(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-950 text-blue-600"
                        />
                        <label htmlFor="extractTable" className="text-sm text-slate-300 flex items-center gap-1">
                          <Database className="w-4 h-4 text-slate-500" /> Structure as Tables (JSON)
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" /> Document Input
                    </h2>
                    
                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-4 flex flex-col items-center justify-center bg-slate-950 flex-1 relative overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-[250px] object-contain rounded-lg relative z-10" />
                      ) : file && file.type === 'application/pdf' ? (
                        <div className="text-center z-10">
                          <FileText className="w-16 h-16 text-rose-500 mx-auto mb-2" />
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-slate-500">PDF Document</p>
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 z-10">
                          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Upload Image or PDF</p>
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                      />
                    </div>
                    
                    <button 
                      onClick={runOCR}
                      disabled={!file || isProcessing}
                      className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-3 rounded-xl transition-colors font-medium text-white flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" /> {progressMsg || 'Processing...'}
                        </>
                      ) : (
                        <>
                          <ScanText className="w-5 h-5" /> Start OCR Process
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Panel: Results */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                    <h2 className="font-bold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Extracted Data
                    </h2>
                    {resultJson && (
                      <button 
                        onClick={handleDownloadJSON}
                        className="text-xs flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-colors font-medium"
                      >
                        <Download className="w-4 h-4" /> Export JSON
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 p-4 bg-slate-950 overflow-y-auto relative">
                    {!resultText && !isProcessing && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                        Results will appear here
                      </div>
                    )}
                    
                    {resultText && (
                      <pre className="font-sans whitespace-pre-wrap text-sm text-slate-300 leading-relaxed">
                        {resultText}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'history' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <History className="w-6 h-6 text-blue-500" /> OCR Processing History
                </h2>
                
                <div className="flex-1 overflow-y-auto space-y-4">
                  {history.length === 0 && (
                    <div className="text-center text-slate-500 mt-10">No OCR records found.</div>
                  )}
                  {history.map(record => (
                    <div key={record.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex gap-4">
                      <div className="p-3 bg-slate-900 rounded-xl shrink-0 h-fit">
                        {record.fileType === 'application/pdf' ? (
                          <FileText className="w-6 h-6 text-rose-500" />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-200 truncate">{record.filename}</h3>
                        <p className="text-xs text-slate-500 mt-1 mb-2">
                          Engine: <span className="capitalize">{record.engine}</span> • {new Date(record.createdAt).toLocaleString()}
                        </p>
                        <div className="text-sm text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800 max-h-24 overflow-hidden relative">
                          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-900 to-transparent"></div>
                          {record.textContent}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <button 
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(record.jsonData);
                            const a = document.createElement('a');
                            a.href = dataStr;
                            a.download = `${record.filename}.json`;
                            a.click();
                          }}
                          className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
                          title="Download JSON"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteHistory(record.id)}
                          className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
