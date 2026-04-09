import { Prisma } from '@prisma/client';

export const normalizeSearchQuery = (search?: string): string | undefined => {
  const normalized = search?.trim();
  return normalized ? normalized : undefined;
};

export const buildProductSearchFilter = (
  search: string,
): Prisma.ProductWhereInput => ({
  OR: [
    {
      product_name: {
        contains: search,
        mode: Prisma.QueryMode.insensitive,
      },
    },
    {
      brands: {
        contains: search,
        mode: Prisma.QueryMode.insensitive,
      },
    },
  ],
});
