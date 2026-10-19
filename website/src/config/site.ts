/**
 * Central site configuration for mouzi.cc.
 *
 * Every version number, download URL, metric and sponsor slot lives here.
 * Do not hardcode these values inside components or pages.
 */

export type Platform = 'windows' | 'linux';

export interface DownloadArtifact {
  /** Short label shown on buttons and cards. */
  label: string;
  /** File name of the artifact. */
  file: string;
  /** Absolute download URL. */
  url: string;
  /** Human-readable size, e.g. "3.7 MB". Use null when unknown. */
  size: string | null;
  /** CPU architecture. */
  arch: string;
  /** SHA-256 checksum. Use null until published. */
  sha256: string | null;
  /** Marks the recommended option per platform. */
  recommended?: boolean;
  /** Extra note, e.g. "for managed deployments". */
  note?: string;
}

export type SigningStatus = 'pending' | 'approved';

export interface SponsorPlacement {
  name: string;
  url: string;
  /** Path under /images, e.g. "/images/sponsor.svg". */
  logo: string;
}

const GITHUB_REPO = 'hsr88/mouzi';
const RELEASE_BASE = `https://github.com/${GITHUB_REPO}/releases/download`;

export const site = {
  name: 'Mouzi',
  url: 'https://mouzi.cc',
  title: 'Mouzi — automatic Downloads folder organizer for Windows and Linux',
  description:
    'Mouzi is a free, open-source Downloads folder organizer for Windows and Linux. It quietly sorts downloaded files with rules you control. Local-only, no accounts, no telemetry.',
  ogImage: '/images/og-image.png',

  /** Latest published release. Bump this with every public release. */
  version: '0.2.1',
  releaseDate: '2026-09-27',

  microsoftStore: 'https://apps.microsoft.com/detail/9N4GMH0PL58R',

  /**
   * Code signing status.
   * 'pending'  → "Code signing approval in progress with SignPath Foundation."
   * 'approved' → "Cryptographically signed releases."
   */
  signingStatus: 'pending' as SigningStatus,

  github: {
    repo: GITHUB_REPO,
    url: `https://github.com/${GITHUB_REPO}`,
    issues: `https://github.com/${GITHUB_REPO}/issues`,
    newIssue: `https://github.com/${GITHUB_REPO}/issues/new/choose`,
    discussions: `https://github.com/${GITHUB_REPO}/discussions`,
    releases: `https://github.com/${GITHUB_REPO}/releases`,
    security: `https://github.com/${GITHUB_REPO}/security/policy`,
    /** Fallback star count used when the GitHub API is unavailable at build time. */
    starsFallback: null as number | null,
  },

  funding: {
    githubSponsors: 'https://github.com/sponsors/hsr88',
    kofi: 'https://ko-fi.com/hsr',
    contactEmail: 'haser88@gmail.com',
  },

  maintainer: {
    name: 'Krystian Welcel',
    githubHandle: 'hsr88',
    github: 'https://github.com/hsr88',
    x: 'https://x.com/hsrvibe',
    reddit: 'https://reddit.com/r/Mouzi',
  },

  /**
   * Metrics that cannot be fetched automatically. Set display fields to null
   * to hide them. Never invent values you have not checked.
   */
  metrics: {
    totalDownloads: null as number | null,
    verifiedDownloads: {
      /** Safe display string shown on Impact, e.g. "3.5K+". */
      label: '3.5K+',
      note: 'Across GitHub, SourceForge and independent software directories.',
      sourceChecked: 'August 2026',
    } as { label: string; note: string; sourceChecked: string } | null,
    supportedLanguages: 11,
    supportedPlatforms: 2,
  },

  license: 'MIT',

  downloads: {
    windows: [
      {
        label: 'Installer (NSIS)',
        file: 'Mouzi_0.2.1_x64-setup.exe',
        url: `${RELEASE_BASE}/v0.2.1/Mouzi_0.2.1_x64-setup.exe`,
        size: '4.8 MB',
        arch: 'x64',
        sha256: 'd9c1190ad66fcd5d1a2994d9a9969f9c1aeafa5cad48f10d5edcc2f5502461fb',
        recommended: true,
        note: 'Recommended for most users.',
      },
      {
        label: 'MSI package',
        file: 'Mouzi_0.2.1_x64_en-US.msi',
        url: `${RELEASE_BASE}/v0.2.1/Mouzi_0.2.1_x64_en-US.msi`,
        size: '6.8 MB',
        arch: 'x64',
        sha256: '9234d12b468481fa2f8556732ca7996a8d03b0a8c1363d8be6854b9068e3ee88',
        note: 'For managed and enterprise deployments.',
      },
      {
        label: 'Portable',
        file: 'Mouzi_0.2.1_x64-portable.exe',
        url: `${RELEASE_BASE}/v0.2.1/Mouzi_0.2.1_x64-portable.exe`,
        size: '18.5 MB',
        arch: 'x64',
        sha256: 'a37214a2c210fbcb96b0beed60243dfb46abc9f9859bbc451e567191b3ba2e58',
        note: 'No installation. Run from any folder or USB drive.',
      },
    ] satisfies DownloadArtifact[],
    linux: [
      {
        label: 'AppImage',
        file: 'Mouzi_0.2.1_amd64.AppImage',
        url: `${RELEASE_BASE}/v0.2.1/Mouzi_0.2.1_amd64.AppImage`,
        size: '86.6 MB',
        arch: 'x86_64',
        sha256: '85a9e63c1c35c37269b77044613dc9e78e12fa62f0c1c94f7201e12407ad72d7',
        recommended: true,
        note: 'Works on most distributions without installation.',
      },
      {
        label: 'DEB package',
        file: 'Mouzi_0.2.1_amd64.deb',
        url: `${RELEASE_BASE}/v0.2.1/Mouzi_0.2.1_amd64.deb`,
        size: '8.8 MB',
        arch: 'amd64',
        sha256: 'ae47db65e7b10731a5bc0ebd97267589d131d939caa088a5c754a33838fa9394',
        note: 'Debian, Ubuntu, Mint and derivatives.',
      },
      {
        label: 'RPM package',
        file: 'Mouzi-0.2.1-1.x86_64.rpm',
        url: `${RELEASE_BASE}/v0.2.1/Mouzi-0.2.1-1.x86_64.rpm`,
        size: '8.9 MB',
        arch: 'x86_64',
        sha256: '94d51dd5fb1b68907b921d517784414b475d6a455599034ec0bbc2825e15750e',
        note: 'Fedora, openSUSE, RHEL and derivatives.',
      },
    ] satisfies DownloadArtifact[],
  },

  /**
   * Optional sponsor placement shown near the navigation.
   * Set to a SponsorPlacement object when a sponsor is active.
   */
  activeSponsor: null as SponsorPlacement | null,

  sponsorTiers: [
    {
      id: 'technical-partner',
      name: 'Technical Partner',
      price: null as string | null,
      description:
        'Infrastructure, code signing, software or services provided to the project in kind.',
    },
    {
      id: 'founding-sponsor',
      name: 'Founding Sponsor',
      price: '$49/month',
      description: 'Logo and link on the sponsors page and in the GitHub README.',
    },
    {
      id: 'main-sponsor',
      name: 'Main Sponsor',
      price: '$99/month',
      description:
        'One exclusive header placement, prominent sponsors-page placement and a short product description.',
    },
  ],
} as const;

export function signingMessage(): string {
  return site.signingStatus === 'approved'
    ? 'Cryptographically signed releases.'
    : 'Direct GitHub downloads: code signing approval in progress with SignPath Foundation.';
}
