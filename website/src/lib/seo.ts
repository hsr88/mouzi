import { site } from '../config/site';

export function softwareApplicationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: site.name,
    alternateName: ['Mouzi Downloads organizer', 'Mouzi file organizer'],
    description: site.description,
    operatingSystem: 'Windows 10, Windows 11, Linux',
    applicationCategory: 'UtilitiesApplication',
    applicationSubCategory: 'File organizer',
    softwareVersion: site.version,
    license: 'https://opensource.org/licenses/MIT',
    url: site.url,
    downloadUrl: `${site.url}/download`,
    image: `${site.url}${site.ogImage}`,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: personLd(),
    featureList: [
      'Automatic Downloads folder organization',
      'Custom file organization rules',
      'Local-only processing with no telemetry',
      'Windows and Linux support',
      'History with one-click undo',
    ],
  };
}

export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: 'en',
    publisher: personLd(),
  };
}

export function personLd() {
  return {
    '@type': 'Person',
    name: site.maintainer.name,
    url: site.maintainer.github,
  };
}

export function blogPostingLd(post: {
  title: string;
  description: string;
  pubDate: Date;
  updatedDate?: Date;
  slug: string;
  cover?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.pubDate.toISOString(),
    ...(post.updatedDate ? { dateModified: post.updatedDate.toISOString() } : {}),
    url: `${site.url}/blog/${post.slug}`,
    ...(post.cover ? { image: `${site.url}${post.cover}` } : {}),
    author: { ...personLd(), '@context': undefined },
    publisher: personLd(),
  };
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${site.url}${item.url}`,
    })),
  };
}
