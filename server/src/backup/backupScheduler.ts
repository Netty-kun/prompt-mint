import cron from 'node-cron';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

interface BackupScheduleConfig {
  schedule: string;
  backupDir: string;
  retentionDays: number;
  enabled: boolean;
  logFile?: string;
}

class BackupScheduler {
  private task: cron.ScheduledTask | null = null;
  private config: BackupScheduleConfig;
  private logFile: string;

  constructor(config: Partial<BackupScheduleConfig> = {}) {
    this.config = {
      schedule: '0 * * * *', // Hourly at minute 0
      backupDir: process.env.BACKUP_DIR || './backups',
      retentionDays: parseInt(process.env.RETENTION_DAYS || '7', 10),
      enabled: process.env.ENABLE_BACKUPS !== 'false',
      ...config,
    };

    this.logFile = this.config.logFile || path.join(this.config.backupDir, 'backup.log');
    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
  }

  private log(message: string, level: 'info' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    console.log(logMessage);

    try {
      fs.appendFileSync(this.logFile, logMessage);
    } catch (error) {
      console.error('Failed to write to backup log:', error);
    }
  }

  private async executeBackup(): Promise<void> {
    try {
      this.log('Starting scheduled MongoDB backup...');

      const scriptPath = path.join(__dirname, '../../scripts/mongodbBackup.ts');
      execSync(`npx ts-node ${scriptPath} backup`, {
        env: {
          ...process.env,
          BACKUP_DIR: this.config.backupDir,
          RETENTION_DAYS: this.config.retentionDays.toString(),
        },
        stdio: 'pipe',
      });

      this.log('Backup completed successfully');

      // Prune old backups
      this.log('Pruning old backups...');
      execSync(`npx ts-node ${scriptPath} prune`, {
        env: {
          ...process.env,
          BACKUP_DIR: this.config.backupDir,
          RETENTION_DAYS: this.config.retentionDays.toString(),
        },
        stdio: 'pipe',
      });

      this.log('Old backups pruned');

      // Log backup status
      const output = execSync(`npx ts-node ${scriptPath} status`, {
        env: {
          ...process.env,
          BACKUP_DIR: this.config.backupDir,
        },
        encoding: 'utf-8',
      });

      this.log(`Backup status: ${output}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Backup failed: ${errorMessage}`, 'error');

      // Alert on backup failure
      this.alertBackupFailure(errorMessage);
    }
  }

  private alertBackupFailure(error: string): void {
    // Log alert for monitoring/alerting systems
    console.error('🚨 MongoDB Backup Failure Alert', {
      timestamp: new Date().toISOString(),
      error,
      retentionDays: this.config.retentionDays,
      rpo: '<1h',
      rto: '<30min',
    });
  }

  public start(): void {
    if (!this.config.enabled) {
      this.log('Backup scheduler is disabled');
      return;
    }

    if (this.task) {
      this.log('Backup scheduler is already running');
      return;
    }

    try {
      this.task = cron.schedule(this.config.schedule, () => {
        this.executeBackup();
      });

      this.log(`Backup scheduler started (schedule: ${this.config.schedule})`);
      this.log(`RPO: <1 hour | RTO: <30 minutes | Retention: ${this.config.retentionDays} days`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Failed to start scheduler: ${errorMessage}`, 'error');
    }
  }

  public stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.log('Backup scheduler stopped');
    }
  }

  public getStatus(): {
    enabled: boolean;
    running: boolean;
    schedule: string;
    nextRun: string | null;
  } {
    return {
      enabled: this.config.enabled,
      running: this.task !== null,
      schedule: this.config.schedule,
      nextRun: this.task ? new Date(this.task.nextDate().toJSDate()).toISOString() : null,
    };
  }
}

// Export singleton instance
export const backupScheduler = new BackupScheduler();

export { BackupScheduler, BackupScheduleConfig };
