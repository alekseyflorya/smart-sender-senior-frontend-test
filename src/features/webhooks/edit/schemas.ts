import { z } from 'zod';

// Mirrors the server rules for instant feedback; the server stays the source
// of truth, and its 422s are shown next to the fields too. trim() goes first:
// Zod 4 runs checks in declaration order. z.url() rather than z.httpUrl(),
// which would reject localhost and IP addresses.
export const webhookFormSchema = z.object({
  name: z.string().trim().min(1, { error: 'Enter a name.' }),
  url: z
    .string()
    .trim()
    .pipe(z.url({ protocol: /^https?$/, error: 'Enter a valid http(s) URL.' })),
});

export type WebhookFormValues = z.infer<typeof webhookFormSchema>;
