/**
 * VaxTrace Nigeria - next-i18next Configuration
 * 
 * Internationalization setup for multi-language support.
 * Supports English, Hausa, Yoruba, and Igbo.
 */

const path = require('path');

module.exports = {
  i18n: {
    // These are all the languages you want to support in your app
    locales: ['en', 'ha', 'yo', 'ig'],
    
    // This is the default locale you want to be used when visiting
    // a non-locale prefixed URL e.g. `/about`
    defaultLocale: 'en',
    
    // This is a list of locale domains and the default locale of that domain
    localeDetection: true,
  },
  
  // The path where translations are stored
  localePath: path.resolve('./public/locales'),
  
  // Reload on development
  reloadOnPrerender: process.env.NODE_ENV === 'development',
  
  // React options
  react: {
    useSuspense: false,
  },
};
