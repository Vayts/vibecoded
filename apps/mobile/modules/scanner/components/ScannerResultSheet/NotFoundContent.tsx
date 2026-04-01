import type { BarcodeLookupResponse } from '@acme/shared';
import { Typography } from '../../../../shared/components/Typography';
import { Section } from './ProductResultSections';

interface NotFoundContentProps {
  result: Extract<BarcodeLookupResponse, { success: false }>;
}

export function NotFoundContent({ result }: NotFoundContentProps) {
  return (
    <Section title="Lookup result">
      <Typography variant="sectionTitle">Product not found</Typography>
      <Typography variant="bodySecondary" className="mt-2 leading-6 text-gray-600">
        {`No product was found for barcode ${result.barcode}. Try a clearer scan or another product.`}
      </Typography>
    </Section>
  );
}