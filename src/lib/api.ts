import { io, Socket } from 'socket.io-client';

export const API_URL = ''; // Same origin

export async function login(name: string, email: string, password?: string) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function getChats(userId: string) {
  const res = await fetch(`/api/chats?userId=${userId}`);
  return res.json();
}

export async function createChat(type: string, name: string | null, memberIds: string[]) {
  const res = await fetch('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, name, memberIds }),
  });
  return res.json();
}

export async function getMessages(chatId: string) {
  const res = await fetch(`/api/chats/${chatId}/messages`);
  return res.json();
}

export async function getUsers() {
  const res = await fetch('/api/users');
  return res.json();
}

export async function uploadFile(chatId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`/api/chats/${chatId}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

// Case Management APIs
export async function getCases() {
  const res = await fetch('/api/cases');
  return res.json();
}

export async function getCaseDetails(caseId: string) {
  const res = await fetch(`/api/cases/${caseId}`);
  if (!res.ok) throw new Error('Failed to load case');
  return res.json();
}

export async function createCase(data: any) {
  const res = await fetch('/api/cases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function updateCase(caseId: string, data: any) {
  const res = await fetch(`/api/cases/${caseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteCase(caseId: string) {
  const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
  return res.json();
}

export async function getAllEvidence() {
  const res = await fetch('/api/evidence');
  return res.json();
}

export async function getEvidenceDetails(evidenceId: string) {
  const res = await fetch(`/api/evidence/${evidenceId}`);
  if (!res.ok) throw new Error('Failed to load evidence');
  return res.json();
}

export async function addChainOfCustody(evidenceId: string, data: any) {
  const res = await fetch(`/api/evidence/${evidenceId}/chain-of-custody`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function uploadEvidence(caseId: string, file: File, uploadedBy: string, name?: string, hash?: string, metadata?: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadedBy', uploadedBy);
  if (name) formData.append('name', name);
  if (hash) formData.append('hash', hash);
  if (metadata) formData.append('metadata', metadata);
  
  const res = await fetch(`/api/cases/${caseId}/evidence`, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function addTimelineNote(caseId: string, description: string, createdBy: string) {
  const res = await fetch(`/api/cases/${caseId}/timeline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, createdBy })
  });
  return res.json();
}

// AI Management APIs
export async function getAISettings(userId: string) {
  const res = await fetch(`/api/ai/settings?userId=${userId}`);
  return res.json();
}

export async function updateAISettings(data: any) {
  const res = await fetch('/api/ai/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function analyzeText(userId: string, text: string, task: string) {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text, task })
  });
  return res.json();
}

export async function getRAGDocuments(userId: string) {
  const res = await fetch(`/api/ai/rag/documents?userId=${userId}`);
  return res.json();
}

export async function addRAGDocument(userId: string, title: string, content: string) {
  const res = await fetch('/api/ai/rag/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, title, content })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to add document');
  }
  return res.json();
}

export async function deleteRAGDocument(id: string) {
  const res = await fetch(`/api/ai/rag/documents/${id}`, { method: 'DELETE' });
  return res.json();
}

// Face Recognition APIs
export async function getFaces() {
  const res = await fetch('/api/faces');
  return res.json();
}

export async function addFaceProfile(subjectName: string, file: File, embedding: string) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('subjectName', subjectName);
  formData.append('embedding', embedding);
  
  const res = await fetch('/api/faces', {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function matchFace(file: File, embedding: string) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('embedding', embedding);
  
  const res = await fetch('/api/faces/match', {
    method: 'POST',
    body: formData
  });
  return res.json();
}

export async function deleteFaceProfile(id: string) {
  const res = await fetch(`/api/faces/${id}`, { method: 'DELETE' });
  return res.json();
}

// OCR APIs
export async function getOCRResults() {
  const res = await fetch('/api/ocr');
  return res.json();
}

export async function saveOCRResult(data: any) {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

export async function deleteOCRResult(id: string) {
  const res = await fetch(`/api/ocr/${id}`, { method: 'DELETE' });
  return res.json();
}

// GIS APIs
export async function getGISMarkers() {
  const res = await fetch('/api/gis/markers');
  return res.json();
}
export async function addGISMarker(data: {title: string, description?: string, lat: number, lng: number}) {
  const res = await fetch('/api/gis/markers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
export async function deleteGISMarker(id: string) {
  const res = await fetch(`/api/gis/markers/${id}`, { method: 'DELETE' });
  return res.json();
}
export async function getGISTracks() {
  const res = await fetch('/api/gis/tracks');
  return res.json();
}
export async function addGISTrack(data: {name: string, pathData: [number, number][]}) {
  const res = await fetch('/api/gis/tracks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
export async function getGISGeofences() {
  const res = await fetch('/api/gis/geofences');
  return res.json();
}
export async function addGISGeofence(data: {name: string, fenceType: string, geomData: any}) {
  const res = await fetch('/api/gis/geofences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}
export async function deleteGISGeofence(id: string) {
  const res = await fetch(`/api/gis/geofences/${id}`, { method: 'DELETE' });
  return res.json();
}

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io();
  }
  return socket;
}
