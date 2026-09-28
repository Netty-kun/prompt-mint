# MongoDB Backup and Point-in-Time Recovery Guide

## Overview

This document describes the automated MongoDB backup system with point-in-time recovery capabilities for the PromptMint application.

### Recovery Objectives
- **RPO (Recovery Point Objective)**: <1 hour (hourly backups)
- **RTO (Recovery Time Objective)**: <30 minutes (full restore from backup)
- **Retention**: 7 days (configurable)

## Architecture

### Backup Strategy
- **Frequency**: Hourly (configurable via cron schedule)
- **Method**: mongodump with gzip compression
- **Storage**: Local filesystem (can be extended to S3/cloud storage)
- **Format**: Compressed backup archives with metadata

### Point-in-Time Recovery
- Leverages MongoDB oplog for granular recovery
- Enables recovery to any point within the oplog window
- Requires replica set configuration (automatic in docker-compose)

## Setup

### Environment Variables

```bash
# .env
MONGODB_URI=mongodb://admin:password@localhost:27017/prompt-mint?authSource=admin
BACKUP_DIR=./backups
RETENTION_DAYS=7
ENABLE_BACKUPS=true
```

### Docker Compose Setup

The included `docker-compose.yml` automatically configures:
- MongoDB replica set (required for oplog and point-in-time recovery)
- Redis for session management
- Express server
- Vite frontend

```bash
docker-compose up -d
```

### Manual Setup

If not using Docker Compose, initialize MongoDB replica set:

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017

# Initialize replica set
rs.initiate({
  _id: "rs0",
  members: [{_id: 0, host: "localhost:27017"}]
})

# Verify replica set status
rs.status()
```

## Usage

### Manual Backup

```bash
cd server
npm run backup:backup
```

### List Backups

```bash
npm run backup:status
```

Shows recent backups with timestamp and size information.

### Verify Backup Integrity

```bash
npm run backup:verify ./backups/backup-2024-08-26T12-30-45
```

Validates backup structure and metadata.

### Test Recovery (Monthly Recommendation)

```bash
npm run backup:test-recovery ./backups/backup-2024-08-26T12-30-45
```

Performs a dry-run recovery to test database to verify:
- Backup is restorable
- All collections restore correctly
- Recovery time is within RTO target
- Test database is cleaned up after verification

### Perform Production Restore

```bash
npm run backup:restore ./backups/backup-2024-08-26T12-30-45
```

**Warning**: This restores to the production database. Ensure:
1. You have verified the backup with `test-recovery`
2. You have notified team members
3. You have captured current state for rollback if needed

### View Backup Logs

```bash
tail -f ./backups/backup.log
```

## Backup Scheduler

The backup scheduler automatically:
- Executes hourly backups (default: top of each hour)
- Prunes backups older than retention period
- Logs all operations to `backups/backup.log`
- Alerts on backup failures

To enable/disable:

```bash
# Enable (default)
ENABLE_BACKUPS=true npm start

# Disable for testing
ENABLE_BACKUPS=false npm start
```

To customize schedule, modify the cron expression in `BackupScheduler`:

```typescript
// Every 6 hours
schedule: '0 */6 * * *'

// Every 30 minutes
schedule: '*/30 * * * *'

// Every day at 3 AM
schedule: '0 3 * * *'
```

## Point-in-Time Recovery

Recover to a specific moment in time:

```bash
npm run backup:pit-recover \
  --backup ./backups/backup-2024-08-26T12-00-00 \
  --timestamp "2024-08-26T14:30:00Z"
```

Requirements:
- MongoDB replica set (automatic in docker-compose)
- Oplog entries must exist for target timestamp
- Oplog window is typically 24 hours (configurable)

## Monitoring

### Backup Metrics

Monitor these metrics to ensure backup health:
- **Backup Duration**: Should complete within 5-10 minutes
- **Backup Size**: Monitor growth trends
- **Storage Utilization**: Ensure backup directory has sufficient space
- **Failure Rate**: Should be 0%

Example monitoring check:

```bash
# Check disk usage
du -sh ./backups

# Count backups
ls -1 ./backups | grep backup- | wc -l

# Check last backup timestamp
ls -ltr ./backups | tail -1
```

### Alerts

The system logs backup failures to stdout/stderr. Configure these in your monitoring system:

```
ERROR: MongoDB Backup Failure Alert
- timestamp: [ISO timestamp]
- error: [error message]
- retentionDays: 7
- rpo: <1h
- rto: <30min
```

## Disaster Recovery Runbook

### Scenario: Database Corruption

1. **Stop the application**
   ```bash
   docker-compose down
   ```

2. **Find the latest good backup**
   ```bash
   npm run backup:status
   ```

3. **Test recovery**
   ```bash
   npm run backup:test-recovery ./backups/backup-2024-08-26T12-30-45
   ```

4. **Restore production**
   ```bash
   npm run backup:restore ./backups/backup-2024-08-26T12-30-45
   ```

5. **Restart application**
   ```bash
   docker-compose up -d
   ```

6. **Verify functionality**
   - Check application logs
   - Run integration tests
   - Verify data integrity

### Scenario: Recent Data Loss

Use point-in-time recovery to restore to before the loss occurred:

```bash
npm run backup:pit-recover \
  --backup ./backups/backup-2024-08-26T12-00-00 \
  --timestamp "2024-08-26T14:15:00Z"
```

## Maintenance

### Monthly Recovery Test

Schedule a monthly recovery drill:

```bash
# Generate recovery runbook
npm run backup:runbook

# Follow the runbook steps in a maintenance window
```

### Backup Cleanup

Old backups are automatically pruned based on `RETENTION_DAYS`. To manually clean:

```bash
npm run backup:prune
```

### Storage Management

Monitor backup disk usage:

```bash
# Show total backup size
du -sh ./backups

# Show backup breakdown
du -sh ./backups/backup-* | sort -h
```

If storage is full, increase retention period or use S3 storage:

```bash
RETENTION_DAYS=3 npm run backup:prune
```

## Advanced Configuration

### S3 Backup Integration

Store backups in AWS S3 for long-term retention:

```typescript
// Add to BackupScheduler
const s3Manager = new S3BackupManager({
  bucket: 'prompt-mint-backups',
  region: 'us-east-1',
});

await s3Manager.upload(backupPath);
```

### Encryption at Rest

Enable encryption for sensitive data:

```bash
# Enable MongoDB encryption
MONGODB_ENCRYPTION_KEY=$(openssl rand -base64 32) npm start
```

### Incremental Backups

For large databases, consider incremental backups:

```bash
# Requires MongoDB 4.4+
mongodump --incremental --dir ./backups/incremental
```

## Troubleshooting

### Backup Fails with "Permission denied"

```bash
# Ensure backup directory has write permissions
chmod -R 755 ./backups

# Run as appropriate user
sudo -u mongodb npm run backup:backup
```

### Restore Hangs

```bash
# Increase timeout
MONGO_TIMEOUT=600000 npm run backup:restore ./backups/backup-xxx

# Check MongoDB logs
docker logs prompt-mint-mongodb
```

### High Backup Duration

If backups exceed 10 minutes:
1. Check database size: `db.stats()`
2. Consider increasing backup frequency
3. Enable compression (default: enabled)
4. Check disk I/O performance

## References

- [MongoDB mongodump Documentation](https://docs.mongodb.com/database-tools/mongodump/)
- [MongoDB Point-in-Time Recovery](https://docs.mongodb.com/manual/tutorial/recover-data-following-unexpected-shutdown/)
- [MongoDB Oplog](https://docs.mongodb.com/manual/core/replica-set-oplog/)
- [RTO/RPO Concepts](https://en.wikipedia.org/wiki/Recovery_time_objective)
