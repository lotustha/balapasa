import type { Metadata } from 'next'
import {
  Boxes,
  KeyRound,
  Layers,
  PackageCheck,
  Smartphone,
  Bell,
} from 'lucide-react'
import CodeBlock from '@/app/docs/components/CodeBlock'
import EndpointCard from '@/app/docs/components/EndpointCard'
import ParamTable from '@/app/docs/components/ParamTable'

export const metadata: Metadata = {
  title: 'React Native — Balapasa Platform API',
  description:
    'A complete, copy-pasteable React Native integration guide for the Balapasa platform API: a typed fetch client with a bearer-token header, JWT persistence with expo-secure-store / AsyncStorage, sample auth/products/orders calls, and full Firebase Cloud Messaging setup for both Expo and bare workflows.',
}

const installExpoCode = `# Expo (managed) — secure storage + Firebase messaging.
# @react-native-firebase requires a development build (not Expo Go),
# so add the config plugins and run a prebuild + dev-client build.
npx expo install expo-secure-store
npx expo install @react-native-firebase/app @react-native-firebase/messaging

# Generate native projects so the Firebase plugins are applied:
npx expo prebuild
# Then build a dev client (device or simulator):
npx expo run:android   # or: npx expo run:ios`

const installBareCode = `# Bare React Native CLI — secure storage + Firebase messaging.
npm install @react-native-async-storage/async-storage
npm install @react-native-firebase/app @react-native-firebase/messaging

# iOS: install the native pods.
cd ios && pod install && cd ..`

const configCode = `// src/api/config.ts

export const API_CONFIG = {
  // Switch to the sandbox host while integrating, then flip to production.
  baseUrl: 'https://api.balapasa.com/v1',
  // baseUrl: 'https://sandbox.balapasa.com/v1',

  // Key under which the JWT is persisted between launches.
  tokenKey: 'balapasa_auth_token',
} as const`

const tokenStoreExpoCode = `// src/api/tokenStore.ts  (Expo — expo-secure-store)
import * as SecureStore from 'expo-secure-store'
import { API_CONFIG } from './config'

/**
 * Persists the JWT in the iOS Keychain / Android Keystore-backed store
 * rather than plain AsyncStorage, so it survives relaunches securely.
 */
export const tokenStore = {
  read: () => SecureStore.getItemAsync(API_CONFIG.tokenKey),
  save: (token: string) =>
    SecureStore.setItemAsync(API_CONFIG.tokenKey, token),
  clear: () => SecureStore.deleteItemAsync(API_CONFIG.tokenKey),
}`

const tokenStoreBareCode = `// src/api/tokenStore.ts  (bare RN — AsyncStorage alternative)
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_CONFIG } from './config'

/**
 * Drop-in alternative with the SAME shape as the expo-secure-store version.
 * AsyncStorage is NOT encrypted — prefer react-native-keychain or
 * expo-secure-store for production token storage.
 */
export const tokenStore = {
  read: () => AsyncStorage.getItem(API_CONFIG.tokenKey),
  save: (token: string) => AsyncStorage.setItem(API_CONFIG.tokenKey, token),
  clear: () => AsyncStorage.removeItem(API_CONFIG.tokenKey),
}`

const clientCode = `// src/api/client.ts
import { API_CONFIG } from './config'
import { tokenStore } from './tokenStore'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

/**
 * A thin fetch wrapper that reads the stored JWT and attaches it as
 * \`Authorization: Bearer <jwt>\` on every request. A 401 clears the token
 * so the app can route the user back to the login screen.
 */
async function request<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  }

  if (auth) {
    const token = await tokenStore.read()
    if (token) finalHeaders.Authorization = \`Bearer \${token}\`
  }

  const res = await fetch(\`\${API_CONFIG.baseUrl}\${path}\`, {
    ...rest,
    headers: finalHeaders,
  })

  if (res.status === 401) {
    await tokenStore.clear()
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)

  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? \`Request failed (\${res.status})\`
    throw new ApiError(res.status, message)
  }

  return data as T
}

export const apiClient = {
  get: <T>(path: string, auth = true) => request<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body), auth }),
  del: <T>(path: string, body: unknown, auth = true) =>
    request<T>(path, { method: 'DELETE', body: JSON.stringify(body), auth }),
}`

const typesCode = `// src/api/types.ts

/** Mirrors the \`user\` object returned by POST /api/mobile/auth. */
export type AuthUser = {
  id: string
  email: string
  role: 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN'
  name: string | null
  phone: string | null
}

export type AuthResponse = { token: string; user: AuthUser }

/** A single product from GET /api/products (\`products[]\`). */
export type Product = {
  id: string
  name: string
  slug: string
  price: number
  salePrice: number | null
  images: string[]
}

export type ProductsResponse = {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

/** A line item sent in the POST /api/orders request body. */
export type CartLine = {
  id: string
  name: string
  price: number
  image: string
  quantity: number
}

/** COD response from POST /api/orders. */
export type OrderResponse = {
  orderId: string
  orderCode: string | null
  status: string
  magicLinkToken: string | null
}`

const serviceCode = `// src/api/service.ts
import { apiClient } from './client'
import { tokenStore } from './tokenStore'
import type {
  AuthResponse,
  AuthUser,
  CartLine,
  OrderResponse,
  Product,
  ProductsResponse,
} from './types'

/**
 * POST /api/mobile/auth — returns { token, user }. The token is persisted
 * so the client header from step 3 attaches it to every later request.
 */
export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const body = await apiClient.post<AuthResponse>(
    '/api/mobile/auth',
    { email, password },
    false, // login itself needs no bearer token
  )
  await tokenStore.save(body.token)
  return body.user
}

export async function logout(): Promise<void> {
  await tokenStore.clear()
}

/** GET /api/products — returns { products, total, page, totalPages }. */
export async function fetchProducts(opts: {
  search?: string
  category?: string
  page?: number
  limit?: number
} = {}): Promise<Product[]> {
  const params = new URLSearchParams()
  if (opts.search) params.set('search', opts.search)
  if (opts.category) params.set('category', opts.category)
  params.set('page', String(opts.page ?? 1))
  params.set('limit', String(opts.limit ?? 24))

  const body = await apiClient.get<ProductsResponse>(
    \`/api/products?\${params.toString()}\`,
    false, // listing is public
  )
  return body.products
}

/**
 * POST /api/orders — creates an order. For Cash on Delivery the API responds
 * 201 with { orderId, orderCode, status, magicLinkToken }. The server
 * recomputes totals from the cart, so never send a client-trusted total.
 */
export async function createOrder(input: {
  items: CartLine[]
  subtotal: number
  deliveryCharge: number
  name: string
  phone: string
  address: string
  city: string
  paymentMethod?: string
  shippingOption?: string
}): Promise<OrderResponse> {
  return apiClient.post<OrderResponse>('/api/orders', {
    paymentMethod: 'COD',
    shippingOption: 'standard',
    ...input,
  })
}`

const usageCode = `// Logging in from a screen.
import { login } from '../api/service'
import { ApiError } from '../api/client'

async function handleSignIn(email: string, password: string) {
  try {
    const user = await login(email, password)
    console.log(\`Logged in as \${user.name ?? user.email} (\${user.role})\`)
  } catch (e) {
    // 400 -> missing fields, 401 -> invalid credentials.
    const message = e instanceof ApiError ? e.message : 'Login failed'
    console.warn('Auth error:', message)
  }
}`

const fcmConfigExpoCode = `// app.json / app.config.js — Expo config plugins + native config files.
// Place the downloaded Firebase config files in your project root first:
//   ./google-services.json          (Android)
//   ./GoogleService-Info.plist      (iOS)
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}

// Re-run prebuild so the plugins wire the native projects:
//   npx expo prebuild --clean`

const fcmConfigBareCode = `# Bare RN — drop the Firebase config files into the native projects:
android/app/google-services.json
ios/<YourApp>/GoogleService-Info.plist

# Android: apply the Google Services Gradle plugin.
# android/build.gradle  (buildscript > dependencies)
classpath 'com.google.gms:google-services:4.4.2'

# android/app/build.gradle  (top of file)
apply plugin: 'com.google.gms.google-services'

# iOS / APNs: in the Apple Developer portal create an APNs Authentication
# Key (.p8) and upload it under Firebase Console -> Project Settings ->
# Cloud Messaging. Enable Push Notifications + Background Modes
# (Remote notifications) capabilities for the app target in Xcode.`

const fcmBackgroundCode = `// index.js  (app entry, BEFORE AppRegistry.registerComponent)
import messaging from '@react-native-firebase/messaging'
import { AppRegistry } from 'react-native'
import App from './App'
import { name as appName } from './app.json'

// Runs in a headless JS context when a data/notification message arrives
// while the app is in the background or terminated. Register it at the very
// top of the entry file so it is set before the app renders.
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background push:', remoteMessage.messageId)
})

AppRegistry.registerComponent(appName, () => App)`

const fcmRegisterCode = `// src/push/pushService.ts
import { Platform } from 'react-native'
import messaging from '@react-native-firebase/messaging'
import { apiClient } from '../api/client'

/**
 * Ask for permission, read the FCM device token, and register it with the
 * backend. Call this AFTER the user has logged in so the token is tied to
 * their account (the client attaches the bearer JWT automatically).
 */
export async function registerDevice(): Promise<() => void> {
  const status = await messaging().requestPermission()
  const granted =
    status === messaging.AuthorizationStatus.AUTHORIZED ||
    status === messaging.AuthorizationStatus.PROVISIONAL
  if (!granted) return () => {}

  // On iOS, register for remote messages so APNs is wired before getToken().
  if (Platform.OS === 'ios') {
    await messaging().registerDeviceForRemoteMessages()
  }

  const token = await messaging().getToken()
  if (token) await sendToken(token)

  // Re-register whenever FCM rotates the token. Returns the unsubscribe fn.
  return messaging().onTokenRefresh(sendToken)
}

/** POST /api/mobile/push { token, platform } -> { registered: true } */
async function sendToken(token: string): Promise<void> {
  await apiClient.post('/api/mobile/push', {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  })
}

/**
 * DELETE /api/mobile/push { token } -> { removed: true }
 * Call on logout so a shared device stops receiving the user's pushes.
 */
export async function unregisterDevice(): Promise<void> {
  const token = await messaging().getToken()
  if (token) await apiClient.del('/api/mobile/push', { token })
}`

const fcmHandlersCode = `// src/push/usePushRouter.ts
import { useEffect } from 'react'
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging'
import { useNavigation } from '@react-navigation/native'

type PushData = { screen?: string; orderId?: string }

/**
 * Wires up the three delivery states and routes on tap using the push
 * \`data\` map. Order pushes carry { screen: "orders", orderId: "<id>" }.
 * Call this hook once from a component mounted under the navigator.
 */
export function usePushRouter() {
  const navigation = useNavigation<{ navigate: (s: string, p?: object) => void }>()

  useEffect(() => {
    const route = (msg: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (!msg) return
      const data = (msg.data ?? {}) as PushData
      if (data.screen === 'orders') {
        navigation.navigate('Orders', { orderId: data.orderId })
      } else {
        navigation.navigate('Home')
      }
    }

    // 1. Foreground — the OS does NOT show a banner automatically; show your
    //    own in-app banner here if you want one.
    const unsubMessage = messaging().onMessage((msg) => {
      console.log('Foreground push:', msg.notification?.title, msg.notification?.body)
    })

    // 2. Background — app was alive but backgrounded, user tapped the push.
    const unsubOpened = messaging().onNotificationOpenedApp(route)

    // 3. Terminated — app was fully closed and launched by tapping a push.
    messaging().getInitialNotification().then(route)

    return () => {
      unsubMessage()
      unsubOpened()
    }
  }, [navigation])
}`

export default function ReactNativePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          Mobile SDK
        </p>
        <h1 className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          React Native Integration Guide
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          A complete, copy-pasteable walkthrough for talking to the Balapasa
          platform API from a React Native app: a typed fetch client with a
          bearer-token header, JWT persistence, a small service layer for auth,
          products, and orders, and a full Firebase Cloud Messaging setup for
          real-time order and delivery pushes. Notes call out where the{' '}
          <span className="text-slate-300">Expo (managed)</span> and{' '}
          <span className="text-slate-300">bare React Native CLI</span> flows
          differ.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          Mobile clients authenticate with a JSON Web Token. Sign in once, store
          the returned token, and send it as{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            Authorization: Bearer &lt;jwt&gt;
          </code>{' '}
          on every request.
        </p>
      </section>

      {/* 1. Project setup */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <Boxes className="h-5 w-5 text-emerald-400" />
          1. Project setup
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Install a secure-storage package and the Firebase messaging libraries.
          Pick the snippet that matches your workflow.
        </p>

        <div className="mb-5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200/90">
          <p className="font-semibold text-sky-300">Expo vs bare</p>
          <p className="mt-1 leading-relaxed">
            <code className="font-[family-name:var(--font-jetbrains)]">
              @react-native-firebase
            </code>{' '}
            uses native modules, so it does <em>not</em> run in Expo Go. On Expo
            you must add the config plugins and build a{' '}
            <a
              href="https://docs.expo.dev/develop/development-builds/introduction/"
              className="text-sky-300 underline decoration-sky-500/40 underline-offset-2 transition-colors duration-200 hover:text-sky-200"
            >
              development build
            </a>
            . The fully Expo-managed alternative is{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">
              expo-notifications
            </code>
            , which can fetch an FCM/APNs token without the native Firebase SDK —
            but this guide uses{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">
              @react-native-firebase/messaging
            </code>{' '}
            so the same code works in both Expo dev builds and bare projects.
          </p>
        </div>

        <CodeBlock code={installExpoCode} language="bash" title="Expo (managed workflow)" />
        <div className="mt-4">
          <CodeBlock code={installBareCode} language="bash" title="Bare React Native CLI" />
        </div>

        <p className="mt-4 mb-4 text-sm leading-relaxed text-slate-400">
          Keep your base URL and storage keys in one place so switching between
          sandbox and production is a one-line change.
        </p>
        <CodeBlock code={configCode} language="ts" title="src/api/config.ts" />
      </section>

      {/* 2. Token storage */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <KeyRound className="h-5 w-5 text-emerald-400" />
          2. Persist the JWT
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          On Expo, store the token with{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            expo-secure-store
          </code>{' '}
          so it lives in the iOS Keychain / Android Keystore. Both modules below
          expose the same{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            read / save / clear
          </code>{' '}
          shape, so the rest of the app is identical regardless of which you
          pick.
        </p>
        <CodeBlock code={tokenStoreExpoCode} language="ts" title="src/api/tokenStore.ts (Expo)" />
        <p className="mt-4 mb-4 text-sm leading-relaxed text-slate-400">
          In a bare project without expo-secure-store,{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            @react-native-async-storage/async-storage
          </code>{' '}
          is a drop-in alternative (note: it is not encrypted — prefer{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            react-native-keychain
          </code>{' '}
          for production).
        </p>
        <CodeBlock code={tokenStoreBareCode} language="ts" title="src/api/tokenStore.ts (AsyncStorage)" />
      </section>

      {/* 3. Fetch client */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <Layers className="h-5 w-5 text-emerald-400" />
          3. Fetch client with a bearer-token header
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          A single wrapper reads the stored token on every request and attaches
          it as a bearer header. A 401 response clears the token so the app can
          route back to the login screen, and non-2xx responses throw a typed{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            ApiError
          </code>{' '}
          carrying the server&apos;s{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            error
          </code>{' '}
          string.
        </p>
        <CodeBlock code={clientCode} language="ts" title="src/api/client.ts" />
      </section>

      {/* 4. API service */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <PackageCheck className="h-5 w-5 text-emerald-400" />
          4. A sample API service
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          First, lightweight types mirroring the real response shapes.
        </p>
        <CodeBlock code={typesCode} language="ts" title="src/api/types.ts" />

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          Auth — POST /api/mobile/auth
        </h3>
        <div className="mb-4">
          <EndpointCard
            method="POST"
            path="/api/mobile/auth"
            auth="Public"
            title="Log in and receive a JWT"
          >
            <p className="mb-3">
              Send the customer&apos;s email and password. On success the
              response body contains a{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                token
              </code>{' '}
              and a{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                user
              </code>{' '}
              object. Store the token and attach it on every later request.
            </p>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Request body
            </p>
            <ParamTable
              rows={[
                { name: 'email', type: 'string', required: true, desc: 'Account email address.' },
                { name: 'password', type: 'string', required: true, desc: 'Account password.' },
              ]}
            />
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Response — 200
            </p>
            <ParamTable
              rows={[
                { name: 'token', type: 'string', desc: 'Signed JWT. Send as Authorization: Bearer <token>.' },
                { name: 'user.id', type: 'string', desc: 'Profile id.' },
                { name: 'user.email', type: 'string', desc: 'Account email.' },
                { name: 'user.name', type: 'string | null', desc: 'Display name, if set.' },
                { name: 'user.role', type: 'string', desc: 'CUSTOMER, STAFF, MANAGER, or ADMIN.' },
                { name: 'user.phone', type: 'string | null', desc: 'Phone number, if set.' },
              ]}
            />
          </EndpointCard>
        </div>

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          Products — GET /api/products
        </h3>
        <div className="mb-4">
          <EndpointCard
            method="GET"
            path="/api/products"
            auth="Public"
            title="List and search products"
          >
            <p className="mb-3">
              Returns a paginated list. All parameters are optional query
              strings.
            </p>
            <ParamTable
              rows={[
                { name: 'search', type: 'string', desc: 'Full-text match on name, description, brand, SKU, and tags.' },
                { name: 'category', type: 'string', desc: 'Filter by category slug.' },
                { name: 'page', type: 'number', desc: 'Page number, defaults to 1.' },
                { name: 'limit', type: 'number', desc: 'Page size, defaults to 24.' },
              ]}
            />
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Response — 200
            </p>
            <ParamTable
              rows={[
                { name: 'products', type: 'Product[]', desc: 'The page of products.' },
                { name: 'total', type: 'number', desc: 'Total matching products.' },
                { name: 'page', type: 'number', desc: 'Current page.' },
                { name: 'totalPages', type: 'number', desc: 'Total page count.' },
              ]}
            />
          </EndpointCard>
        </div>

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          Orders — POST /api/orders
        </h3>
        <div className="mb-4">
          <EndpointCard
            method="POST"
            path="/api/orders"
            auth="Bearer JWT"
            title="Create an order"
          >
            <p className="mb-3">
              For Cash on Delivery the API responds{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                201
              </code>{' '}
              with an{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                orderId
              </code>
              . The server recomputes totals from the cart, so you never send a
              client-trusted total.
            </p>
            <p className="mb-3 text-slate-400">
              Note: this route currently reads the session from the web auth
              cookie, so a pure bearer-token request is treated as guest
              checkout — the returned{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                magicLinkToken
              </code>{' '}
              lets the customer claim the order against their account afterwards.
            </p>
            <ParamTable
              rows={[
                { name: 'items', type: 'CartLine[]', required: true, desc: 'Each item: { id, name, price, image, quantity }.' },
                { name: 'subtotal', type: 'number', required: true, desc: 'Cart subtotal before delivery.' },
                { name: 'deliveryCharge', type: 'number', required: true, desc: 'Delivery fee for the chosen option.' },
                { name: 'paymentMethod', type: 'string', required: true, desc: 'COD, ESEWA, or KHALTI. This guide uses COD.' },
                { name: 'name', type: 'string', required: true, desc: 'Recipient name.' },
                { name: 'phone', type: 'string', required: true, desc: 'Recipient phone.' },
                { name: 'address', type: 'string', required: true, desc: 'Delivery address line.' },
                { name: 'city', type: 'string', required: true, desc: 'Delivery city.' },
              ]}
            />
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Response — 201 (COD)
            </p>
            <ParamTable
              rows={[
                { name: 'orderId', type: 'string', desc: 'The created order id.' },
                { name: 'orderCode', type: 'string | null', desc: 'Human-readable order code, if assigned.' },
                { name: 'status', type: 'string', desc: '"success".' },
                { name: 'magicLinkToken', type: 'string | null', desc: 'Guest account-claim token, if applicable.' },
              ]}
            />
          </EndpointCard>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          The service ties it together. Notice none of the methods touch the
          token directly — the client from step 3 handles auth.
        </p>
        <CodeBlock code={serviceCode} language="ts" title="src/api/service.ts" />

        <p className="mt-4 mb-4 text-sm leading-relaxed text-slate-400">
          Using it from a screen:
        </p>
        <CodeBlock code={usageCode} language="tsx" title="Logging in" />
      </section>

      {/* 5. FCM */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <Bell className="h-5 w-5 text-emerald-400" />
          5. Push notifications with Firebase Cloud Messaging
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          The backend sends pushes through FCM HTTP v1 for order confirmed,
          payment confirmed, shipped, delivered, and cancelled events. The flow
          is: install the Firebase packages, place the platform config files,
          request permission, read the device token, register it with{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            POST /api/mobile/push
          </code>
          , then handle foreground, background, and terminated messages.
        </p>

        <div className="mb-5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200/90">
          <p className="font-semibold text-amber-300">Heads up</p>
          <p className="mt-1 leading-relaxed">
            Pushes only deliver once the server has its{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">
              FCM_PROJECT_ID
            </code>
            ,{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">
              FCM_CLIENT_EMAIL
            </code>
            , and{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">
              FCM_PRIVATE_KEY
            </code>{' '}
            configured. Until then, registration succeeds but no notification is
            sent. Pushes are also targeted by user id, so register the token{' '}
            <em>after</em> login.
          </p>
        </div>

        <h3 className="mb-3 mt-6 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          <Smartphone className="h-4 w-4 text-emerald-400" />
          5a. Platform config
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Register the app in the Firebase console for each platform and add the
          generated config files. On Expo this is wired through config plugins;
          on bare RN you edit the native build files directly.
        </p>
        <CodeBlock code={fcmConfigExpoCode} language="json" title="Expo — app.json plugins + config files" />
        <div className="mt-4">
          <CodeBlock code={fcmConfigBareCode} language="bash" title="Bare RN — native config + APNs" />
        </div>

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          5b. Register the background handler
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Set the background message handler at the very top of your entry file,
          before{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            registerComponent
          </code>
          , so it is in place when a push arrives while the app is backgrounded
          or terminated.
        </p>
        <CodeBlock code={fcmBackgroundCode} language="ts" title="index.js" />

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          5c. Request permission &amp; register the token
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Ask for permission, read the FCM token, and POST it to the backend.
          Re-register on token refresh, and unregister on logout.
        </p>
        <div className="mb-4">
          <EndpointCard
            method="POST"
            path="/api/mobile/push"
            auth="Bearer JWT"
            title="Register or refresh a device token"
          >
            <p className="mb-3">
              Upserts the token so future pushes for the authenticated user
              reach this device. Accepts the bearer token (or the web auth
              cookie). Returns{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {'{ registered: true }'}
              </code>
              .
            </p>
            <ParamTable
              rows={[
                { name: 'token', type: 'string', required: true, desc: 'The FCM device token.' },
                { name: 'platform', type: "'android' | 'ios'", desc: "Device platform. Defaults to 'android'." },
              ]}
            />
          </EndpointCard>
        </div>
        <div className="mb-4">
          <EndpointCard
            method="DELETE"
            path="/api/mobile/push"
            auth="Bearer JWT"
            title="Unregister a device token"
          >
            <p className="mb-3">
              Removes the token on logout so a shared device stops receiving the
              user&apos;s pushes. Returns{' '}
              <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
                {'{ removed: true }'}
              </code>
              .
            </p>
            <ParamTable
              rows={[
                { name: 'token', type: 'string', required: true, desc: 'The FCM device token to remove.' },
              ]}
            />
          </EndpointCard>
        </div>
        <CodeBlock code={fcmRegisterCode} language="ts" title="src/push/pushService.ts" />

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          5d. Handle messages &amp; deep-link on tap
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Handle the three delivery states and route on tap using the push{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            data
          </code>{' '}
          map. Order pushes carry a{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            screen
          </code>{' '}
          key (for example{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-emerald-400">
            screen: &quot;orders&quot;
          </code>
          ) plus the relevant id.
        </p>
        <CodeBlock code={fcmHandlersCode} language="tsx" title="src/push/usePushRouter.ts" />

        <div className="mt-5 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4 text-sm text-sky-200/90">
          <p className="font-semibold text-sky-300">Push payload shape</p>
          <p className="mt-1 leading-relaxed">
            Every push carries a{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">title</code>{' '}
            and{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">body</code>
            , an optional{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">imageUrl</code>
            , and an optional string-to-string{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">data</code>{' '}
            map. Read{' '}
            <code className="font-[family-name:var(--font-jetbrains)]">
              remoteMessage.data
            </code>{' '}
            in the tap handler to decide where to navigate.
          </p>
        </div>
      </section>
    </div>
  )
}
