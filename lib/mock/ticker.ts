export const tickerItems = [
  { id: '1', textBn: 'প্রধানমন্ত্রীর আজ গুরুত্বপূর্ণ ঘোষণা', textEn: 'PM makes important announcement today' },
  { id: '2', textBn: 'বাংলাদেশ ক্রিকেট দল সিরিজ জিতেছে', textEn: 'Bangladesh cricket team wins series' },
  { id: '3', textBn: 'বাজারে স্বস্তি, কমেছে নিত্যপণ্যের দাম', textEn: 'Relief in the market as daily prices fall' },
  { id: '4', textBn: 'নদী ও প্রকৃতি রক্ষায় নতুন উদ্যোগ', textEn: 'New initiative to protect rivers and nature' },
  { id: '5', textBn: 'দেশের অর্থনীতিতে নতুন সম্ভাবনার দুয়ার খুলছে', textEn: 'New opportunities open for the economy' },
] as const

export type TickerItem = (typeof tickerItems)[number]
