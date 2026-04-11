import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.179225173263-2hma0ehn7dj1hkmmheu9nts8i8s7co82',
      },
    ],
    'expo-camera',
    'expo-image-picker',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#ffffff',
        image: './assets/splash-icon-light.png',
        imageWidth: 200,
        dark: {
          image: './assets/splash-icon-dark.png',
          backgroundColor: '#000000',
        },
      },
    ],
  ];

  return {
    ...config,
    name: 'Chozr',
    slug: 'chozr',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    backgroundColor: '#FAFAFA',
    ios: {
      supportsTablet: false,
      backgroundColor: '#FAFAFA',
      bundleIdentifier: 'app.chozr.ai',
      googleServicesFile: './GoogleService-Info.plist',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      backgroundColor: '#FAFAFA',
      package: 'app.chozr.ai',
    },
    web: {
      bundler: 'metro',
    },
    plugins,
    experiments: {
      typedRoutes: true,
    },
    scheme: 'chozr',
  };
};
