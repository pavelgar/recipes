import { describe, expect, it } from 'vitest'
import { installHelpFor } from '@/core/install'

const userAgents = {
  iPhoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
  iPhoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.156 Mobile/15E148 Safari/604.1',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15',
  macChrome:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  macFirefox:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0',
  windowsFirefox:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:141.0) Gecko/20100101 Firefox/141.0',
  androidFirefox:
    'Mozilla/5.0 (Android 15; Mobile; rv:141.0) Gecko/141.0 Firefox/141.0',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36',
}

describe('installHelpFor', () => {
  it('sends iPhones and iPads to the Share menu', () => {
    expect(installHelpFor(userAgents.iPhoneSafari, 5)).toBe('share')
    expect(installHelpFor(userAgents.iPhoneChrome, 5)).toBe('share')
    // An iPad asks for the Mac version of sites.
    expect(installHelpFor(userAgents.macSafari, 5)).toBe('share')
  })

  it('sends Safari on a Mac to Add to Dock', () => {
    expect(installHelpFor(userAgents.macSafari, 0)).toBe('dock')
  })

  it('tells Firefox on a computer that it cannot install', () => {
    expect(installHelpFor(userAgents.macFirefox, 0)).toBe('unsupported')
    expect(installHelpFor(userAgents.windowsFirefox, 0)).toBe('unsupported')
  })

  it('sends other browsers to their own menu', () => {
    expect(installHelpFor(userAgents.macChrome, 0)).toBe('menu')
    expect(installHelpFor(userAgents.androidChrome, 5)).toBe('menu')
    expect(installHelpFor(userAgents.androidFirefox, 5)).toBe('menu')
  })
})
