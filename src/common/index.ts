export * from './types';
export * from './filter';

export const formatNumber = (number: any) => 
    !number
      ? 0
      : parseFloat(number).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });