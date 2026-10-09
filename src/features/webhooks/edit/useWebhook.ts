import { useQuery } from '@tanstack/react-query';
import { api } from '../../../app/api';
import { webhookKeys } from '../queryKeys';

export function useWebhook(id: number) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: ({ signal }) => api.getWebhook(id, signal),
  });
}
