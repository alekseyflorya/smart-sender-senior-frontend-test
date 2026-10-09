import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../../app/api';
import { PAGE_SIZE, type ListParams } from './listParams';
import { webhookKeys } from '../queryKeys';

export function useWebhookList({ page, search }: ListParams) {
  return useQuery({
    queryKey: webhookKeys.list({ page, search }),
    queryFn: ({ signal }) =>
      api.listWebhooks({ page, limit: PAGE_SIZE, search }, signal),
    // Keeps the current rows on screen while the next page or search loads.
    placeholderData: keepPreviousData,
  });
}
