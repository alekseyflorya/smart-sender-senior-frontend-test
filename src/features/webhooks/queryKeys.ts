import type { ListParams } from './list/listParams';

const all = ['webhooks'] as const;
const lists = () => [...all, 'list'] as const;
const details = () => [...all, 'detail'] as const;

export const webhookKeys = {
  all,
  lists,
  list: (params: ListParams) => [...lists(), params] as const,
  details,
  detail: (id: number) => [...details(), id] as const,
};
