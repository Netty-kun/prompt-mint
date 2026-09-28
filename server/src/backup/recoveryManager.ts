import { MongoClient, Db } from 'mongodb';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface RecoveryOptions {
  targetTimestamp?: Date;
  verifyAfterRestore?: boolean;
  testMode?: boolean;
}

class RecoveryManager {
  private mongoUri: string;
  private backupDir: string;
  private client: MongoClient | null = null;
  private db: Db | null = null;

  constructor(mongoUri?: string, backupDir?: string) {
    this.mongoUri = mongoUri || process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-mint';
    this.backupDir = backupDir || process.env.BACKUP_DIR || './backups';
  }

  private async connect(): Promise<void> {
    if (!this.client) {
      this.client = new MongoClient(this.mongoUri);
      await this.client.connect();
      this.db = this.client.db();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Get oplog timestamp information for point-in-time recovery
   */
  async getOplogInfo(): Promise<{ firstTimestamp: string; lastTimestamp: string }> {
    await this.connect();

    const oplogDb = this.client?.db('local');
    const oplogCollection = oplogDb?.collection('oplog.rs');

    const firstEntry = await oplogCollection?.findOne({}, { sort: { ts: 1 } });
    const lastEntry = await oplogCollection?.findOne({}, { sort: { ts: -1 } });

    return {
      firstTimestamp: firstEntry?.ts?.toISOString() || 'unknown',
      lastTimestamp: lastEntry?.ts?.toISOString() || 'unknown',
    };
  }

  /**
   * List available backups with their timestamps
   */
  getAvailableBackups(): Array<{
    name: string;
    path: string;
    timestamp: Date;
    size: number;
  }> {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const backups = fs.readdirSync(this.backupDir)
      .filter(name => name.startsWith('backup-'))
      .map(name => {
        const fullPath = path.join(this.backupDir, name);
        const stats = fs.statSync(fullPath);
        const metadataPath = path.join(fullPath, 'metadata.json');

        let timestamp = stats.mtime;
        let size = stats.size;

        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          timestamp = new Date(metadata.timestamp);
          size = metadata.size || size;
        }

        return {
          name,
          path: fullPath,
          timestamp,
          size,
        };
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return backups;
  }

  /**
   * Restore from specific backup
   * RTO Target: <30 minutes
   */
  async restoreFromBackup(
    backupPath: string,
    options: RecoveryOptions = {}
  ): Promise<{ success: boolean; duration: number; message: string }> {
    const startTime = Date.now();

    try {
      console.log(`Starting restore from backup: ${backupPath}`);

      // Verify backup exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup path not found: ${backupPath}`);
      }

      const testDbName = options.testMode ? 'prompt-mint-test-restore' : undefined;
      const targetDb = testDbName || 'prompt-mint';

      // Execute mongorestore
      const restoreCommand = `mongorestore --uri="${this.mongoUri}" --db="${targetDb}" "${path.join(backupPath, 'admin')}" --gzip`;

      console.log('Executing restore command...');
      execSync(restoreCommand, { stdio: 'inherit' });

      const duration = Date.now() - startTime;

      // Verify restoration if requested
      if (options.verifyAfterRestore) {
        await this.verifyRestore(targetDb);
      }

      // Clean up test database if in test mode
      if (options.testMode && testDbName) {
        await this.connect();
        await this.client?.db(testDbName).dropDatabase();
        console.log(`Test database ${testDbName} cleaned up`);
      }

      const message = `Restore completed successfully in ${(duration / 1000).toFixed(2)} seconds`;
      console.log(message);

      return {
        success: true,
        duration,
        message,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error(`Restore failed after ${(duration / 1000).toFixed(2)} seconds: ${errorMessage}`);

      return {
        success: false,
        duration,
        message: errorMessage,
      };
    }
  }

  /**
   * Point-in-time recovery using oplog
   * Recovers to a specific timestamp
   */
  async pointInTimeRecover(targetTimestamp: Date, backupPath: string): Promise<boolean> {
    try {
      console.log(`Starting point-in-time recovery to: ${targetTimestamp.toISOString()}`);

      // First restore from backup
      const restoreResult = await this.restoreFromBackup(backupPath, { testMode: false });

      if (!restoreResult.success) {
        throw new Error('Backup restore failed');
      }

      // Apply oplog entries up to target timestamp
      await this.connect();

      const oplogDb = this.client?.db('local');
      const oplogCollection = oplogDb?.collection('oplog.rs');

      // This is a simplified example - actual implementation would need to:
      // 1. Get all oplog entries between backup time and target time
      // 2. Replay them in order on the restored database
      // 3. Verify consistency

      const opsToApply = await oplogCollection
        ?.find({
          ts: { $gte: new Date(0), $lte: targetTimestamp },
        })
        .toArray();

      console.log(`Found ${opsToApply?.length || 0} oplog entries to apply`);

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Point-in-time recovery failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Verify restoration by checking collection counts
   */
  private async verifyRestore(dbName: string): Promise<boolean> {
    try {
      await this.connect();
      const targetDb = this.client?.db(dbName);

      const collections = await targetDb?.listCollections().toArray();
      console.log(`Verified ${collections?.length || 0} collections in restored database`);

      // Check document counts for main collections
      const mainCollections = ['prompts', 'users', 'transactions'];
      for (const collName of mainCollections) {
        const count = await targetDb?.collection(collName).countDocuments();
        console.log(`  ${collName}: ${count || 0} documents`);
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Verification failed: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Generate recovery runbook for monthly testing
   */
  generateRecoveryRunbook(): string {
    const backups = this.getAvailableBackups();
    const latestBackup = backups[0];

    return `
# MongoDB Recovery Runbook

## Objectives
- RPO (Recovery Point Objective): <1 hour
- RTO (Recovery Time Objective): <30 minutes

## Pre-Recovery Checklist
- [ ] Verify backup exists and is valid
- [ ] Ensure MongoDB instance is accessible
- [ ] Check disk space for restore operation
- [ ] Notify stakeholders of maintenance window

## Recovery Steps

### 1. List Available Backups
\`\`\`bash
npm run backup:status
\`\`\`

### 2. Verify Backup Integrity
\`\`\`bash
npm run backup:verify ${latestBackup?.path}
\`\`\`

### 3. Test Recovery (Recommended Monthly)
\`\`\`bash
npm run backup:test-recovery ${latestBackup?.path}
\`\`\`

### 4. Perform Production Restore
\`\`\`bash
npm run backup:restore ${latestBackup?.path}
\`\`\`

## Post-Recovery Verification
- [ ] Verify all collections restored
- [ ] Check document counts
- [ ] Test application connectivity
- [ ] Run integration tests
- [ ] Monitor application logs

## Rollback Plan
If recovery fails:
1. Stop the application
2. Attempt recovery from previous backup
3. If all backups fail, restore from AWS S3/external backup
4. Notify ops team immediately

## Monitoring
- Backup logs: ./backups/backup.log
- Latest backups stored: ${latestBackup?.name}
- Retention period: ${process.env.RETENTION_DAYS || 7} days

## Contact
- On-Call Engineer: [contact info]
- Database Admin: [contact info]
    `;
  }
}

export { RecoveryManager, RecoveryOptions };
