export const NOT_FOOD_ERROR_CODE = 'NOT_FOOD';
export const NOT_FOOD_ERROR_MESSAGE = 'This product does not appear to be a food item';

export class NotFoodProductError extends Error {
  readonly code = NOT_FOOD_ERROR_CODE;

  constructor(message = NOT_FOOD_ERROR_MESSAGE) {
    super(message);
    this.name = 'NotFoodProductError';
  }
}

