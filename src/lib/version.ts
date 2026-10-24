// Set when CI builds the image (.github/workflows/ci.yml, Dockerfile):
// "1.2.3" for a release, "edge" for a build from main, and the commit it
// was built from. Other builds have neither.
declare global {
  interface ImportMetaEnv {
    readonly VITE_APP_VERSION?: string
    readonly VITE_APP_COMMIT?: string
  }
}

export const appVersion = import.meta.env.VITE_APP_VERSION || null
export const appCommit = import.meta.env.VITE_APP_COMMIT || null
