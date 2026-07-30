import { describe, it, expect } from 'vitest';
import { parseFideRatings } from './_fide';

/** Trimmed from the real page (FIDE ID 20046847), tabs and all. */
const PROFILE_HTML = `
<div class="profile-games ">
  <div class="profile-standart profile-game ">
    <img src="/img/logo_std.svg" alt="standart" height=25>
    <p>1878</p><p style="font-size: 8px; padding:0; margin:0;">STANDARD <span class=inactiv_note></span></p>
  </div>
  <div class="profile-rapid profile-game ">
    <img src="/img/logo_rpd.svg" alt="rapid"  height=25>
    <p>1882</p><p style="font-size: 8px; padding:0; margin:0;">RAPID<span class=inactiv_note></p>
  </div>
  <div class="profile-blitz profile-game ">
    <img src="/img/logo_blitz.svg " alt="blitz"  height=25>
    <p>1879</p><p style="font-size: 8px; padding:0; margin:0;">BLITZ<span class=inactiv_note></p>
  </div>
</div>`;

describe('parseFideRatings', () => {
  it('reads the three ratings off a profile', () => {
    expect(parseFideRatings(PROFILE_HTML)).toEqual({
      standard: 1878,
      rapid: 1882,
      blitz: 1879,
    });
  });

  it('returns null for a category with no rating instead of borrowing the next one', () => {
    const unratedBlitz = PROFILE_HTML.replace('<p>1879</p>', '<p></p>');
    expect(parseFideRatings(unratedBlitz).blitz).toBeNull();
    expect(parseFideRatings(unratedBlitz).standard).toBe(1878);
  });

  it('returns nulls when the page no longer has the blocks', () => {
    expect(parseFideRatings('<html><body>Service unavailable</body></html>')).toEqual({
      standard: null,
      rapid: null,
      blitz: null,
    });
  });
});
