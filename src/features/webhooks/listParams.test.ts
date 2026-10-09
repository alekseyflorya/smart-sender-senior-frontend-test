import { describe, expect, it } from 'vitest';
import { parseListParams, toSearchParams } from './listParams';

describe('parseListParams', () => {
  it('reads page and search from the URL', () => {
    const params = new URLSearchParams('page=2&search=order');

    expect(parseListParams(params)).toEqual({ page: 2, search: 'order' });
  });

  it('defaults to the first page and an empty search', () => {
    expect(parseListParams(new URLSearchParams())).toEqual({
      page: 1,
      search: '',
    });
  });

  it.each(['abc', '0', '-3', '1.5', ''])(
    'falls back to the first page for page=%j',
    (page) => {
      expect(parseListParams(new URLSearchParams({ page })).page).toBe(1);
    },
  );

  it('trims the search', () => {
    const params = new URLSearchParams({ search: '  order  ' });

    expect(parseListParams(params).search).toBe('order');
  });
});

describe('toSearchParams', () => {
  it('leaves defaults out of the URL', () => {
    expect(toSearchParams({ page: 1, search: '' }).toString()).toBe('');
  });

  it('writes a non-default page and search', () => {
    expect(toSearchParams({ page: 2, search: 'order' }).toString()).toBe(
      'page=2&search=order',
    );
  });
});
