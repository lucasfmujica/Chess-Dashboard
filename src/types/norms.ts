export type NormTitle = 'IM' | 'GM' | 'WIM' | 'WGM';

/** A logged tournament, tracked against (editable, approximate) title thresholds. */
export interface NormAttempt {
  id: string;
  createdAt: number;
  tournament: string;
  titleTarget: NormTitle;
  gamesCount?: number;
  performanceRating?: number;
  titledOpponents?: number;
  foreignOpponents?: number;
  notes?: string;
}

/** User-editable performance-rating thresholds per title — defaults are typical
 * historical figures, not an authoritative current FIDE source. */
export type NormThresholds = Record<NormTitle, number>;
