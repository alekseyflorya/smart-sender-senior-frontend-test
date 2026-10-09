import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { WebhookInput, WebhookList } from '../../../api/contract';
import { api } from '../../../app/api';
import { webhookKeys } from '../queryKeys';

export function useUpdateWebhook(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: WebhookInput) => api.updateWebhook(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData(webhookKeys.detail(id), updated);
      // Cached pages show the new row right away; the invalidation then
      // refetches them, because a rename can change who matches a search.
      queryClient.setQueriesData<WebhookList>(
        { queryKey: webhookKeys.lists() },
        (list) =>
          list && {
            ...list,
            data: list.data.map((webhook) =>
              webhook.id === updated.id ? updated : webhook,
            ),
          },
      );
      return queryClient.invalidateQueries({ queryKey: webhookKeys.lists() });
    },
  });
}
