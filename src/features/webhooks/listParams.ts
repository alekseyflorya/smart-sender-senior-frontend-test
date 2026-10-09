import { z } from 'zod';

export const PAGE_SIZE = 10;
export const FIRST_PAGE = 1;

export interface ListParams {
  page: number;
  search: string;
}

// The URL is user input: "abc", "0", "-3" or "1.5" all fall back to the first page.
const pageSchema = z.coerce.number().int().min(FIRST_PAGE).catch(FIRST_PAGE);

export function parseListParams(searchParams: URLSearchParams): ListParams {
  return {
    page: pageSchema.parse(searchParams.get('page')),
    search: (searchParams.get('search') ?? '').trim(),
  };
}

/** The canonical URL form: defaults (first page, empty search) are left out. */
export function toSearchParams({ page, search }: ListParams): URLSearchParams {
  const params = new URLSearchParams();
  if (page !== FIRST_PAGE) params.set('page', String(page));
  if (search) params.set('search', search);
  return params;
}
