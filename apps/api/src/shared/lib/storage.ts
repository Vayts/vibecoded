import { Storage } from '@google-cloud/storage';
import { Client } from 'minio';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

type StorageBackend = 'gcs' | 'minio';

const BUCKET = process.env.GCS_BUCKET || 'acme-images';
const configuredStorageBackend =
  process.env.STORAGE_BACKEND ?? (process.env.NODE_ENV === 'production' ? 'gcs' : 'minio');
const MINIO_ENDPOINT = process.env.GCS_ENDPOINT || 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.GCS_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.GCS_SECRET_KEY || 'minioadmin123';

if (configuredStorageBackend !== 'gcs' && configuredStorageBackend !== 'minio') {
  throw new Error(`Unsupported STORAGE_BACKEND: ${configuredStorageBackend}`);
}

const STORAGE_BACKEND: StorageBackend = configuredStorageBackend;

const parsedUrl = new URL(MINIO_ENDPOINT);

const minioClient = new Client({
  endPoint: parsedUrl.hostname,
  port: Number(parsedUrl.port) || (parsedUrl.protocol === 'https:' ? 443 : 9000),
  useSSL: parsedUrl.protocol === 'https:',
  accessKey: MINIO_ACCESS_KEY,
  secretKey: MINIO_SECRET_KEY,
});

const gcsClient = new Storage();

let bucketEnsured = false;

const ensureBucket = async (): Promise<void> => {
  if (bucketEnsured) return;

  if (STORAGE_BACKEND === 'gcs') {
    console.log(`[storage] ensuring gcs bucket bucket=${BUCKET}`);
    const [exists] = await gcsClient.bucket(BUCKET).exists();
    if (!exists) {
      throw new Error(`GCS bucket does not exist: ${BUCKET}`);
    }

    console.log(`[storage] gcs bucket ready bucket=${BUCKET}`);
    bucketEnsured = true;
    return;
  }

  console.log(`[storage] ensuring minio bucket bucket=${BUCKET} endpoint=${MINIO_ENDPOINT}`);
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    console.log(`[storage] bucket missing, creating bucket=${BUCKET}`);
    await minioClient.makeBucket(BUCKET);
  }

  console.log(`[storage] minio bucket ready bucket=${BUCKET}`);
  bucketEnsured = true;
};

/**
 * Generate a safe, collision-resistant filename for product images.
 */
const generateFilename = (extension: string): string => {
  const timestamp = Date.now();
  const uuid = randomUUID().replace(/-/g, '').slice(0, 12);
  return `${timestamp}_${uuid}.${extension}`;
};

/**
 * Upload a buffer to the configured object storage under the given folder prefix.
 * Returns the relative path: `/<folder>/<filename>`.
 */
export const uploadToStorage = async (
  buffer: Buffer,
  folder: string,
  extension: string,
  contentType: string,
): Promise<string> => {
  const startedAt = Date.now();
  await ensureBucket();

  const filename = generateFilename(extension);
  const objectKey = `${folder}/${filename}`;

  console.log(
    `[storage] upload start backend=${STORAGE_BACKEND} bucket=${BUCKET} objectKey=${objectKey} bytes=${buffer.length} contentType=${contentType}`,
  );

  if (STORAGE_BACKEND === 'gcs') {
    const file = gcsClient.bucket(BUCKET).file(objectKey);
    await file.save(buffer, {
      resumable: false,
      contentType,
      metadata: {
        contentType,
      },
    });
  } else {
    await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  console.log(
    `[storage] upload done backend=${STORAGE_BACKEND} bucket=${BUCKET} objectKey=${objectKey} elapsed=${Date.now() - startedAt}ms`,
  );

  return `/${objectKey}`;
};

/**
 * Upload a product image buffer to the configured object storage.
 * Returns relative path like `/products/1718899999_abcd1234.jpg`.
 */
export const uploadProductImage = async (buffer: Buffer): Promise<string> => {
  return uploadToStorage(buffer, 'products', 'jpg', 'image/jpeg');
};

export const uploadAvatarImage = async (buffer: Buffer): Promise<string> => {
  return uploadToStorage(buffer, 'avatars', 'jpg', 'image/jpeg');
};

export interface StoredObjectResult {
  stream: Readable;
  contentType: string;
  size: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const getStoredObjectContentType = (value: unknown): string => {
  if (!isRecord(value) || !isRecord(value.metaData)) {
    return 'application/octet-stream';
  }

  const contentType = value.metaData['content-type'];
  return typeof contentType === 'string' && contentType.length > 0
    ? contentType
    : 'application/octet-stream';
};

const getStoredObjectSize = (value: unknown): number => {
  if (!isRecord(value) || !('size' in value)) {
    return 0;
  }

  const size = value.size;

  if (typeof size === 'number') {
    return size;
  }

  if (typeof size === 'string') {
    return Number(size || 0);
  }

  return 0;
};

const normalizeObjectPath = (objectPath: string): string => {
  return objectPath.replace(/^\/+/, '');
};

export const getStoredObject = async (objectPath: string): Promise<StoredObjectResult | null> => {
  await ensureBucket();

  const normalizedPath = normalizeObjectPath(objectPath);

  if (STORAGE_BACKEND === 'gcs') {
    const file = gcsClient.bucket(BUCKET).file(normalizedPath);
    const [exists] = await file.exists();

    if (!exists) {
      return null;
    }

    const [metadata] = await file.getMetadata();
    return {
      stream: file.createReadStream(),
      contentType: metadata.contentType || 'application/octet-stream',
      size: Number(metadata.size || 0),
    };
  }

  try {
    const statResult: unknown = await minioClient.statObject(BUCKET, normalizedPath);
    const objectStreamResult: unknown = await minioClient.getObject(BUCKET, normalizedPath);

    if (!(objectStreamResult instanceof Readable)) {
      throw new Error('MinIO returned a non-readable object stream');
    }

    return {
      stream: objectStreamResult,
      contentType: getStoredObjectContentType(statResult),
      size: getStoredObjectSize(statResult),
    };
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;

    if (code === 'NotFound' || code === 'NoSuchKey' || code === 'NoSuchObject') {
      return null;
    }

    throw error;
  }
};

export const deleteStoredObject = async (objectPath: string): Promise<void> => {
  await ensureBucket();

  const normalizedPath = normalizeObjectPath(objectPath);

  if (!normalizedPath) {
    return;
  }

  if (STORAGE_BACKEND === 'gcs') {
    const file = gcsClient.bucket(BUCKET).file(normalizedPath);
    const [exists] = await file.exists();

    if (!exists) {
      return;
    }

    await file.delete();
    return;
  }

  try {
    await minioClient.removeObject(BUCKET, normalizedPath);
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : undefined;

    if (code === 'NotFound' || code === 'NoSuchKey' || code === 'NoSuchObject') {
      return;
    }

    throw error;
  }
};
