# ARES Containerized Environment

This directory houses build blueprints and multi-container runtime architectures for local or cloud deployments.

## How to run locally
From the parent/root directory of the project, execute:
```bash
docker compose -f docker/docker-compose.yml up --build -d
```

## Containers Spawned
1. `ares-postgres`: Relational threat telemetry database
2. `ares-storage`: Secure local S3-compliant MinIO cluster
3. `ares-backend`: REST Engine
4. `ares-frontend`: Visual client dashboard
