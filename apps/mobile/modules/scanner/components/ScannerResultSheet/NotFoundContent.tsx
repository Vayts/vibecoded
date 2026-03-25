import type { BarcodeLookupResponse } from '@acme/shared';
import { Typography } from '../../../../shared/components/Typography';
import { Section } from './ProductResultSections';

interface NotFoundContentProps {
  result: Extract<BarcodeLookupResponse, { success: false }>;
  origin?: 'barcode' | 'photo';
}

export function NotFoundContent({ result, origin = 'barcode' }: NotFoundContentProps) {
  const description =
    origin === 'photo'
      ? 'We could not reliably identify a packaged food product from this photo. Try another angle or a clearer front-of-pack shot.'
      : `No product was found for barcode ${result.barcode}. Try a clearer scan or another product.`;

  return (
    <Section title="Lookup result">
      <Typography variant="sectionTitle">Product not found</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-600">
        {description}
      </Typography>
    </Section>
  );
}