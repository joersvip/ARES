# ARES Storage System

Handles binary assets, system snapshots, system backups, and unstructured log streams.

## Targets
- **Local/Staging**: Mounted directories targeting `/var/lib/ares/storage/`
- **Cloud/Production**: S3-compliant configurations pointing to MinIO or GCP Cloud Storage.
