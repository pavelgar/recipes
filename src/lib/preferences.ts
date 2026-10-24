// Preferences set per device (units, theme) live in cookies the browser
// writes, which src/start.ts renews. This is how long each one lasts: the
// longest browsers keep a cookie.
export const PREFERENCE_MAX_AGE = 60 * 60 * 24 * 400
