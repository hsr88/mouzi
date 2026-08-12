/** Roadmap data. Keep statuses honest: 'shipped' only after users have it. */

export type RoadmapStatus = 'now' | 'next' | 'later' | 'shipped';

export interface RoadmapItem {
  title: string;
  description: string;
  status: RoadmapStatus;
  /** GitHub issue URL, when one exists. */
  issue?: string;
  /** Target release, when known. */
  target?: string;
}

const ISSUES = 'https://github.com/hsr88/mouzi/issues';

export const roadmap: RoadmapItem[] = [
  // Now
  {
    title: 'Folder picker for rule destinations',
    description:
      'A picker next to the destination field. Relative destinations are preserved when the folder is inside the watched folder; absolute paths work outside it.',
    status: 'now',
    issue: `${ISSUES}/52`,
  },
  {
    title: 'Tooltips and accessibility labels',
    description: 'Translated tooltips and accessible names for all icon-only buttons.',
    status: 'now',
    issue: `${ISSUES}/52`,
  },
  {
    title: 'Quick enable/disable on rule rows',
    description: 'Toggle any rule without opening the editor. Merged for v0.1.6 but not yet publicly released.',
    status: 'now',
    target: 'v0.1.6',
  },

  // Next
  {
    title: 'History search and filters',
    description: 'Filter history by file name, rule, type and date.',
    status: 'next',
    issue: `${ISSUES}/52`,
  },
  {
    title: 'AppImage icon fix',
    description:
      'The AppImage contains a broken absolute icon symlink from the CI runner path, which breaks AppManager installs.',
    status: 'next',
    issue: `${ISSUES}/53`,
  },
  {
    title: 'Signed Windows releases',
    description: 'Production code signing through SignPath Foundation. Certificate issuance is in progress.',
    status: 'next',
  },

  // Later
  {
    title: 'Recursive folder watching',
    description: 'Optional deep watching with protection against processing destination folders and move loops.',
    status: 'later',
    issue: `${ISSUES}/52`,
  },
  {
    title: 'Size and date rule conditions',
    description: 'Rules based on file size and modification date. Creation date needs a cross-platform reliability review first.',
    status: 'later',
    issue: `${ISSUES}/52`,
  },
  {
    title: 'Extensionless executable support',
    description: 'Detect and handle executables without file extensions.',
    status: 'later',
    issue: `${ISSUES}/49`,
  },
  {
    title: 'Automatic screenshot cleanup',
    description:
      'Optionally move screenshots older than a chosen number of days from system and custom screenshot folders to the Recycle Bin.',
    status: 'later',
  },

  // Shipped
  {
    title: 'Linux packages',
    description: 'AppImage, DEB and RPM builds for x86_64.',
    status: 'shipped',
    target: 'v0.1.5',
  },
  {
    title: 'Scheduled cleans',
    description: 'Automatic organization at up to four fixed times per day.',
    status: 'shipped',
    target: 'v0.1.5',
  },
];
