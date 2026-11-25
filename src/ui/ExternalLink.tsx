import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { Language } from '@/i18n';
import { colors } from '@/theme';

import { Text } from './Text';

/** The web app's site, which also serves the static pages in public/ (privacy policy, terms, data deletion). */
const SITE_HOST = 'globik-app.netlify.app';

/** A static page on the site; the pages hold both languages, and Polish is the `#pl` section. */
export function sitePage(page: 'privacy' | 'terms' | 'delete-account', language: Language): `https://${string}` {
  return `https://${SITE_HOST}/${page}/${language === 'pl' ? '#pl' : ''}`;
}

/**
 * Opens a page outside the app: the system browser on Android and iOS, a new tab on the web. On the web it is a real
 * `<a href>`, so crawlers and Google's OAuth reviewers see the links (decision 023).
 */
export function ExternalLink({
  url,
  title,
  color = colors.white,
}: {
  url: `https://${string}`;
  title: string;
  color?: string;
}) {
  return (
    <Link href={url} asChild>
      <Text variant="caption" color={color} style={styles.link}>
        {title}
      </Text>
    </Link>
  );
}

const styles = StyleSheet.create({ link: { textDecorationLine: 'underline' } });
