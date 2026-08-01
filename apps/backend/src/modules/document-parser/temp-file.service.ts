import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import {
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000;

@Injectable()
export class TempFileService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TempFileService.name);
  private readonly rootDir =
    process.env.UPLOAD_TEMP_DIR?.trim() ||
    join(tmpdir(), 'zamp-uploads');
  private cleanupTimer: NodeJS.Timeout | null = null;

  onModuleInit(): void {
    void this.ensureRoot();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupAbandoned();
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  getRootDir(): string {
    return this.rootDir;
  }

  async ensureRoot(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
  }

  async saveUpload(
    stream: Readable,
    originalName: string,
  ): Promise<string> {
    await this.ensureRoot();
    const target = this.buildTargetPath(originalName);
    await pipeline(stream, createWriteStream(target));
    return target;
  }

  async saveBuffer(buffer: Buffer, originalName: string): Promise<string> {
    await this.ensureRoot();
    const target = this.buildTargetPath(originalName);
    await writeFile(target, buffer);
    return target;
  }

  private buildTargetPath(originalName: string): string {
    const safeBase = basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    return join(
      this.rootDir,
      `${Date.now()}-${randomUUID()}-${safeBase || 'upload.pdf'}`,
    );
  }

  async moveIntoManagedDir(sourcePath: string, originalName: string): Promise<string> {
    await this.ensureRoot();
    if (sourcePath.startsWith(this.rootDir)) {
      return sourcePath;
    }
    const safeBase = basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const target = join(
      this.rootDir,
      `${Date.now()}-${randomUUID()}-${safeBase || 'upload.pdf'}`,
    );
    await rename(sourcePath, target);
    return target;
  }

  async delete(filePath: string | null | undefined): Promise<void> {
    if (!filePath) {
      return;
    }
    try {
      await unlink(filePath);
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : '';
      if (code !== 'ENOENT') {
        this.logger.warn(`Failed to delete temp file ${filePath}: ${String(error)}`);
      }
    }
  }

  async cleanupAbandoned(ttlMs = DEFAULT_TTL_MS): Promise<number> {
    await this.ensureRoot();
    const now = Date.now();
    let removed = 0;

    let entries: string[];
    try {
      entries = await readdir(this.rootDir);
    } catch {
      return 0;
    }

    for (const entry of entries) {
      const fullPath = join(this.rootDir, entry);
      try {
        const info = await stat(fullPath);
        if (!info.isFile()) {
          continue;
        }
        if (now - info.mtimeMs < ttlMs) {
          continue;
        }
        await rm(fullPath, { force: true });
        removed += 1;
      } catch {
        // ignore individual cleanup failures
      }
    }

    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} abandoned temporary upload(s)`);
    }
    return removed;
  }
}
