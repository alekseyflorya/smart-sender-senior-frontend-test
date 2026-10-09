export const paths = {
  login: '/login',
  webhooks: '/webhooks',
  webhookPattern: '/webhooks/:id',
  webhook: (id: number) => `/webhooks/${id}`,
} as const;
