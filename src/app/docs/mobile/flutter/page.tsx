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
  title: 'Flutter — Balapasa Platform API',
  description:
    'A complete, copy-pasteable Flutter integration guide for the Balapasa platform API: Dio client with a bearer-token interceptor, secure JWT storage, sample API service, and full Firebase Cloud Messaging setup.',
}

// Dart uses `$` for string interpolation. Inside these JS template literals
// every Dart `$token` / `${expr}` MUST be escaped as `\$` so it is emitted
// literally and not evaluated by JavaScript at build time.

const pubspecCode = `dependencies:
  flutter:
    sdk: flutter
  dio: ^5.4.0
  flutter_secure_storage: ^9.2.2
  firebase_core: ^3.6.0
  firebase_messaging: ^15.1.3`

const constantsCode = `// lib/api/api_config.dart

class ApiConfig {
  // Switch to the sandbox host while integrating, then flip to production.
  static const String baseUrl = 'https://api.balapasa.com/v1';
  // static const String baseUrl = 'https://sandbox.balapasa.com/v1';

  // Where the JWT is persisted between launches (flutter_secure_storage key).
  static const String tokenKey = 'balapasa_auth_token';
}`

const tokenStorageCode = `// lib/api/token_store.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_config.dart';

/// Thin wrapper over flutter_secure_storage so the JWT lives in the
/// Keychain (iOS) / EncryptedSharedPreferences (Android), never in
/// plain SharedPreferences.
class TokenStore {
  TokenStore(this._storage);
  final FlutterSecureStorage _storage;

  Future<String?> read() => _storage.read(key: ApiConfig.tokenKey);

  Future<void> save(String token) =>
      _storage.write(key: ApiConfig.tokenKey, value: token);

  Future<void> clear() => _storage.delete(key: ApiConfig.tokenKey);
}`

const dioClientCode = `// lib/api/api_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'api_config.dart';
import 'token_store.dart';

/// A configured Dio instance. The interceptor reads the stored JWT and
/// attaches it as \`Authorization: Bearer <jwt>\` on every outgoing request.
class ApiClient {
  ApiClient._(this.dio, this.tokenStore);

  final Dio dio;
  final TokenStore tokenStore;

  factory ApiClient.create() {
    const storage = FlutterSecureStorage();
    final tokenStore = TokenStore(storage);

    final dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await tokenStore.read();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer \$token';
          }
          handler.next(options);
        },
        onError: (err, handler) async {
          // A 401 means the JWT expired or was revoked — drop it so the
          // app can route the user back to the login screen.
          if (err.response?.statusCode == 401) {
            await tokenStore.clear();
          }
          handler.next(err);
        },
      ),
    );

    return ApiClient._(dio, tokenStore);
  }
}`

const modelsCode = `// lib/api/models.dart

/// Mirrors the \`user\` object returned by POST /api/mobile/auth.
class AuthUser {
  AuthUser({
    required this.id,
    required this.email,
    required this.role,
    this.name,
    this.phone,
  });

  final String id;
  final String email;
  final String role; // CUSTOMER | STAFF | MANAGER | ADMIN
  final String? name;
  final String? phone;

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: json['role'] as String,
        name: json['name'] as String?,
        phone: json['phone'] as String?,
      );
}

/// A single product from GET /api/products (\`products[]\`).
class Product {
  Product({
    required this.id,
    required this.name,
    required this.slug,
    required this.price,
    this.salePrice,
    this.images = const [],
  });

  final String id;
  final String name;
  final String slug;
  final num price;
  final num? salePrice;
  final List<String> images;

  factory Product.fromJson(Map<String, dynamic> json) => Product(
        id: json['id'] as String,
        name: json['name'] as String,
        slug: json['slug'] as String,
        price: json['price'] as num,
        salePrice: json['salePrice'] as num?,
        images: (json['images'] as List?)?.cast<String>() ?? const [],
      );
}

/// A line item sent in the POST /api/orders request body.
class CartLine {
  CartLine({
    required this.id,
    required this.name,
    required this.price,
    required this.image,
    required this.quantity,
  });

  final String id;
  final String name;
  final num price;
  final String image;
  final int quantity;

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'price': price,
        'image': image,
        'quantity': quantity,
      };
}`

const apiServiceCode = `// lib/api/api_service.dart
import 'package:dio/dio.dart';
import 'api_client.dart';
import 'models.dart';

class ApiService {
  ApiService(this._client);
  final ApiClient _client;

  Dio get _dio => _client.dio;

  /// POST /api/mobile/auth — returns { token, user }. The token is stored
  /// so the interceptor can attach it to every subsequent request.
  Future<AuthUser> login({
    required String email,
    required String password,
  }) async {
    final res = await _dio.post(
      '/api/mobile/auth',
      data: {'email': email, 'password': password},
    );
    final body = res.data as Map<String, dynamic>;
    await _client.tokenStore.save(body['token'] as String);
    return AuthUser.fromJson(body['user'] as Map<String, dynamic>);
  }

  Future<void> logout() => _client.tokenStore.clear();

  /// GET /api/products — returns { products, total, page, totalPages }.
  Future<List<Product>> fetchProducts({
    String? search,
    String? category,
    int page = 1,
    int limit = 24,
  }) async {
    final res = await _dio.get(
      '/api/products',
      queryParameters: {
        if (search != null) 'search': search,
        if (category != null) 'category': category,
        'page': page,
        'limit': limit,
      },
    );
    final body = res.data as Map<String, dynamic>;
    final items = (body['products'] as List).cast<Map<String, dynamic>>();
    return items.map(Product.fromJson).toList();
  }

  /// POST /api/orders — creates an order. For Cash on Delivery the API
  /// responds 201 with { orderId, orderCode, status, magicLinkToken }.
  Future<String> createOrder({
    required List<CartLine> items,
    required num subtotal,
    required num deliveryCharge,
    required String name,
    required String phone,
    required String address,
    required String city,
    String paymentMethod = 'COD',
    String shippingOption = 'standard',
  }) async {
    final res = await _dio.post(
      '/api/orders',
      data: {
        'items': items.map((i) => i.toJson()).toList(),
        'subtotal': subtotal,
        'deliveryCharge': deliveryCharge,
        'paymentMethod': paymentMethod,
        'shippingOption': shippingOption,
        'name': name,
        'phone': phone,
        'address': address,
        'city': city,
      },
    );
    final body = res.data as Map<String, dynamic>;
    return body['orderId'] as String;
  }
}`

const loginUsageCode = `final client = ApiClient.create();
final api = ApiService(client);

try {
  final user = await api.login(
    email: 'shopper@example.com',
    password: 'super-secret',
  );
  debugPrint('Logged in as \${user.name ?? user.email} (\${user.role})');
} on DioException catch (e) {
  // 400 -> missing fields, 401 -> invalid credentials.
  final message = e.response?.data?['error'] ?? 'Login failed';
  debugPrint('Auth error: \$message');
}`

const fcmSetupAndroidCode = `# 1. Add the Firebase Android app in the Firebase console, then drop the
#    generated config file at:
android/app/google-services.json

# 2. Apply the Google Services Gradle plugin.
# android/settings.gradle.kts  (plugins block)
plugins {
  id("com.google.gms.google-services") version "4.4.2" apply false
}

# android/app/build.gradle.kts
plugins {
  id("com.google.gms.google-services")
}`

const fcmSetupIosCode = `# iOS / APNs
# 1. Add the Firebase iOS app, then place the config at:
ios/Runner/GoogleService-Info.plist

# 2. In the Apple Developer portal create an APNs Authentication Key (.p8)
#    and upload it under Firebase Console -> Project Settings ->
#    Cloud Messaging -> Apple app configuration.

# 3. Enable the Push Notifications + Background Modes (Remote notifications)
#    capabilities for the Runner target in Xcode.`

const fcmInitCode = `// lib/main.dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Must be a top-level (or static) function and annotated so the Dart VM
/// keeps it as an entry point — it runs in a separate isolate when a push
/// arrives while the app is in the background or terminated.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('Background push: \${message.messageId}');
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  runApp(const MyApp());
}`

const fcmRegisterCode = `// lib/push/push_service.dart
import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import '../api/api_client.dart';

class PushService {
  PushService(this._client);
  final ApiClient _client;

  final _fcm = FirebaseMessaging.instance;

  /// Ask for permission, read the device token, and register it with the
  /// backend. Call this AFTER the user has logged in so the token is tied
  /// to their account (the interceptor adds the bearer JWT).
  Future<void> registerDevice() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      return; // user declined — nothing to register
    }

    // On iOS, wait for the APNs token to be available before asking for
    // the FCM token, otherwise getToken() can return null.
    if (Platform.isIOS) {
      await _fcm.getAPNSToken();
    }

    final token = await _fcm.getToken();
    if (token == null) return;

    await _sendToken(token);

    // Re-register whenever FCM rotates the token.
    _fcm.onTokenRefresh.listen(_sendToken);
  }

  /// POST /api/mobile/push { token, platform } -> { registered: true }
  Future<void> _sendToken(String token) async {
    await _client.dio.post(
      '/api/mobile/push',
      data: {
        'token': token,
        'platform': Platform.isIOS ? 'ios' : 'android',
      },
    );
  }

  /// DELETE /api/mobile/push { token } -> { removed: true }
  /// Call on logout so a shared device stops receiving the user's pushes.
  Future<void> unregisterDevice() async {
    final token = await _fcm.getToken();
    if (token == null) return;
    await _client.dio.delete(
      '/api/mobile/push',
      data: {'token': token},
    );
  }
}`

const fcmHandlersCode = `// lib/push/push_router.dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

/// Wire up the three delivery states. Call wire() once after the first
/// frame (e.g. from your home screen's initState).
class PushRouter {
  PushRouter(this.navigatorKey);
  final GlobalKey<NavigatorState> navigatorKey;

  Future<void> wire() async {
    // 1. Foreground — the OS does NOT show a banner automatically; show
    //    your own in-app banner / snackbar here if you want one.
    FirebaseMessaging.onMessage.listen((message) {
      final n = message.notification;
      if (n != null) {
        debugPrint('Foreground push: \${n.title} — \${n.body}');
      }
    });

    // 2. Background — app was alive but backgrounded, user tapped the push.
    FirebaseMessaging.onMessageOpenedApp.listen(_handleTap);

    // 3. Terminated — app was fully closed and launched by tapping a push.
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null) _handleTap(initial);
  }

  /// Navigate based on the push payload's \`data\` map. The backend sends
  /// data like { "screen": "orders", "orderId": "<id>" } for order events.
  void _handleTap(RemoteMessage message) {
    final data = message.data;
    final screen = data['screen'];
    final nav = navigatorKey.currentState;
    if (nav == null) return;

    switch (screen) {
      case 'orders':
        nav.pushNamed('/orders', arguments: data['orderId']);
        break;
      default:
        nav.pushNamed('/');
    }
  }
}`

export default function FlutterPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section>
        <p className="mb-3 font-[family-name:var(--font-jetbrains)] text-sm font-medium uppercase tracking-wide text-emerald-400">
          Mobile SDK
        </p>
        <h1 className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Flutter Integration Guide
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
          A complete, copy-pasteable walkthrough for talking to the Balapasa
          platform API from a Flutter app: a Dio HTTP client with a
          bearer-token interceptor, secure JWT storage, a typed API service for
          auth, products, and orders, and a full Firebase Cloud Messaging setup
          for real-time order and delivery pushes.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-500">
          Mobile clients authenticate with a JSON Web Token. Sign in once,
          store the returned token, and send it as{' '}
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
          Add the HTTP, secure-storage, and Firebase packages to your{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            pubspec.yaml
          </code>
          , then run{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            flutter pub get
          </code>
          .
        </p>
        <CodeBlock code={pubspecCode} language="yaml" title="pubspec.yaml" />
        <p className="mt-4 mb-4 text-sm leading-relaxed text-slate-400">
          Keep your base URL and storage keys in one place so switching between
          sandbox and production is a one-line change.
        </p>
        <CodeBlock code={constantsCode} language="dart" title="lib/api/api_config.dart" />
      </section>

      {/* 2. Secure token storage */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <KeyRound className="h-5 w-5 text-emerald-400" />
          2. Store the JWT securely
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Persist the token with{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            flutter_secure_storage
          </code>{' '}
          so it lives in the iOS Keychain and Android EncryptedSharedPreferences
          rather than plain preferences.
        </p>
        <CodeBlock code={tokenStorageCode} language="dart" title="lib/api/token_store.dart" />
      </section>

      {/* 3. Dio client + interceptor */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <Layers className="h-5 w-5 text-emerald-400" />
          3. Dio client with a bearer-token interceptor
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          A single configured Dio instance reads the stored token on every
          request and attaches it as a bearer header. A 401 response clears the
          token so the app can route back to the login screen.
        </p>
        <CodeBlock code={dioClientCode} language="dart" title="lib/api/api_client.dart" />
      </section>

      {/* 4. API service */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 font-[family-name:var(--font-jetbrains)] text-xl font-semibold text-slate-100">
          <PackageCheck className="h-5 w-5 text-emerald-400" />
          4. A sample API service
        </h2>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          First, lightweight models mirroring the real response shapes.
        </p>
        <CodeBlock code={modelsCode} language="dart" title="lib/api/models.dart" />

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
                { name: 'token', type: 'string', desc: 'Signed JWT (HS256, 7-day expiry). Send as Authorization: Bearer <token>.' },
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
          token directly — the interceptor from step 3 handles auth.
        </p>
        <CodeBlock code={apiServiceCode} language="dart" title="lib/api/api_service.dart" />

        <p className="mt-4 mb-4 text-sm leading-relaxed text-slate-400">
          Using it from a widget:
        </p>
        <CodeBlock code={loginUsageCode} language="dart" title="Logging in" />
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
          is: add the Firebase packages, place the platform config files,
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
          Register the app in the Firebase console for each platform and drop in
          the generated config files.
        </p>
        <CodeBlock code={fcmSetupAndroidCode} language="bash" title="Android — google-services.json" />
        <div className="mt-4">
          <CodeBlock code={fcmSetupIosCode} language="bash" title="iOS — GoogleService-Info.plist + APNs" />
        </div>

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          5b. Initialise Firebase + the background handler
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-slate-400">
          Initialise Firebase before{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            runApp
          </code>
          . The background handler must be a top-level function annotated with{' '}
          <code className="font-[family-name:var(--font-jetbrains)] text-slate-300">
            @pragma(&apos;vm:entry-point&apos;)
          </code>{' '}
          so the Dart VM keeps it as an entry point for the background isolate.
        </p>
        <CodeBlock code={fcmInitCode} language="dart" title="lib/main.dart" />

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
        <CodeBlock code={fcmRegisterCode} language="dart" title="lib/push/push_service.dart" />

        <h3 className="mb-3 mt-8 font-[family-name:var(--font-jetbrains)] text-base font-semibold text-slate-100">
          5d. Handle messages &amp; navigate on tap
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
        <CodeBlock code={fcmHandlersCode} language="dart" title="lib/push/push_router.dart" />

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
              message.data
            </code>{' '}
            in the tap handler to decide where to navigate.
          </p>
        </div>
      </section>
    </div>
  )
}
