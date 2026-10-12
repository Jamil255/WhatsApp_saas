import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  downloadMediaMessage,
  normalizeMessageContent,
} from '@whiskeysockets/baileys';
import { randomUUID } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { basename, extname, join, resolve, sep } from 'path';
import { spawn } from 'child_process';

const ffmpegPath = require('ffmpeg-static') as string | null;

export type StoredMedia = {
  localPath: string;
  mimeType: string;
  fileName: string;
  size: number;
  durationSeconds?: number;
  ptt?: boolean;
  gifPlayback?: boolean;
  mediaType:
    'voice' | 'image' | 'video' | 'document' | 'audio' | 'gif' | 'sticker';
};

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly root = resolve(process.cwd(), 'storage', 'media');

  async storeUpload(
    tenantId: string,
    file: UploadedFile,
    requestedType: StoredMedia['mediaType'],
    durationSeconds?: number,
  ): Promise<StoredMedia> {
    this.assertUpload(file, requestedType);
    const tenantDirectory = await this.ensureTenantDirectory(tenantId);

    if (requestedType === 'voice') {
      return this.storeVoice(
        tenantDirectory,
        file,
        Math.max(1, Math.round(durationSeconds || 1)),
      );
    }

    const extension = this.safeExtension(file.originalname, file.mimetype);
    const fileName = `${randomUUID()}${extension}`;
    const localPath = join(tenantDirectory, fileName);
    await fs.writeFile(localPath, file.buffer, { flag: 'wx' });

    return {
      localPath,
      mimeType: file.mimetype || this.mimeFromExtension(extension),
      fileName: basename(file.originalname || fileName),
      size: file.size,
      mediaType: requestedType,
      gifPlayback: requestedType === 'gif',
    };
  }

  async captureIncoming(
    tenantId: string,
    message: any,
  ): Promise<StoredMedia | null> {
    const content = normalizeMessageContent(message.message);
    if (!content) return null;

    const media = this.describeIncoming(content);
    if (!media) return null;

    try {
      const buffer = await downloadMediaMessage(message, 'buffer', {});
      const tenantDirectory = await this.ensureTenantDirectory(tenantId);
      const extension = this.extensionForMime(media.mimeType, media.mediaType);
      const storedName = `${randomUUID()}${extension}`;
      const localPath = join(tenantDirectory, storedName);
      await fs.writeFile(localPath, buffer, { flag: 'wx' });

      return {
        ...media,
        localPath,
        fileName: media.fileName || storedName,
        size: buffer.length,
      };
    } catch (error: any) {
      this.logger.warn(
        `Could not retain incoming media for tenant ${tenantId}: ${error?.message || 'unknown error'}`,
      );
      return null;
    }
  }

  async open(localPath: string) {
    const resolvedPath = resolve(localPath);
    const rootPrefix = `${this.root}${sep}`;
    if (!resolvedPath.startsWith(rootPrefix)) {
      throw new NotFoundException('Media file was not found.');
    }

    try {
      const stat = await fs.stat(resolvedPath);
      if (!stat.isFile()) throw new Error('Not a file');
      return { stream: createReadStream(resolvedPath), size: stat.size };
    } catch {
      throw new NotFoundException('Media file was not found.');
    }
  }

  async remove(localPath?: string | null): Promise<void> {
    if (!localPath) return;
    const resolvedPath = resolve(localPath);
    if (!resolvedPath.startsWith(`${this.root}${sep}`)) return;
    await fs.unlink(resolvedPath).catch(() => undefined);
  }

  private async storeVoice(
    tenantDirectory: string,
    file: UploadedFile,
    durationSeconds: number,
  ): Promise<StoredMedia> {
    if (!ffmpegPath) {
      throw new BadRequestException(
        'Voice conversion is unavailable on this server.',
      );
    }

    const inputExtension = this.safeExtension(file.originalname, file.mimetype);
    const inputPath = join(tenantDirectory, `${randomUUID()}${inputExtension}`);
    const outputPath = join(tenantDirectory, `${randomUUID()}.ogg`);
    await fs.writeFile(inputPath, file.buffer, { flag: 'wx' });

    try {
      await new Promise<void>((resolvePromise, reject) => {
        const child = spawn(ffmpegPath, [
          '-hide_banner',
          '-loglevel',
          'error',
          '-i',
          inputPath,
          '-vn',
          '-ac',
          '1',
          '-c:a',
          'libopus',
          '-b:a',
          '32k',
          '-application',
          'voip',
          '-y',
          outputPath,
        ]);
        let stderr = '';
        child.stderr.on('data', (chunk) => {
          stderr += String(chunk).slice(0, 2_000);
        });
        child.once('error', reject);
        child.once('close', (code) => {
          if (code === 0) resolvePromise();
          else reject(new Error(stderr || `ffmpeg exited with code ${code}`));
        });
      });
    } catch (error: any) {
      await this.remove(inputPath);
      await this.remove(outputPath);
      this.logger.warn(
        `Voice conversion failed: ${error?.message || 'unknown error'}`,
      );
      throw new BadRequestException(
        'This voice recording could not be converted. Please record it again.',
      );
    }

    await this.remove(inputPath);
    const stat = await fs.stat(outputPath);
    return {
      localPath: outputPath,
      mimeType: 'audio/ogg; codecs=opus',
      fileName: 'voice-note.ogg',
      size: stat.size,
      durationSeconds,
      ptt: true,
      mediaType: 'voice',
    };
  }

  private describeIncoming(
    content: any,
  ): Omit<StoredMedia, 'localPath' | 'size'> | null {
    if (content.imageMessage) {
      return {
        mediaType: 'image',
        mimeType: content.imageMessage.mimetype || 'image/jpeg',
        fileName: 'image.jpg',
      };
    }
    if (content.stickerMessage) {
      return {
        mediaType: 'sticker',
        mimeType: content.stickerMessage.mimetype || 'image/webp',
        fileName: 'sticker.webp',
      };
    }
    if (content.videoMessage) {
      const gifPlayback = Boolean(content.videoMessage.gifPlayback);
      return {
        mediaType: gifPlayback ? 'gif' : 'video',
        mimeType: content.videoMessage.mimetype || 'video/mp4',
        fileName: gifPlayback ? 'animation.mp4' : 'video.mp4',
        durationSeconds: Number(content.videoMessage.seconds || 0),
        gifPlayback,
      };
    }
    if (content.audioMessage) {
      const ptt = Boolean(content.audioMessage.ptt);
      return {
        mediaType: ptt ? 'voice' : 'audio',
        mimeType: content.audioMessage.mimetype || 'audio/ogg',
        fileName: ptt ? 'voice-note.ogg' : 'audio.ogg',
        durationSeconds: Number(content.audioMessage.seconds || 0),
        ptt,
      };
    }
    if (content.documentMessage) {
      return {
        mediaType: 'document',
        mimeType:
          content.documentMessage.mimetype || 'application/octet-stream',
        fileName: basename(content.documentMessage.fileName || 'document'),
      };
    }
    return null;
  }

  private assertUpload(
    file: UploadedFile,
    type: StoredMedia['mediaType'],
  ): void {
    if (!file?.buffer?.length)
      throw new BadRequestException('Choose a media file first.');
    const mime = file.mimetype || '';
    const valid =
      (type === 'voice' && mime.startsWith('audio/')) ||
      (type === 'audio' && mime.startsWith('audio/')) ||
      (type === 'image' && mime.startsWith('image/')) ||
      (type === 'video' && mime.startsWith('video/')) ||
      (type === 'gif' && mime === 'video/mp4') ||
      (type === 'sticker' && mime === 'image/webp') ||
      type === 'document';
    if (!valid)
      throw new BadRequestException(
        `The selected file is not a valid ${type}.`,
      );
  }

  private async ensureTenantDirectory(tenantId: string): Promise<string> {
    const safeTenantId = tenantId.replace(/[^a-zA-Z0-9-]/g, '');
    const directory = join(this.root, safeTenantId);
    await fs.mkdir(directory, { recursive: true });
    return directory;
  }

  private safeExtension(fileName: string, mimeType: string): string {
    const extension = extname(fileName || '').toLowerCase();
    if (/^\.[a-z0-9]{1,8}$/.test(extension)) return extension;
    return this.extensionForMime(mimeType, 'document');
  }

  private extensionForMime(
    mimeType: string,
    mediaType: StoredMedia['mediaType'],
  ): string {
    const cleanMime = mimeType.split(';')[0].trim().toLowerCase();
    const extensions: Record<string, string> = {
      'audio/ogg': '.ogg',
      'audio/webm': '.webm',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
    };
    return (
      extensions[cleanMime] ||
      (
        {
          voice: '.ogg',
          image: '.jpg',
          video: '.mp4',
          gif: '.mp4',
          sticker: '.webp',
          audio: '.ogg',
          document: '.bin',
        } as const
      )[mediaType]
    );
  }

  private mimeFromExtension(extension: string): string {
    const mime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.ogg': 'audio/ogg',
      '.mp3': 'audio/mpeg',
      '.pdf': 'application/pdf',
    };
    return mime[extension] || 'application/octet-stream';
  }
}
