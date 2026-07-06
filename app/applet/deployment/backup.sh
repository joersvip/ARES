#!/bin/bash
# Automated Backup Script for PostgreSQL and Volumes

BACKUP_DIR="/var/backups/app_backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="postgres" # Based on the docker-compose.yml service name
DB_USER="user"          # Based on the docker-compose.yml POSTGRES_USER

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "========================================"
echo "Starting backup process at $TIMESTAMP"
echo "========================================"

# 1. Backup PostgreSQL Database
echo "Backing up PostgreSQL database..."
if docker ps | grep -q $DB_CONTAINER; then
    docker exec $DB_CONTAINER pg_dumpall -U $DB_USER > "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    gzip "$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    echo "Database backup successful."
else
    echo "Warning: PostgreSQL container ($DB_CONTAINER) is not running. Skipping DB backup."
fi

# 2. Backup MinIO Object Storage (Tar the volume)
echo "Backing up MinIO storage volume..."
# Tar the raw docker volume for MinIO
tar -czvf "$BACKUP_DIR/minio_backup_$TIMESTAMP.tar.gz" -C /var/lib/docker/volumes/ minio_data 2>/dev/null
if [ $? -eq 0 ]; then
    echo "MinIO backup successful."
else
    echo "MinIO volume backup failed or volume not found."
fi

# 3. Cleanup old backups (keep last 7 days)
echo "Cleaning up backups older than 7 days..."
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -exec rm {} \;

echo "========================================"
echo "Backup completed! Files stored in $BACKUP_DIR"
echo "========================================"
