interface RawPhotoBody {
  imageBase64?: unknown;
  ocr?: unknown;
}

export const toRawPhotoBody = (body: unknown): RawPhotoBody => {
  if (!body || typeof body !== 'object') {
    return {};
  }

  return body as RawPhotoBody;
};
