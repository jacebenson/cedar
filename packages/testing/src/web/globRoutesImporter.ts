/// <reference types="vite/client" />

// Because this file uses the vite-specific import.meta.glob feature, we can't
// build this with esbuild. We also can't build it with vite when building the
// framework, because at that time we have no idea what user project this will
// be used in or what routes it will have. At least we can't evaluate the glob
// import at framework build time. So I copy this file as-is into the build
// output, and then tell vite to process this file when building the user's
// project. I do that by including @cedarjs/testing in `noExternal` in the
// default vite config (see lib/getMergedConfig.ts in the vite package)

// This finds the user's Routes file in web/src/Routes.{tsx,jsx}
const defaultExports = import.meta.glob('/Routes.{tsx,jsx}', {
  import: 'default',
  eager: true,
})
const routesFileName = Object.keys(defaultExports)[0]

if (!routesFileName) {
  throw new Error('@cedarjs/testing: No routes found')
}

const routesFunction = defaultExports[routesFileName]

if (typeof routesFunction !== 'function') {
  throw new Error(
    '@cedarjs/testing: Routes file does not export a React component',
  )
}

/**
 * All the routes the user has defined
 *
 * We render this in the `<MockProviders>` component to populate the `routes`
 * import from `@cedarjs/router` to make sure code like
 * `<Link to={routes.home()}>Home</Link>` works in tests
 *
 * The final piece to this puzzle is to realize that the user's Routes file
 * imports `@cedarjs/router`, which we replace to import from '@cedarjs/testing'
 * instead using a vite plugin that we only run for vitest and storybook
 */
export const UserRoutes = routesFunction as React.FC
