import { prisma } from '../lib/prisma';

export const isFavourite = async (
  userId: string,
  productId: string,
): Promise<boolean> => {
  const fav = await prisma.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });
  return fav != null;
};

export const isFavouriteByBarcode = async (
  userId: string,
  barcode: string,
): Promise<boolean> => {
  const product = await prisma.product.findUnique({
    where: { barcode },
    select: { id: true },
  });
  if (!product) return false;
  return isFavourite(userId, product.id);
};
