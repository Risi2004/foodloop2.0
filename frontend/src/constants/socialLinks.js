/**
 * Official FoodLoop social profile URLs.
 * Override in .env (see .env.example) without code changes.
 */
export const FOOTER_SOCIAL_LINKS = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    href: import.meta.env.VITE_SOCIAL_WHATSAPP_URL || 'https://www.whatsapp.com/',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    href: import.meta.env.VITE_SOCIAL_FACEBOOK_URL || 'https://www.facebook.com/',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    href: import.meta.env.VITE_SOCIAL_INSTAGRAM_URL || 'https://www.instagram.com/',
  },
  {
    id: 'twitter',
    label: 'X',
    href: import.meta.env.VITE_SOCIAL_TWITTER_URL || 'https://x.com/',
  },
];
