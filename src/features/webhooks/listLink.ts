import { z } from 'zod';
import { paths } from '../../app/paths';

/** Router state the list hands to the edit page, so "back" keeps page and search. */
export interface ListLinkState {
  listSearch: string;
}

// location.state is `unknown` and survives reloads; a direct visit has none.
const listLinkStateSchema = z.object({
  listSearch: z.string().regex(/^(\?.*)?$/),
});

export function getListHref(state: unknown): string {
  const parsed = listLinkStateSchema.safeParse(state);
  return parsed.success
    ? paths.webhooks + parsed.data.listSearch
    : paths.webhooks;
}
