import { useState, useCallback } from 'react';

const KEY_PRIVACY = 'ciclo_privacy_seen';
const KEY_CALENDAR_TOUR = 'ciclo_calendar_tour_seen';

/**
 * Manages lightweight app-level meta: one-time flag states.
 * Backed by localStorage — works fully offline.
 *
 * Instantiate once at the app root and distribute via AppMetaContext
 * so all consumers share the same reactive state.
 */
export function useAppMeta() {
  const [privacySeen, setPrivacySeen] = useState<boolean>(
    () => !!localStorage.getItem(KEY_PRIVACY),
  );
  const [calendarTourSeen, setCalendarTourSeen] = useState<boolean>(
    () => !!localStorage.getItem(KEY_CALENDAR_TOUR),
  );

  const acknowledgePrivacy = useCallback(() => {
    localStorage.setItem(KEY_PRIVACY, '1');
    setPrivacySeen(true);
  }, []);

  const acknowledgeCalendarTour = useCallback(() => {
    localStorage.setItem(KEY_CALENDAR_TOUR, '1');
    setCalendarTourSeen(true);
  }, []);

  return {
    privacySeen,
    calendarTourSeen,
    acknowledgePrivacy,
    acknowledgeCalendarTour,
  };
}

export type AppMetaContext = ReturnType<typeof useAppMeta>;
