import { chapterNumber } from './repertoireMoves';
import type { StudyChapter } from './studyPgn';

/**
 * Chapter number (the `NN` prefix of the chapter title) -> that chapter's
 * `ChapterURL` in the study export. Chapters without a number or a URL are
 * left out rather than guessed at.
 */
export const chapterUrlMap = (chapters: StudyChapter[]): Map<number, string> => {
  const urls = new Map<number, string>();
  for (const { header } of chapters) {
    const chapterNo = chapterNumber(header.chapterName);
    if (chapterNo !== null && header.chapterUrl) urls.set(chapterNo, header.chapterUrl);
  }
  return urls;
};

export interface LineUrlChange {
  id: string;
  lineName: string;
  from: string | null;
  to: string;
}

/**
 * The `repertoire_lines` rows whose stored URL differs from their chapter's.
 * Rows are matched on the numeric prefix of `line_name`; a row with no prefix,
 * or no chapter under that number, is never touched.
 */
export const lineUrlChanges = (
  lines: { id: string; line_name: string | null; lichess_url: string | null }[],
  urls: Map<number, string>
): LineUrlChange[] =>
  lines.flatMap(line => {
    const chapterNo = line.line_name ? chapterNumber(line.line_name) : null;
    const to = chapterNo === null ? undefined : urls.get(chapterNo);
    if (!to || to === line.lichess_url) return [];
    return [{ id: line.id, lineName: line.line_name as string, from: line.lichess_url, to }];
  });
