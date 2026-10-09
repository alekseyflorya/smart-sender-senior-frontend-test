import type { ListParams } from './listParams';

const all = ['webhooks'] as const;
const lists = () => [...all, 'list'] as const;

export const webhookKeys = {
  all,
  lists,
  list: (params: ListParams) => [...lists(), params] as const,
};
