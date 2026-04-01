import { Client } from 'minio';
import { randomUUID } from 'node:crypto';

const BUCKET = process.env.GCS_BUCKET || 'acme-images';
const ENDPOINT = process.env.GCS_ENDPOINT || 'http://localhost:9000';
const ACCESS_KEY = process.env.GCS_ACCESS_KEY || 'minioadmin';
const SECRET_KEY = process.env.GCS_SECRET_KEY || 'minioadmin123';

const parsedUrl = new URL(ENDPOINT);

const minioClient = new Client({
  endPoint: parsedUrl.hostname,
  port: Number(parsedUrl.port) || (parsedUrl.protocol === 'https:' ? 443 : 9000),
  useSSL: parsedUrl.protocol === 'https:',
  accessKey: ACCESS_KEY,
  secretKey: SECRET_KEY,
});

let bucketEnsured = false;

const ensureBucket = async (): Promise<void> => {
  if (bucketEnsured) return;
  console.log(`[storage] ensuring bucket bucket=${BUCKET} endpoint=${ENDPOINT}`);
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    console.log(`[storage] bucket missing, creating bucket=${BUCKET}`);
    await minioClient.makeBucket(BUCKET);
  }
  console.log(`[storage] bucket ready bucket=${BUCKET}`);
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
 * Upload a buffer to MinIO under the given folder prefix.
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
    `[storage] upload start bucket=${BUCKET} objectKey=${objectKey} bytes=${buffer.length} contentType=${contentType}`,
  );

  await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
    'Content-Type': contentType,
  });

  console.log(
    `[storage] upload done bucket=${BUCKET} objectKey=${objectKey} elapsed=${Date.now() - startedAt}ms`,
  );

  return `/${objectKey}`;
};

/**
 * Upload a product image buffer to MinIO.
 * Returns relative path like `/products/1718899999_abcd1234.jpg`.
 */
export const uploadProductImage = async (buffer: Buffer): Promise<string> => {
  return uploadToStorage(buffer, 'products', 'jpg', 'image/jpeg');
};

/**
 * Stream an object from MinIO by its relative path (e.g. `/products/filename.jpg`).
 * Returns the readable stream and stat metadata.
 */
export const getObjectStream = async (
  relativePath: string,
): Promise<{ stream: NodeJS.ReadableStream; contentType: string; size: number }> => {
  const startedAt = Date.now();
  await ensureBucket();

  // Strip leading slash to get the object key
  const objectKey = relativePath.replace(/^\//, '');
  console.log(`[storage] stream start bucket=${BUCKET} objectKey=${objectKey}`);
  const stat = await minioClient.statObject(BUCKET, objectKey);
  const stream = await minioClient.getObject(BUCKET, objectKey);

  console.log(
    `[storage] stream ready bucket=${BUCKET} objectKey=${objectKey} bytes=${stat.size} elapsed=${Date.now() - startedAt}ms`,
  );

  return {
    stream,
    contentType: (stat.metaData?.['content-type'] as string) || 'image/jpeg',
    size: stat.size,
  };
};
