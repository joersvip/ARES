import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { db } from './src/db/index.js';
import { users, chats, chatMembers, messages, messageReads, cases, caseEvidence, caseTimeline, chainOfCustody, aiSettings, ragDocuments, faceProfiles, ocrResults, gisMarkers, gisTracks, gisGeofences } from './src/db/schema.js';
import { eq, or, and, desc } from 'drizzle-orm';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import OpenAI from 'openai';

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const upload = multer({ dest: 'uploads/' });
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  // REST API
  
  app.post('/api/login', async (req, res) => {
    const { name, email, password } = req.body;
    
    // Admin login check
    if (email === 'admin' || name === 'admin') {
      if (password !== 'admin') {
        res.status(401).json({ error: 'Invalid admin credentials' });
        return;
      }
    }
    
    if (!name || !email) { res.status(400).json({ error: 'Name and email required' }); return; }
    
    let user = await db.select().from(users).where(eq(users.email, email)).limit(1).then(r => r[0]);
    if (!user) {
      user = await db.insert(users).values({ name, email, status: 'online' }).returning().then(r => r[0]);
    } else {
      user = await db.update(users).set({ status: 'online' }).where(eq(users.id, user.id)).returning().then(r => r[0]);
    }
    res.json(user);
  });
  
  app.get('/api/users', async (req, res) => {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  });

  // --- Cases API ---
  app.get('/api/cases', async (req, res) => {
    const allCases = await db.select({
      case: cases,
      officer: users
    }).from(cases).leftJoin(users, eq(cases.officerId, users.id)).orderBy(desc(cases.createdAt));
    res.json(allCases.map(c => ({ ...c.case, officerName: c.officer?.name })));
  });

  app.get('/api/cases/:id', async (req, res) => {
    const c = await db.select({
      case: cases,
      officer: users
    }).from(cases).leftJoin(users, eq(cases.officerId, users.id)).where(eq(cases.id, req.params.id)).limit(1).then(r => r[0]);
    
    if (!c) { res.status(404).json({ error: 'Case not found' }); return; }
    
    const evidence = await db.select().from(caseEvidence).where(eq(caseEvidence.caseId, req.params.id));
    const timeline = await db.select({
      event: caseTimeline,
      creator: users
    }).from(caseTimeline).leftJoin(users, eq(caseTimeline.createdBy, users.id)).where(eq(caseTimeline.caseId, req.params.id)).orderBy(desc(caseTimeline.createdAt));
    
    res.json({
      ...c.case,
      officerName: c.officer?.name,
      evidence,
      timeline: timeline.map(t => ({ ...t.event, creatorName: t.creator?.name }))
    });
  });

  app.post('/api/cases', async (req, res) => {
    const { title, description, status, priority, officerId, createdBy } = req.body;
    const newCase = await db.insert(cases).values({ title, description, status, priority, officerId }).returning().then(r => r[0]);
    
    await db.insert(caseTimeline).values({
      caseId: newCase.id,
      eventType: 'created',
      description: 'Case created',
      createdBy
    });
    
    res.json(newCase);
  });

  app.put('/api/cases/:id', async (req, res) => {
    const { title, description, status, priority, officerId, updatedBy } = req.body;
    
    const oldCase = await db.select().from(cases).where(eq(cases.id, req.params.id)).limit(1).then(r => r[0]);
    if (!oldCase) { res.status(404).json({ error: 'Case not found' }); return; }
    
    const updatedCase = await db.update(cases).set({ title, description, status, priority, officerId, updatedAt: new Date() }).where(eq(cases.id, req.params.id)).returning().then(r => r[0]);
    
    if (oldCase.status !== status) {
      await db.insert(caseTimeline).values({
        caseId: updatedCase.id,
        eventType: 'status_change',
        description: `Status changed from ${oldCase.status} to ${status}`,
        createdBy: updatedBy
      });
    }
    
    res.json(updatedCase);
  });

  app.delete('/api/cases/:id', async (req, res) => {
    await db.delete(cases).where(eq(cases.id, req.params.id));
    res.json({ success: true });
  });

  app.post('/api/cases/:id/evidence', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    
    const { uploadedBy, name } = req.body;
    
    let type = 'document';
    if (file.mimetype.startsWith('image/')) type = 'image';
    else if (file.mimetype.startsWith('video/')) type = 'video';
    else if (file.mimetype.startsWith('audio/')) type = 'audio';
    
    const evidence = await db.insert(caseEvidence).values({
      caseId: req.params.id as string,
      name: name || file.originalname,
      type,
      url: `/uploads/${file.filename}`,
      hash: req.body.hash || null,
      metadata: req.body.metadata || null,
      uploadedBy
    }).returning().then(r => r[0]);
    
    await db.insert(caseTimeline).values({
      caseId: req.params.id as string,
      eventType: 'evidence_added',
      description: `Evidence added: ${evidence.name}`,
      createdBy: uploadedBy
    });
    
    await db.insert(chainOfCustody).values({
      evidenceId: evidence.id,
      action: 'collected',
      performedBy: uploadedBy,
      notes: 'Initial upload to system'
    });
    
    res.json(evidence);
  });

  app.get('/api/evidence', async (req, res) => {
    const allEvidence = await db.select({
      evidence: caseEvidence,
      case: cases,
      uploader: users
    }).from(caseEvidence)
      .leftJoin(cases, eq(caseEvidence.caseId, cases.id))
      .leftJoin(users, eq(caseEvidence.uploadedBy, users.id))
      .orderBy(desc(caseEvidence.uploadedAt));
      
    res.json(allEvidence.map(e => ({
      ...e.evidence,
      caseTitle: e.case?.title,
      uploaderName: e.uploader?.name
    })));
  });

  app.get('/api/evidence/:id', async (req, res) => {
    const e = await db.select({
      evidence: caseEvidence,
      case: cases,
      uploader: users
    }).from(caseEvidence)
      .leftJoin(cases, eq(caseEvidence.caseId, cases.id))
      .leftJoin(users, eq(caseEvidence.uploadedBy, users.id))
      .where(eq(caseEvidence.id, req.params.id)).limit(1).then(r => r[0]);
      
    if (!e) { res.status(404).json({ error: 'Evidence not found' }); return; }
    
    const chain = await db.select({
      record: chainOfCustody,
      user: users
    }).from(chainOfCustody)
      .leftJoin(users, eq(chainOfCustody.performedBy, users.id))
      .where(eq(chainOfCustody.evidenceId, req.params.id))
      .orderBy(desc(chainOfCustody.timestamp));
      
    res.json({
      ...e.evidence,
      caseTitle: e.case?.title,
      uploaderName: e.uploader?.name,
      chainOfCustody: chain.map(c => ({ ...c.record, performedByName: c.user?.name }))
    });
  });

  app.post('/api/evidence/:id/chain-of-custody', async (req, res) => {
    const { action, performedBy, notes } = req.body;
    const record = await db.insert(chainOfCustody).values({
      evidenceId: req.params.id,
      action,
      performedBy,
      notes
    }).returning().then(r => r[0]);
    res.json(record);
  });

  app.post('/api/cases/:id/timeline', async (req, res) => {
    const { description, createdBy } = req.body;
    const event = await db.insert(caseTimeline).values({
      caseId: req.params.id,
      eventType: 'note',
      description,
      createdBy
    }).returning().then(r => r[0]);
    res.json(event);
  });
  // --- End Cases API ---

  // --- AI API ---
  const getAIClient = async (userId: string) => {
    let settings = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1).then(r => r[0]);
    if (!settings) {
      settings = await db.insert(aiSettings).values({ userId }).returning().then(r => r[0]);
    }
    
    return {
      client: new OpenAI({
        baseURL: settings.endpoint || 'http://localhost:11434/v1',
        apiKey: settings.apiKey || 'ollama', // ollama doesn't need key but openai sdk requires it
      }),
      settings
    };
  };

  app.get('/api/ai/settings', async (req, res) => {
    const userId = req.query.userId as string;
    let settings = await db.select().from(aiSettings).where(eq(aiSettings.userId, userId)).limit(1).then(r => r[0]);
    if (!settings) {
      settings = await db.insert(aiSettings).values({ userId }).returning().then(r => r[0]);
    }
    res.json(settings);
  });

  app.put('/api/ai/settings', async (req, res) => {
    const { userId, provider, endpoint, apiKey, model, embeddingModel } = req.body;
    const settings = await db.update(aiSettings)
      .set({ provider, endpoint, apiKey, model, embeddingModel })
      .where(eq(aiSettings.userId, userId))
      .returning().then(r => r[0]);
    res.json(settings);
  });

  app.post('/api/ai/analyze', async (req, res) => {
    const { userId, text, task } = req.body;
    try {
      const { client, settings } = await getAIClient(userId);
      let systemPrompt = '';
      
      switch (task) {
        case 'summarize': systemPrompt = 'You are a professional analyst. Summarize the following text concisely.'; break;
        case 'classify': systemPrompt = 'Classify the following text into one of these categories: Urgent, Routine, Suspicious, Informational. Only output the category name.'; break;
        case 'extract': systemPrompt = 'Extract all named entities (Persons, Organizations, Locations, Dates) from the following text and format them as a JSON list.'; break;
        case 'risk': systemPrompt = 'Analyze the risk level of the following text (Low, Medium, High) and provide a 1-sentence justification. Output format: [Level] - [Justification]'; break;
        default: systemPrompt = 'You are a helpful assistant.';
      }

      const response = await client.chat.completions.create({
        model: settings.model || 'llama3',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ]
      });
      
      res.json({ result: response.choices[0]?.message?.content || '' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/ai/chat/stream', async (req, res) => {
    const { userId, messages: chatMessages, useRag } = req.body;
    
    try {
      const { client, settings } = await getAIClient(userId);
      let context = '';

      if (useRag) {
        const lastMsg = chatMessages[chatMessages.length - 1].content;
        try {
          const embResponse = await client.embeddings.create({
            model: settings.embeddingModel || 'nomic-embed-text',
            input: lastMsg,
          });
          const queryVector = embResponse.data[0].embedding;
          
          // Naive in-memory cosine similarity since we don't have pgvector in this schema
          const docs = await db.select().from(ragDocuments).where(eq(ragDocuments.userId, userId));
          
          const scoredDocs = docs.filter(d => d.embedding).map(d => {
            const docVector = JSON.parse(d.embedding!);
            // Calculate cosine similarity
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < queryVector.length; i++) {
              dotProduct += queryVector[i] * docVector[i];
              normA += queryVector[i] * queryVector[i];
              normB += docVector[i] * docVector[i];
            }
            const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
            return { ...d, similarity };
          }).sort((a, b) => b.similarity - a.similarity).slice(0, 3);
          
          if (scoredDocs.length > 0) {
            context = "Context information is below.\n---------------------\n" + 
                      scoredDocs.map(d => d.content).join('\n\n') + 
                      "\n---------------------\nGiven the context information and not prior knowledge, answer the query.";
            chatMessages[chatMessages.length - 1].content = context + "\nQuery: " + lastMsg;
          }
        } catch (e) {
          console.error("RAG error:", e);
        }
      }

      const stream = await client.chat.completions.create({
        model: settings.model || 'llama3',
        messages: chatMessages,
        stream: true,
      });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });
  
  app.get('/api/ai/rag/documents', async (req, res) => {
    const userId = req.query.userId as string;
    const docs = await db.select({ id: ragDocuments.id, title: ragDocuments.title, createdAt: ragDocuments.createdAt }).from(ragDocuments).where(eq(ragDocuments.userId, userId)).orderBy(desc(ragDocuments.createdAt));
    res.json(docs);
  });

  app.post('/api/ai/rag/documents', async (req, res) => {
    const { userId, title, content } = req.body;
    try {
      const { client, settings } = await getAIClient(userId);
      const embResponse = await client.embeddings.create({
        model: settings.embeddingModel || 'nomic-embed-text',
        input: content,
      });
      const embedding = JSON.stringify(embResponse.data[0].embedding);
      
      const doc = await db.insert(ragDocuments).values({ userId, title, content, embedding }).returning().then(r => r[0]);
      res.json({ id: doc.id, title: doc.title });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.delete('/api/ai/rag/documents/:id', async (req, res) => {
    await db.delete(ragDocuments).where(eq(ragDocuments.id, req.params.id));
    res.json({ success: true });
  });
  // --- End AI API ---

  app.get('/api/chats', async (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) { res.status(400).json({ error: 'userId required' }); return; }
    
    const userChats = await db.select({
      chat: chats,
      member: chatMembers
    }).from(chatMembers).innerJoin(chats, eq(chatMembers.chatId, chats.id)).where(eq(chatMembers.userId, userId));
    
    res.json(userChats.map(c => c.chat));
  });
  
  app.post('/api/chats', async (req, res) => {
    const { type, name, memberIds } = req.body; // type: 'private' | 'group'
    const newChat = await db.insert(chats).values({ type, name }).returning().then(r => r[0]);
    
    for (const m of memberIds) {
      await db.insert(chatMembers).values({ chatId: newChat.id, userId: m });
    }
    res.json(newChat);
  });

  app.get('/api/chats/:id/messages', async (req, res) => {
    const msgs = await db.select().from(messages).where(eq(messages.chatId, req.params.id)).orderBy(messages.createdAt);
    res.json(msgs);
  });

  app.post('/api/chats/:id/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    res.json({ url: `/uploads/${file.filename}`, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype });
  });

  // WebSockets
  io.on('connection', (socket) => {
    let currentUserId: string | null = null;
    
    socket.on('authenticate', async (userId) => {
      currentUserId = userId;
      await db.update(users).set({ status: 'online' }).where(eq(users.id, userId));
      io.emit('user_status', { userId, status: 'online' });
    });

    socket.on('join_chat', (chatId) => {
      socket.join(chatId);
    });

    socket.on('send_message', async (data) => {
      const { chatId, senderId, type, content, fileName, fileSize, mimeType } = data;
      const newMsg = await db.insert(messages).values({
        chatId, senderId, type, content, fileName, fileSize: String(fileSize), mimeType
      }).returning().then(r => r[0]);
      
      io.to(chatId).emit('new_message', newMsg);
    });

    socket.on('typing', (data) => {
      const { chatId, senderId, isTyping } = data;
      io.to(chatId).emit('user_typing', { chatId, senderId, isTyping });
    });
    
    socket.on('read_message', async (data) => {
      const { messageId, userId, chatId } = data;
      await db.insert(messageReads).values({ messageId, userId }).onConflictDoNothing();
      io.to(chatId).emit('message_read', { messageId, userId });
    });

    socket.on('disconnect', async () => {
      if (currentUserId) {
        await db.update(users).set({ status: 'offline', lastSeen: new Date() }).where(eq(users.id, currentUserId));
        io.emit('user_status', { userId: currentUserId, status: 'offline', lastSeen: new Date() });
      }
    });
  });

  // --- Face Recognition API ---
  const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  app.get('/api/faces', async (req, res) => {
    const faces = await db.select().from(faceProfiles).orderBy(desc(faceProfiles.createdAt));
    res.json(faces);
  });

  app.post('/api/faces', upload.single('image'), async (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No image uploaded' }); return; }
    
    const { subjectName, embedding } = req.body;
    if (!subjectName || !embedding) { res.status(400).json({ error: 'Missing data' }); return; }
    
    try {
      const face = await db.insert(faceProfiles).values({
        subjectName,
        imageUrl: `/uploads/${file.filename}`,
        embedding // storing JSON string
      }).returning().then(r => r[0]);
      res.json(face);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/faces/match', upload.single('image'), async (req, res) => {
    const { embedding } = req.body;
    if (!embedding) { res.status(400).json({ error: 'Missing embedding' }); return; }
    
    try {
      const queryEmbedding = JSON.parse(embedding);
      const allFaces = await db.select().from(faceProfiles);
      
      const scored = allFaces.map(f => {
        const dbEmbedding = JSON.parse(f.embedding);
        const similarity = cosineSimilarity(queryEmbedding, dbEmbedding);
        return { ...f, similarity };
      }).sort((a, b) => b.similarity - a.similarity).slice(0, 10);
      
      // Keep only matches with > 0.4 similarity
      const matches = scored.filter(s => s.similarity > 0.4);
      
      res.json(matches);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/api/faces/:id', async (req, res) => {
    await db.delete(faceProfiles).where(eq(faceProfiles.id, req.params.id));
    res.json({ success: true });
  });
  // --- End Face Recognition API ---

  // --- OCR API ---
  app.get('/api/ocr', async (req, res) => {
    const results = await db.select().from(ocrResults).orderBy(desc(ocrResults.createdAt));
    res.json(results);
  });

  app.post('/api/ocr', async (req, res) => {
    const { filename, fileType, engine, textContent, jsonData } = req.body;
    try {
      const result = await db.insert(ocrResults).values({
        filename, fileType, engine, textContent, jsonData
      }).returning().then(r => r[0]);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.delete('/api/ocr/:id', async (req, res) => {
    await db.delete(ocrResults).where(eq(ocrResults.id, req.params.id));
    res.json({ success: true });
  });
  // --- End OCR API ---

  // --- GIS API ---
  app.get('/api/gis/markers', async (req, res) => {
    const markers = await db.select().from(gisMarkers);
    res.json(markers);
  });
  app.post('/api/gis/markers', async (req, res) => {
    const { title, description, lat, lng } = req.body;
    try {
      const marker = await db.insert(gisMarkers).values({ title, description, lat, lng }).returning().then(r => r[0]);
      res.json(marker);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete('/api/gis/markers/:id', async (req, res) => {
    await db.delete(gisMarkers).where(eq(gisMarkers.id, req.params.id));
    res.json({ success: true });
  });

  app.get('/api/gis/tracks', async (req, res) => {
    const tracks = await db.select().from(gisTracks);
    res.json(tracks);
  });
  app.post('/api/gis/tracks', async (req, res) => {
    const { name, pathData } = req.body;
    try {
      const track = await db.insert(gisTracks).values({ name, pathData: JSON.stringify(pathData) }).returning().then(r => r[0]);
      res.json(track);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/gis/geofences', async (req, res) => {
    const fences = await db.select().from(gisGeofences);
    res.json(fences);
  });
  app.post('/api/gis/geofences', async (req, res) => {
    const { name, fenceType, geomData } = req.body;
    try {
      const fence = await db.insert(gisGeofences).values({ name, fenceType, geomData: JSON.stringify(geomData) }).returning().then(r => r[0]);
      res.json(fence);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  app.delete('/api/gis/geofences/:id', async (req, res) => {
    await db.delete(gisGeofences).where(eq(gisGeofences.id, req.params.id));
    res.json({ success: true });
  });
  // --- End GIS API ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: use process.cwd() instead of __dirname to be safe across environments
    const distPath = join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(join(distPath, 'index.html'));
      });
    }
  }

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
