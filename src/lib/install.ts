// How to install the app where the browser doesn't let the page open its
// install dialog (only Chromium browsers do):
// - share: Safari and the other browsers on iPhone and iPad, from the Share
//   menu.
// - dock: Safari on a Mac, from the Share menu.
// - unsupported: Firefox on a computer, which can't install web apps.
// - menu: any other browser, from its own menu.
export type InstallHelp = 'share' | 'dock' | 'unsupported' | 'menu'

export function installHelpFor(
  userAgent: string,
  maxTouchPoints: number,
): InstallHelp {
  // An iPad reports itself as a Mac; touch tells them apart.
  const mac = userAgent.includes('Macintosh')
  if (/iPhone|iPad|iPod/.test(userAgent) || (mac && maxTouchPoints > 1)) {
    return 'share'
  }
  if (userAgent.includes('Firefox/') && !userAgent.includes('Android')) {
    return 'unsupported'
  }
  // Only Safari gives its version as "Version/"; Chrome and Edge on a Mac
  // also say "Safari/".
  if (mac && /Version\/[\d.]+ Safari\//.test(userAgent)) return 'dock'
  return 'menu'
}
