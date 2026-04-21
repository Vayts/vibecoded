import { withCanonicalProductImage, resolveCanonicalProductImageUrl } from './product-image';

describe('product image canonicalization', () => {
  it('prefers the structured front image when both sources are present', () => {
    expect(
      resolveCanonicalProductImageUrl('https://cdn.example.com/listing.jpg', {
        front_url: 'https://cdn.example.com/front.jpg',
      }),
    ).toBe('https://cdn.example.com/front.jpg');
  });

  it('falls back to image_url when legacy images.front_url is missing', () => {
    expect(
      resolveCanonicalProductImageUrl('https://cdn.example.com/listing.jpg', {
        front_url: null,
      }),
    ).toBe('https://cdn.example.com/listing.jpg');
  });

  it('normalizes product image fields to the same canonical image url', () => {
    const product = withCanonicalProductImage({
      image_url: 'https://cdn.example.com/listing.jpg',
      images: {
        front_url: 'https://cdn.example.com/front.jpg',
        ingredients_url: null,
        nutrition_url: null,
      },
    });

    expect(product.image_url).toBe('https://cdn.example.com/front.jpg');
    expect(product.images.front_url).toBe('https://cdn.example.com/front.jpg');
  });

  it('treats null-like image values as missing', () => {
    expect(
      resolveCanonicalProductImageUrl('/', {
        front_url: '/null',
      }),
    ).toBeNull();
  });
});

