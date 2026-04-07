import { Injectable } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request, Response } from 'express';
import { auth } from '../product-analyze/lib/auth';

const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

const toFormValue = (value: unknown): string => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return JSON.stringify(value);
};

const getRequestUrl = (request: Request): string => {
  const protocol = request.header('x-forwarded-proto') ?? request.protocol;
  const host = request.get('host');

  if (!host) {
    throw new Error('Missing Host header');
  }

  return `${protocol}://${host}${request.originalUrl}`;
};

const toRequestBody = (request: Request): BodyInit | undefined => {
  if (METHODS_WITHOUT_BODY.has(request.method.toUpperCase())) {
    return undefined;
  }

  const body: unknown = request.body;
  if (body == null) {
    return undefined;
  }

  if (Buffer.isBuffer(body)) {
    return new Uint8Array(body);
  }

  if (typeof body === 'string') {
    return body;
  }

  const contentType = request.header('content-type') ?? '';

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(
      body as Record<string, unknown>,
    )) {
      if (value == null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, toFormValue(item));
        }
        continue;
      }

      params.append(key, toFormValue(value));
    }

    return params.toString();
  }

  return JSON.stringify(body);
};

const applyResponseHeaders = (response: Response, headers: Headers): void => {
  const setCookieHeader = (
    headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.();

  if (setCookieHeader && setCookieHeader.length > 0) {
    response.setHeader('Set-Cookie', setCookieHeader);
  }

  headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      return;
    }

    response.setHeader(key, value);
  });
};

@Injectable()
export class AuthService {
  async handle(request: Request, response: Response): Promise<void> {
    const headers = fromNodeHeaders(request.headers);
    headers.delete('content-length');

    const body = toRequestBody(request);
    const authResponse = await auth.handler(
      new Request(getRequestUrl(request), {
        method: request.method,
        headers,
        ...(body === undefined ? {} : { body }),
      }),
    );

    response.status(authResponse.status);
    applyResponseHeaders(response, authResponse.headers);

    if (
      request.method.toUpperCase() === 'HEAD' ||
      authResponse.status === 204
    ) {
      response.end();
      return;
    }

    const payload = Buffer.from(await authResponse.arrayBuffer());
    response.send(payload);
  }
}
