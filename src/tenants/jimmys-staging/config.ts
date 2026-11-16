import { jimmys } from '../jimmys/config';
import { defineRestaurant } from '../../core/config/define';

export const config = defineRestaurant({
  ...jimmys,
  slug: 'jimmys-staging',
  ordering: { ...jimmys.ordering, payment: 'payfast', fulfilment: ['collection'] },
});
