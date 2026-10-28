// Where playwright.config.ts starts the apps the tests run against.

export const port = 3100

// The same build with an AI model: fake-ai.ts, on its own port.
export const aiPort = 3101
export const aiApp = `http://localhost:${aiPort}`
export const aiModelPort = 3102

// Pages to import, on the one address the e2e build's imports reach.
export const testSitePort = 3103
export const testSite = `http://127.0.0.1:${testSitePort}`
