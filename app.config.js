// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "QuackLogs",
    slug: "your-app-slug",
    version: "1.0.0",
    scheme: "yourappscheme",  // required for deep linking
    extra: {
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      googleWebId: process.env.EXPO_GOOGLE_CLIENT_ID,
      googleIOSId: process.env.EXPO_GOOGLE_IOS_ID,

    },
    newArchEnabled: true, // optional
  },
};
