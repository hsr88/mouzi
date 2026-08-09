/**
 * Verifiable community reach for the Impact page.
 *
 * Only record values you have checked yourself. Prefer omitting a field
 * (leave it null / undefined) over guessing. Cards with `enabled: false`
 * are hidden entirely.
 */

export interface CommunityEngagement {
  /** Safe display string, e.g. "130+ upvotes" or "66k views". */
  label: string;
  /** Month and year the figure was last confirmed, e.g. "August 2026". */
  sourceChecked: string;
}

export interface CommunityLink {
  label: string;
  url: string;
  views?: string | null;
}

export interface RedditReachCard {
  enabled: boolean;
  kind: 'reddit';
  /** Small amber eyebrow, e.g. "REDDIT" or "COMMUNITY". */
  label: string;
  title: string;
  community: string;
  url: string;
  /** ISO date string when known. Hidden when null. */
  publishedAt: string | null;
  engagement: CommunityEngagement | null;
  /** Extra engagement line, e.g. views next to upvotes. */
  secondaryEngagement?: CommunityEngagement | null;
  comments: number | null;
  summary: string;
  ctaLabel: string;
  /** Optional related threads shown as compact links under the card. */
  related?: CommunityLink[];
}

export interface PodcastReachCard {
  enabled: boolean;
  kind: 'podcast';
  label: string;
  podcastName: string;
  episodeTitle: string;
  episodeNumber: string | null;
  /** ISO date string when known. */
  publishedAt: string | null;
  summary: string;
  /** Start of the mention in seconds. */
  timestampSeconds: number | null;
  /** Exact verified quote only. Hidden when null. */
  quote: string | null;
  url: string;
  sourceChecked: string;
  ctaLabel?: string;
}

export interface CoverageReachCard {
  enabled: boolean;
  kind: 'coverage';
  label: string;
  title: string;
  outlet: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  engagement: CommunityEngagement | null;
  sourceChecked: string;
  ctaLabel: string;
}

export type CommunityReachCard = RedditReachCard | PodcastReachCard | CoverageReachCard;

function formatTimestamp(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function podcastListenLabel(card: PodcastReachCard): string {
  if (card.ctaLabel) return card.ctaLabel;
  if (card.timestampSeconds === null) return 'Listen to episode';
  return `Listen from ${formatTimestamp(card.timestampSeconds)}`;
}

export function formatPublished(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return null;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Community reach cards shown on /impact.
 * Order matters: Reddit primary → additional community → podcast → coverage.
 */
export const communityReach: CommunityReachCard[] = [
  {
    enabled: true,
    kind: 'reddit',
    label: 'REDDIT',
    title: 'Mouzi: Organize Downloads folder automatically',
    community: 'r/software',
    url: 'https://www.reddit.com/r/software/comments/1tis5yj/mouzi_organize_downloads_folder_automatically/',
    publishedAt: null,
    engagement: {
      label: '130+ upvotes',
      sourceChecked: 'August 2026',
    },
    secondaryEngagement: {
      label: '46k views',
      sourceChecked: 'August 2026',
    },
    comments: null,
    summary:
      'A public launch thread where users discussed local-first Downloads automation and compared Mouzi with cloud organizers.',
    ctaLabel: 'View discussion',
  },
  {
    enabled: true,
    kind: 'reddit',
    label: 'COMMUNITY',
    title: 'Mouzi: Organize Downloads folder automatically',
    community: 'r/coolgithubprojects',
    url: 'https://www.reddit.com/r/coolgithubprojects/comments/1tcbzrg/mouzi_organize_downloads_folder_automatically/',
    publishedAt: null,
    engagement: {
      label: '66k views',
      sourceChecked: 'August 2026',
    },
    secondaryEngagement: null,
    comments: null,
    summary:
      'Shared among developers browsing open-source tools, with follow-on posts in related communities.',
    ctaLabel: 'Open thread',
    related: [
      {
        label: 'r/DigitalEscapeTools',
        url: 'https://www.reddit.com/r/DigitalEscapeTools/comments/1tkmjq5/mouzi_organize_downloads_folder_automatically/',
        views: '45k views',
      },
      {
        label: 'r/linux',
        url: 'https://www.reddit.com/r/linux/comments/1u33gjp/mouzi_auto_file_organizer_for_downloads_now_on/',
        views: '37k views',
      },
    ],
  },
  {
    enabled: true,
    kind: 'podcast',
    label: 'PODCAST',
    podcastName: 'LINUX Unplugged',
    episodeTitle: 'Windows Without Windows',
    episodeNumber: '671',
    publishedAt: '2026-06-14',
    summary:
      'Mouzi was featured as an episode pick: a silent tray app that keeps Downloads tidy with local rules.',
    timestampSeconds: 2938,
    quote: null,
    url: 'https://linuxunplugged.com/671?t=2938',
    sourceChecked: 'August 2026',
  },
  {
    enabled: true,
    kind: 'coverage',
    label: 'DIRECTORY',
    title: 'Mouzi v0.1.3 — Free Download',
    outlet: 'OlderGeeks.com',
    url: 'https://www.oldergeeks.com/downloads/file.php?id=4961',
    publishedAt: null,
    summary:
      'Listed in the OlderGeeks freeware directory, where Windows users discover small local utilities without store accounts or cloud sign-ups.',
    engagement: null,
    sourceChecked: 'August 2026',
    ctaLabel: 'View listing',
  },
];

/**
 * Closing note under the cards. Keep it honest: these are examples, not a full list.
 */
export const communityReachNote =
  'These are only a few of the public mentions. Many more threads, shares and write-ups have helped people find Mouzi, and more keep appearing. Thank you to everyone who posted, linked, mirrored or talked about the project.';
