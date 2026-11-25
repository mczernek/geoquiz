import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Country } from '@/domain/countries';

import { en, type Strings } from './en';
import { pl } from './pl';

/** UI languages (docs/specs/i18n.md). Answers are accepted in every language, whatever the UI shows. */
export const LANGUAGES = ['en', 'pl'] as const;
export type Language = (typeof LANGUAGES)[number];
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', pl: 'Polski' };

const STRINGS: Record<Language, Strings> = { en, pl };

/** The device's preferred language when we have it, else English. */
export function deviceLanguage(): Language {
  const tags =
    Platform.OS === 'web' && typeof navigator !== 'undefined'
      ? [...(navigator.languages ?? []), navigator.language]
      : [Intl.DateTimeFormat().resolvedOptions().locale];
  for (const tag of tags) {
    const lang = tag?.toLowerCase().split('-')[0];
    if (LANGUAGES.includes(lang as Language)) return lang as Language;
  }
  return 'en';
}

interface LanguageState {
  /** Chosen in the app; null follows the device. Kept per device, not synced (decision 014). */
  chosen: Language | null;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      chosen: null,
      setLanguage: (chosen) => set({ chosen }),
    }),
    { name: 'geoquiz-language', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

const device = deviceLanguage();

export function useLanguage(): Language {
  return useLanguageStore((s) => s.chosen) ?? device;
}

/** Text outside React (errors, dialogs) in the current language. */
export function currentStrings(): Strings {
  return STRINGS[useLanguageStore.getState().chosen ?? device];
}

export function countryName(country: Country, language: Language): string {
  return language === 'pl' ? country.namePl : country.name;
}

export function capitalsOf(country: Country, language: Language): string[] {
  return language === 'pl' ? country.capitalsPl : country.capitals;
}

/** Everything a screen needs to show text: strings and localized country names. */
export function useI18n() {
  const language = useLanguage();
  return {
    language,
    t: STRINGS[language],
    name: (country: Country) => countryName(country, language),
    capitals: (country: Country) => capitalsOf(country, language),
  };
}
