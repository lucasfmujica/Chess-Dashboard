/**
 * Current ratings read off the public FIDE profile page.
 *
 * FIDE publishes no API, so the ratings are scraped from the profile HTML.
 * They live in three sibling blocks that have kept the same shape for years:
 *
 *   <div class="profile-standart profile-game ">
 *     <img src="/img/logo_std.svg" …><p>1878</p><p …>STANDARD …</p>
 *
 * ("standart" is FIDE's spelling, not a typo here.) The parse is deliberately
 * narrow — it reads the first number inside each block and nothing else — so a
 * redesign makes it return null rather than a plausible wrong rating, and the
 * caller keeps the stored value instead of overwriting it with garbage.
 */

export interface FideRatings {
  standard: number | null;
  rapid: number | null;
  blitz: number | null;
}

/** The rating shown in one profile block, or null if absent/unrated. */
const ratingIn = (html: string, block: string): number | null => {
  const start = html.indexOf(`profile-${block} profile-game`);
  if (start === -1) return null;
  // Bounded window: the next block starts well inside 400 chars, so a missing
  // number here can't be filled in by the following category's rating.
  const match = /<p>\s*(\d{3,4})\s*<\/p>/.exec(html.slice(start, start + 400));
  return match ? Number(match[1]) : null;
};

export const parseFideRatings = (html: string): FideRatings => ({
  standard: ratingIn(html, 'standart'),
  rapid: ratingIn(html, 'rapid'),
  blitz: ratingIn(html, 'blitz'),
});

/** The FIDE ID whose profile is this dashboard's owner. */
export const FIDE_ID = process.env.FIDE_ID ?? '20046847';

export const fideProfileUrl = (fideId = FIDE_ID) => `https://ratings.fide.com/profile/${fideId}`;

/**
 * Fetch and parse the profile. Throws on a non-200; a 200 that no longer
 * contains the rating blocks yields nulls, which the caller treats as "leave
 * the stored rating alone".
 */
export const fetchFideRatings = async (fideId = FIDE_ID): Promise<FideRatings> => {
  const res = await fetch(fideProfileUrl(fideId), {
    // The default fetch UA gets served an error page often enough to matter.
    headers: { 'User-Agent': 'Mozilla/5.0 (chess-dashboard rating sync)' },
  });
  if (!res.ok) throw new Error(`FIDE profile ${fideId}: ${res.status}`);
  return parseFideRatings(await res.text());
};
