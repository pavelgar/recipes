import { ParaglideMessage } from '@inlang/paraglide-js-react'
import { createFileRoute } from '@tanstack/react-router'
import {
  CircleAlertIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  ShareIcon,
  SquarePlusIcon,
} from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui/button'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { setDisplaySystem, useDisplaySystem } from '@/hooks/use-display-system'
import { setTheme, useTheme } from '@/hooks/use-theme'
import { isInstalledApp, useInstallPrompt } from '@/hooks/use-install-prompt'
import { installHelpFor } from '@/lib/install'
import { appCommit, appVersion } from '@/lib/version'
import { m } from '@/paraglide/messages'
import { getLocale, locales, setLocale } from '@/paraglide/runtime'
import type { InstallHelp } from '@/lib/install'
import type { LucideIcon } from 'lucide-react'
import type { DisplaySystem } from '@/lib/quantities'
import type { Theme } from '@/lib/theme'
import type { Locale } from '@/paraglide/runtime'

export const Route = createFileRoute('/settings')({
  component: Settings,
})

const SOURCE_CODE_URL = 'https://github.com/pavelgar/recipes'
// As in package.json.
const LICENCE = 'AGPL-3.0-only'

// Each language by its own name, so it can be found from any other.
const languageNames: Record<Locale, string> = {
  en: 'English',
  fi: 'Suomi',
}

// Fits the longest option in either language ("Yhdysvaltalaiset"), so the
// controls line up and don't resize with their value. Each dropdown's popup
// takes the width of its trigger.
const controlWidth = 'min-w-40'

// A button's name in a step, with its icon after it on the same line. The
// icon looks the same whatever language the device is in, unlike the name.
function withIcon(Icon: LucideIcon) {
  return function ButtonName({ children }: { children?: React.ReactNode }) {
    return (
      <span className="whitespace-nowrap">
        {children}
        <Icon className="ml-1 inline-block size-[1em] align-[-0.125em]" />
      </span>
    )
  }
}

const shareButton = withIcon(ShareIcon)
const addButton = withIcon(SquarePlusIcon)
const menuButton = withIcon(EllipsisVerticalIcon)

// Installing from the browser's own menu, step by step.
const installSteps: Record<
  Exclude<InstallHelp, 'unsupported'>,
  () => ReadonlyArray<React.ReactNode>
> = {
  share: () => [
    <ParaglideMessage
      key="tap"
      message={m.settings_install_share_tap}
      markup={{ share: shareButton }}
    />,
    <ParaglideMessage
      key="add"
      message={m.settings_install_share_add}
      markup={{ add: addButton }}
    />,
  ],
  dock: () => [
    <ParaglideMessage
      key="share"
      message={m.settings_install_dock_share}
      markup={{ share: shareButton }}
    />,
    m.settings_install_dock_add(),
  ],
  menu: () => [
    <ParaglideMessage
      key="open"
      message={m.settings_install_menu_open}
      markup={{ menu: menuButton }}
    />,
    m.settings_install_menu_add(),
  ],
}

function Settings() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-10 px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6 md:px-6 md:pt-8">
      <h1 className="font-heading text-2xl font-semibold">
        {m.settings_title()}
      </h1>
      <SettingsSection title={m.settings_device_title()}>
        {/* ItemGroup is a list, so each of these rows is a list item. */}
        <ItemGroup>
          <InstallSetting />
          <ThemeSetting />
          <LanguageSetting />
          <UnitsSetting />
        </ItemGroup>
      </SettingsSection>
      <SettingsSection title={m.settings_about_title()}>
        <SourceCode />
      </SettingsSection>
    </div>
  )
}

function SettingsSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} className="font-heading text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  )
}

function InstallSetting() {
  const install = useInstallPrompt()
  let description: React.ReactNode = null
  let steps: ReadonlyArray<React.ReactNode> = []
  let action: React.ReactNode = null
  if (isInstalledApp()) {
    action = (
      <Button variant="outline" className={controlWidth} disabled>
        {m.settings_installed()}
      </Button>
    )
  } else if (!window.isSecureContext) {
    // Browsers allow installing and offline use only in a secure context:
    // over HTTPS, or on localhost.
    description = (
      <>
        <CircleAlertIcon className="mr-1 inline-block size-[1em] align-[-0.125em] text-warning" />
        {m.settings_needs_https()}
      </>
    )
    action = (
      <Button variant="outline" className={controlWidth} disabled>
        {m.settings_install_button()}
      </Button>
    )
  } else if (install) {
    action = (
      <Button variant="outline" className={controlWidth} onClick={install}>
        {m.settings_install_button()}
      </Button>
    )
  } else {
    const help = installHelpFor(navigator.userAgent, navigator.maxTouchPoints)
    if (help === 'unsupported') {
      description = m.settings_install_unsupported()
    } else {
      steps = installSteps[help]()
    }
  }
  return (
    <Item variant="outline" role="listitem">
      <ItemContent>
        <ItemTitle>{m.settings_install()}</ItemTitle>
        {/* Shown whole: the item description stops at two lines, which cuts
            the longer messages short next to a button on a phone. */}
        {description && (
          <ItemDescription className="line-clamp-none">
            {description}
          </ItemDescription>
        )}
        {steps.length > 0 && <InstallSteps steps={steps} />}
      </ItemContent>
      {action && <ItemActions>{action}</ItemActions>}
    </Item>
  )
}

// Set like the item description, numbered.
function InstallSteps({ steps }: { steps: ReadonlyArray<React.ReactNode> }) {
  return (
    <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
      {steps.map((step, index) => (
        <li key={index} className="flex gap-2">
          <span className="tabular-nums">{index + 1}.</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  )
}

// A dropdown, so the page stays short however many languages there are.
function LanguageSetting() {
  const id = useId()
  return (
    <Item variant="outline" role="listitem">
      <ItemContent>
        <ItemTitle id={id}>{m.settings_language()}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Select
          items={languageNames}
          value={getLocale()}
          // Reloads the page, which the server renders in the new language.
          onValueChange={(locale) => locale && setLocale(locale)}
        >
          <SelectTrigger aria-labelledby={id} className={controlWidth}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {locales.map((locale) => (
              <SelectItem key={locale} value={locale} lang={locale}>
                {languageNames[locale]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ItemActions>
    </Item>
  )
}

function UnitsSetting() {
  const id = useId()
  const system = useDisplaySystem()
  const names: Record<DisplaySystem, string> = {
    metric: m.settings_units_metric(),
    us: m.settings_units_us(),
  }
  const examples: Record<DisplaySystem, string> = {
    metric: m.settings_units_metric_examples(),
    us: m.settings_units_us_examples(),
  }
  return (
    <Item variant="outline" role="listitem">
      <ItemContent>
        <ItemTitle id={id}>{m.settings_units()}</ItemTitle>
        <ItemDescription>{examples[system]}</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Select
          items={names}
          value={system}
          onValueChange={(value) => value && setDisplaySystem(value)}
        >
          <SelectTrigger aria-labelledby={id} className={controlWidth}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['metric', 'us'] as const).map((value) => (
              <SelectItem key={value} value={value}>
                {names[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ItemActions>
    </Item>
  )
}

function ThemeSetting() {
  const id = useId()
  const names: Record<Theme, string> = {
    system: m.settings_theme_system(),
    light: m.settings_theme_light(),
    dark: m.settings_theme_dark(),
  }
  return (
    <Item variant="outline" role="listitem">
      <ItemContent>
        <ItemTitle id={id}>{m.settings_theme()}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Select
          items={names}
          value={useTheme()}
          onValueChange={(value) => value && setTheme(value)}
        >
          <SelectTrigger aria-labelledby={id} className={controlWidth}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['system', 'light', 'dark'] as const).map((value) => (
              <SelectItem key={value} value={value}>
                {names[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ItemActions>
    </Item>
  )
}

// The version that's running, "1.2.3" or "edge" with the commit it was
// built from, linked to its source code. Builds outside CI have neither,
// and link to the repository as it is now.
function SourceCode() {
  const version = appVersion
    ? m.settings_version({ version: appVersion })
    : m.settings_version_development()
  return (
    <Item
      variant="outline"
      render={
        <a
          href={
            appCommit ? `${SOURCE_CODE_URL}/tree/${appCommit}` : SOURCE_CODE_URL
          }
          target="_blank"
          rel="noreferrer"
        />
      }
    >
      <ItemContent>
        <ItemTitle>
          {appCommit ? `${version} · ${appCommit.slice(0, 7)}` : version}
        </ItemTitle>
        <ItemDescription>
          {m.settings_source_code({
            address: SOURCE_CODE_URL.replace('https://', ''),
          })}
        </ItemDescription>
        <ItemDescription>
          {m.settings_licence({ licence: LICENCE })}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <ExternalLinkIcon className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  )
}
