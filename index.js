import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

// Register the Android home-screen widget task handler. Guarded so it
// is a no-op on iOS / Expo Go where the native module isn't present.
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widget/widget-task-handler.js');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch (e) {
    // native widget module unavailable — app still runs normally
  }
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
