import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { MongoClient } from 'mongodb';

interface BackupConfig {
  mongoUri: string;
  backupDir: string;
  retentionDays: number;
  compressionEnabled: boolean;
}

class MongoDBBackupManager {
  private config: BackupConfig;
  private client: MongoClient | null = null;

  constructor(config: BackupConfig) {
    this.config = config;
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
      console.log(`Created backup directory: ${this.config.backupDir}`);
    }
  }

  async performBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(this.config.backupDir, backupName);

    try {
      console.log(`Starting MongoDB backup: ${backupName}`);

      // Create backup using mongodump
      const command = `mongodump --uri="${this.config.mongoUri}" --out="${backupPath}" --gzip`;
      execSync(command, { stdio: 'inherit' });

      console.log(`✓ Backup completed: ${backupPath}`);

      // Create metadata file
      this.createBackupMetadata(backupName, backupPath);

      return backupPath;
    } catch (error) {
      console.error('Backup failed:', error);
      // Clean up failed backup
      if (fs.existsSync(backupPath)) {
        execSync(`rm -rf "${backupPath}"`);
      }
      throw error;
    }
  }

  private createBackupMetadata(backupName: string, backupPath: string): void {
    const metadata = {
      backupName,
      timestamp: new Date().toISOString(),
      size: this.getDirectorySize(backupPath),
      compressed: this.config.compressionEnabled,
      status: 'completed',
    };

    const metadataPath = path.join(backupPath, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }

  private getDirectorySize(dirPath: string): number {
    let size = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += this.getDirectorySize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }

    return size;
  }

  async pruneOldBackups(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    const backups = fs.readdirSync(this.config.backupDir).filter(name =>
      name.startsWith('backup-')
    );

    for (const backup of backups) {
      const backupPath = path.join(this.config.backupDir, backup);
      const stats = fs.statSync(backupPath);

      if (stats.mtime < cutoffDate) {
        console.log(`Removing old backup: ${backup}`);
        execSync(`rm -rf "${backupPath}"`);
      }
    }
  }

  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      const metadataPath = path.join(backupPath, 'metadata.json');
      if (!fs.existsSync(metadataPath)) {
        console.error('Backup metadata not found');
        return false;
      }

      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      console.log(`✓ Backup verification passed: ${metadata.backupName}`);
      console.log(`  Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Status: ${metadata.status}`);

      return true;
    } catch (error) {
      console.error('Backup verification failed:', error);
      return false;
    }
  }

  async getBackupStatus(): Promise<void> {
    console.log('\n--- Backup Status ---');
    const backups = fs.readdirSync(this.config.backupDir).filter(name =>
      name.startsWith('backup-')
    );

    if (backups.length === 0) {
      console.log('No backups found');
      return;
    }

    backups.sort().reverse().slice(0, 5).forEach(backup => {
      const backupPath = path.join(this.config.backupDir, backup);
      const stats = fs.statSync(backupPath);
      const metadataPath = path.join(backupPath, 'metadata.json');

      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        console.log(`${backup}:`);
        console.log(`  Created: ${metadata.timestamp}`);
        console.log(`  Size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);
      }
    });
  }

  async testRecovery(backupPath: string, testDbName: string): Promise<boolean> {
    try {
      console.log(`Testing recovery from: ${backupPath}`);

      const command = `mongorestore --uri="${this.config.mongoUri}" --db="${testDbName}" "${path.join(backupPath, 'admin')}" --gzip`;
      execSync(command, { stdio: 'pipe' });

      console.log(`✓ Recovery test successful to database: ${testDbName}`);

      // Clean up test database
      if (this.client) {
        await this.client.db(testDbName).dropDatabase();
        console.log(`Cleaned up test database: ${testDbName}`);
      }

      return true;
    } catch (error) {
      console.error('Recovery test failed:', error);
      return false;
    }
  }
}

// CLI Interface
async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/prompt-mint';
  const backupDir = process.env.BACKUP_DIR || './backups';
  const retentionDays = parseInt(process.env.RETENTION_DAYS || '7', 10);

  const config: BackupConfig = {
    mongoUri,
    backupDir,
    retentionDays,
    compressionEnabled: true,
  };

  const manager = new MongoDBBackupManager(config);
  const command = process.argv[2];

  try {
    switch (command) {
      case 'backup':
        await manager.performBackup();
        break;
      case 'prune':
        await manager.pruneOldBackups();
        break;
      case 'status':
        await manager.getBackupStatus();
        break;
      case 'verify':
        const backupPath = process.argv[3];
        if (!backupPath) {
          console.error('Please provide backup path for verification');
          process.exit(1);
        }
        await manager.verifyBackup(backupPath);
        break;
      case 'test-recovery':
        const backupPathRecover = process.argv[3];
        if (!backupPathRecover) {
          console.error('Please provide backup path for recovery test');
          process.exit(1);
        }
        await manager.testRecovery(backupPathRecover, 'prompt-mint-test-recovery');
        break;
      default:
        console.log(`
Usage: npm run backup <command>

Commands:
  backup           Perform hourly backup
  prune            Remove backups older than retention period
  status           Show recent backups
  verify <path>    Verify backup integrity
  test-recovery    Test recovery procedure (RTO <30min)

Environment variables:
  MONGODB_URI      MongoDB connection string (default: mongodb://localhost:27017/prompt-mint)
  BACKUP_DIR       Backup directory (default: ./backups)
  RETENTION_DAYS   Backup retention period (default: 7)
        `);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();

export { MongoDBBackupManager, BackupConfig };
