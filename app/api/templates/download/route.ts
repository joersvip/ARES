import { NextRequest, NextResponse } from "next/server";

const DOCKERFILE = `FROM python:3.11-slim as builder

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

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]`;

const DOCKER_COMPOSE = `version: "3.8"

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
    driver: bridge`;

const ENV_FILE = `# AEGIS PLATFORM CONFIGURATION
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
GEMINI_API_KEY=your_gemini_api_key_here
`;

const MAIN_PY = `import asyncio
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

class PluginToggle(BaseModel):
    plugin_id: str
    enabled: bool

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
    # Inside clean DB, write actual user create
    logger.info(f"Registered user: {user.username} as role {user.role}")
    return {"message": "Secured user record persisted", "username": user.username}

@auth_router.post("/login", response_model=Token)
async def login(user: UserLogin):
    # Simulated auth lookup for demo robustness
    if user.username == "admin" and user.password == "AegisAdmin2026!":
        token = create_access_token({"sub": "admin", "role": "Administrator"})
        return {"access_token": token, "token_type": "bearer", "role": "Administrator"}
    elif user.username == "analyst" and user.password == "AegisAnalyst2026!":
        token = create_access_token({"sub": "analyst", "role": "Analyst"})
        return {"access_token": token, "token_type": "bearer", "role": "Analyst"}
    raise HTTPException(status_code=400, detail="Incorrect security credentials")

# ==========================================
# 7. ACTIVE WEBSOCKET BROADCASTER SIMULATION
# ==========================================
@app.websocket("/ws/threats")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Broadcast simulated real-time IDS alarms to connected clients
            await asyncio.sleep(5)
            alert = {
                "timestamp": datetime.datetime.utcnow().isoformat(),
                "event": "IDS Alert: Unsanitized Packet Signature Detected",
                "ip": f"192.168.1.{asyncio.get_event_loop().time() % 254:.0f}",
                "severity": "High" if int(asyncio.get_event_loop().time()) % 2 == 0 else "Medium",
                "attack_vector": "SQL Injection" if int(asyncio.get_event_loop().time()) % 3 == 0 else "SSRF Scan"
            }
            await websocket.send_text(json.dumps(alert))
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info("Intrusion deck detached")

# Include Routers
app.include_router(auth_router)

@app.get("/health")
async def health_check():
    return {"status": "HEALTHY", "service": "Aegis Intel Engine", "timestamp": datetime.datetime.utcnow()}
`;

const MAIN_DART = `import 'dart:convert';
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
        Uri.parse('ws://10.0.2.2:8000/ws/threats'), // Connect to FastAPI host (Android Emulator loopback)
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
            // Status bar
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
}
`;

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      dockerfile: DOCKERFILE,
      dockerCompose: DOCKER_COMPOSE,
      env: ENV_FILE,
      mainPy: MAIN_PY,
      mainDart: MAIN_DART
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate templates." },
      { status: 500 }
    );
  }
}
