import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ai-newshub-psi.vercel.app';
  const posts = [
    '', // homepage
  ];
  
  // Add static dates - in production this would be dynamic
  const dates = [
    '20260804_00_morning', '20260804_01_evening',
    '20260805_00_morning', '20260805_01_evening',
    '20260806_00_morning', '20260806_01_evening',
    '20260807_00_morning', '20260807_01_evening',
    '20260808_00_morning',
    '20260809_00_morning',
    '20260810_00_morning', '20260810_01_evening',
    '20260811_00_morning', '20260811_01_evening',
    '20260812_00_morning', '20260812_01_evening',
    '20260813_00_morning', '20260813_01_evening',
    '20260814_00_morning', '20260814_01_evening',
    '20260815_00_morning',
    '20260816_00_morning',
    '20260817_00_morning', '20260817_01_evening',
    '20260818_00_morning',
    '20260819_00_morning',
  ];

  const postUrls = dates.map(slug => ({
    url: `${baseUrl}/posts/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...postUrls,
  ];
}