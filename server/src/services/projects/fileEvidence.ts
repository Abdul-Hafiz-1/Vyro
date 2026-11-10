import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config/index.js';
import { DeliveryFileMeta } from '../../types/index.js';
import { ProjectTransitionError } from './projectStateMachine.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_SUBMISSION = 5;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.zip'
]);

const ALLOWED_MIME_PREFIXES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream'
];

export interface IncomingEvidenceFile {
  name?: string;
  originalName?: string;
  mimeType: string;
  base64?: string;
  contentBase64?: string;
}

export function saveEvidenceFiles(files?: IncomingEvidenceFile[]): DeliveryFileMeta[] {
  if (!files || !Array.isArray(files) || files.length === 0) return [];
  if (files.length > MAX_FILES_PER_SUBMISSION) {
    throw new ProjectTransitionError(400, 'TOO_MANY_FILES', `Maximum ${MAX_FILES_PER_SUBMISSION} files allowed per submission.`);
  }

  fs.mkdirSync(config.uploadsDir, { recursive: true });
  const saved: DeliveryFileMeta[] = [];

  for (const item of files) {
    const rawName = path.basename(String(item.name || item.originalName || 'attachment')).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = path.extname(rawName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new ProjectTransitionError(
        400,
        'FILE_TYPE_NOT_ALLOWED',
        `File type "${ext || 'unknown'}" is not allowed. Allowed: PDF, PNG, JPG, WEBP, TXT, MD, CSV, JSON, ZIP.`
      );
    }

    const mime = String(item.mimeType || 'application/octet-stream').toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIME_PREFIXES.includes(mime)) {
      throw new ProjectTransitionError(400, 'MIME_NOT_ALLOWED', `Unsupported file MIME type: ${mime}`);
    }

    const b64 = String(item.base64 || item.contentBase64 || '').replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    if (buf.length === 0) {
      throw new ProjectTransitionError(400, 'EMPTY_FILE', `File "${rawName}" is empty.`);
    }
    if (buf.length > MAX_FILE_BYTES) {
      throw new ProjectTransitionError(400, 'FILE_TOO_LARGE', `File "${rawName}" exceeds the 10 MB limit.`);
    }

    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const id = `file_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
    const storedName = `${id}${ext}`;
    const fullPath = path.join(config.uploadsDir, storedName);
    fs.writeFileSync(fullPath, buf);

    saved.push({
      id,
      originalName: rawName,
      storedName,
      mimeType: mime,
      sizeBytes: buf.length,
      sha256
    });
  }

  return saved;
}

export function resolvePrivateEvidenceFilePath(storedName: string): string | null {
  const safeBase = path.basename(storedName);
  const fullPath = path.join(config.uploadsDir, safeBase);
  if (!fullPath.startsWith(config.uploadsDir)) return null;
  if (!fs.existsSync(fullPath)) return null;
  return fullPath;
}
