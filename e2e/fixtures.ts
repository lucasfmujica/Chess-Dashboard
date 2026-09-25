import { test as base, expect, type Page } from '@playwright/test';

/**
 * The app loads everything from `/api` before it renders anything; without a
 * backend it stops on "Couldn't load data from the database". CI has no
 * database, so every spec runs against an empty account served from here.
 *
 * Matched on the pathname, not a `** /api/**` glob: the glob also catches
 * `/src/api/client.ts` under the dev server and breaks the module graph.
 */
const EMPTY_BY_PATH: Record<string, unknown> = {
  '/api/repertoire': { white: [], black: [] },
  '/api/opening-heroes': {},
  '/api/tournament-locations': {},
};

export const mockEmptyApi = async (page: Page) => {
  await page.route(
    url => url.pathname.startsWith('/api/'),
    route => {
      const request = route.request();
      const { pathname } = new URL(request.url());
      if (request.method() !== 'GET') return route.fulfill({ json: {} });
      // A missing profile is a 404 by contract; the app falls back to defaults.
      if (pathname === '/api/profile') return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ json: EMPTY_BY_PATH[pathname] ?? [] });
    }
  );
};

export const test = base.extend({
  page: async ({ page }, use) => {
    await mockEmptyApi(page);
    await use(page);
  },
});

export { expect };

/** The sidebar entry for a tab, by the label screen readers get. */
export const navButton = (page: Page, tab: string) =>
  page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: `Navigate to ${tab}` });
