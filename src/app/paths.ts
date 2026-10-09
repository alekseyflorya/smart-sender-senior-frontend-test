export const paths = {
  login: '/login',
  webhooks: '/webhooks',
  webhook: (id: number) => `/webhooks/${id}`,
} as const;
