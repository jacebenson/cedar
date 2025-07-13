// NOTE: This module should not contain any nodejs functionality, because it's
// used by Storybook in the browser.

import React from 'react'

// @ts-expect-error - This is a virtual module, it doesn't have types
// The virtual module imports the user's Routes from `./web/src/Routes.{tsx,jsx}`,
// we pass the `children` from the user's Routes to `./MockRouter.Router`
// so that we can populate the `routes object` in Storybook and tests.
import UserRoutes from 'cedarjs:/Routes.tsx'

import { LocationProvider } from '@cedarjs/router'
import { RedwoodProvider } from '@cedarjs/web'
import { RedwoodApolloProvider } from '@cedarjs/web/apollo'

import { useAuth } from './mockAuth.js'
import { MockParamsProvider } from './MockParamsProvider.js'

// TODO(pc): see if there are props we want to allow to be passed into our mock
// provider (e.g. AuthProviderProps)
export const MockProviders: React.FunctionComponent<{
  children: React.ReactNode
}> = ({ children }) => {
  return (
    <RedwoodProvider titleTemplate="%PageTitle | %AppTitle">
      <RedwoodApolloProvider useAuth={useAuth}>
        <UserRoutes />
        <LocationProvider>
          <MockParamsProvider>{children}</MockParamsProvider>
        </LocationProvider>
      </RedwoodApolloProvider>
    </RedwoodProvider>
  )
}
