interface RawPhotoBodyV2 {
  imageBase64?: unknown;
  ocr?: unknown;
}

export const toRawPhotoBodyV2 = (body: unknown): RawPhotoBodyV2 => {
  if (!body || typeof body !== 'object') {
    return {};
  }

  return body as RawPhotoBodyV2;
};
