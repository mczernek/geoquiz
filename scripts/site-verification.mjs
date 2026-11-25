#!/usr/bin/env node
// Runs after `expo export -p web`: adds Google Search Console's ownership meta tag to dist/index.html when
// EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION is set (decision 023). The single-page export's index.html template
// (public/index.html) can't read environment variables, so the tag goes in here, before build-sw.mjs hashes the files.
import { readFileSync, writeFileSync } from 'node:fs';

const token = process.env.EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
if (!token) process.exit(0);
// Search Console's tag is <meta name="google-site-verification" content="…" />; only the content value belongs here.
if (!/^[\w-]+$/.test(token)) {
  console.error('EXPO_PUBLIC_GOOGLE_SITE_VERIFICATION must be only the content="…" value of the Search Console tag');
  process.exit(1);
}

const file = new URL('../dist/index.html', import.meta.url);
const html = readFileSync(file, 'utf8');
if (!html.includes('</head>')) {
  console.error('dist/index.html has no </head>');
  process.exit(1);
}
writeFileSync(file, html.replace('</head>', `<meta name="google-site-verification" content="${token}" />\n</head>`));
console.log('index.html: google-site-verification tag added');
