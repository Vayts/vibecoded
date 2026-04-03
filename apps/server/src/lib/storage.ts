import { Storage } from '@google-cloud/storage';
import { Client } from 'minio';
import { randomUUID } from 'node:crypto';

type StorageBackend = 'gcs' | 'minio';

const BUCKET = process.env.GCS_BUCKET || 'acme-images';
const STORAGE_BACKEND =
  (process.env.STORAGE_BACKEND as StorageBackend | undefined) ||
  (process.env.NODE_ENV === 'production' ? 'gcs' : 'minio');
const MINIO_ENDPOINT = process.env.GCS_ENDPOINT || 'http://localhost:9000';
const MINIO_ACCESS_KEY = process.env.GCS_ACCESS_KEY || 'minioadmin';
const MINIO_SECRET_KEY = process.env.GCS_SECRET_KEY || 'minioadmin123';

if (STORAGE_BACKEND !== 'gcs' && STORAGE_BACKEND !== 'minio') {
  throw new Error(`Unsupported STORAGE_BACKEND: ${STORAGE_BACKEND}`);
}

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

/**
 * Stream an object from the configured object storage by its relative path.
 * Returns the readable stream and stat metadata.
 */
export const getObjectStream = async (
  relativePath: string,
): Promise<{ stream: NodeJS.ReadableStream; contentType: string; size: number }> => {
  const startedAt = Date.now();
  await ensureBucket();

  // Strip leading slash to get the object key
  const objectKey = relativePath.replace(/^\//, '');
  console.log(`[storage] stream start backend=${STORAGE_BACKEND} bucket=${BUCKET} objectKey=${objectKey}`);

  if (STORAGE_BACKEND === 'gcs') {
    const file = gcsClient.bucket(BUCKET).file(objectKey);
    const [metadata] = await file.getMetadata();
    const stream = file.createReadStream();
    const size = Number(metadata.size || 0);
    const contentType = metadata.contentType || 'image/jpeg';

    console.log(
      `[storage] stream ready backend=${STORAGE_BACKEND} bucket=${BUCKET} objectKey=${objectKey} bytes=${size} elapsed=${Date.now() - startedAt}ms`,
    );

    return {
      stream,
      contentType,
      size,
    };
  }

  const stat = await minioClient.statObject(BUCKET, objectKey);
  const stream = await minioClient.getObject(BUCKET, objectKey);

  console.log(
    `[storage] stream ready backend=${STORAGE_BACKEND} bucket=${BUCKET} objectKey=${objectKey} bytes=${stat.size} elapsed=${Date.now() - startedAt}ms`,
  );

  return {
    stream,
    contentType: (stat.metaData?.['content-type'] as string) || 'image/jpeg',
    size: stat.size,
  };
};
