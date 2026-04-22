/* global jest */

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({children}) => children,
    SafeAreaView: ({children}) => children,
    useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(async () => false),
  setGenericPassword: jest.fn(async () => undefined),
  resetGenericPassword: jest.fn(async () => undefined),
}));

jest.mock('@react-native-voice/voice', () => {
  const listeners = new Map();

  return {
    __esModule: true,
    default: {
      __listeners: listeners,
      removeAllListeners: jest.fn(() => listeners.clear()),
      destroy: jest.fn(async () => undefined),
      isAvailable: jest.fn(async () => 1),
      getSpeechRecognitionServices: jest.fn(async () => ['com.google.android.googlequicksearchbox']),
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
      cancel: jest.fn(async () => undefined),
      set onSpeechStart(handler) {
        listeners.set('onSpeechStart', handler);
      },
      set onSpeechRecognized(handler) {
        listeners.set('onSpeechRecognized', handler);
      },
      set onSpeechEnd(handler) {
        listeners.set('onSpeechEnd', handler);
      },
      set onSpeechError(handler) {
        listeners.set('onSpeechError', handler);
      },
      set onSpeechResults(handler) {
        listeners.set('onSpeechResults', handler);
      },
      set onSpeechPartialResults(handler) {
        listeners.set('onSpeechPartialResults', handler);
      },
      set onSpeechVolumeChanged(handler) {
        listeners.set('onSpeechVolumeChanged', handler);
      },
    },
  };
});

jest.mock('react-native-tts', () => ({
  default: {
    getInitStatus: jest.fn(async () => 'success'),
    engines: jest.fn(async () => [
      {name: 'default-engine', label: 'Default Engine', default: true, icon: 0},
    ]),
    voices: jest.fn(async () => [
      {
        id: 'en-us-standard',
        name: 'English US Standard',
        language: 'en-US',
        quality: 300,
        latency: 100,
        networkConnectionRequired: false,
        notInstalled: false,
      },
      {
        id: 'en-gb-enhanced',
        name: 'English UK Enhanced',
        language: 'en-GB',
        quality: 500,
        latency: 80,
        networkConnectionRequired: false,
        notInstalled: false,
      },
    ]),
    setDefaultEngine: jest.fn(async () => true),
    setDefaultVoice: jest.fn(async () => 'success'),
    setDefaultLanguage: jest.fn(async () => 'success'),
    setDefaultRate: jest.fn(async () => 'success'),
    setDucking: jest.fn(async () => 'success'),
    speak: jest.fn(),
    stop: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => [
    {
      identifier: 'expo-en-us',
      name: 'English US',
      language: 'en-US',
      quality: 'Enhanced',
    },
  ]),
}));

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn((_source, _options) => ({
    addListener: jest.fn(() => ({
      remove: jest.fn(),
    })),
    replace: jest.fn(),
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
  })),
  setAudioModeAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: {MICROPHONE: 'ios.microphone', SPEECH_RECOGNITION: 'ios.speech'},
    ANDROID: {RECORD_AUDIO: 'android.record_audio'},
  },
  RESULTS: {GRANTED: 'granted'},
  checkMultiple: jest.fn(async permissions =>
    Object.fromEntries(permissions.map(permission => [permission, 'granted'])),
  ),
  requestMultiple: jest.fn(async permissions =>
    Object.fromEntries(permissions.map(permission => [permission, 'granted'])),
  ),
}));

jest.mock('@livekit/react-native', () => ({
  registerGlobals: jest.fn(),
  AudioSession: {
    configureAudio: jest.fn(async () => undefined),
    startAudioSession: jest.fn(async () => undefined),
    stopAudioSession: jest.fn(async () => undefined),
  },
  AndroidAudioTypePresets: {
    communication: {
      manageAudioFocus: true,
      audioMode: 'inCommunication',
      audioFocusMode: 'gain',
      audioStreamType: 'voiceCall',
      audioAttributesUsageType: 'voiceCommunication',
      audioAttributesContentType: 'speech',
    },
  },
}));

jest.mock('livekit-client', () => {
  class MockRoom {
    constructor() {
      this.handlers = new Map();
      this.localParticipant = {
        setMicrophoneEnabled: jest.fn(async () => undefined),
        publishData: jest.fn(async () => undefined),
      };
    }

    on(event, handler) {
      this.handlers.set(event, handler);
      return this;
    }

    prepareConnection = jest.fn(async () => undefined);
    connect = jest.fn(async () => undefined);
    disconnect = jest.fn(() => {
      const handler = this.handlers.get('disconnected');
      if (handler) {
        handler();
      }
    });
  }

  return {
    Room: MockRoom,
    RoomEvent: {
      Reconnecting: 'reconnecting',
      Reconnected: 'reconnected',
      Disconnected: 'disconnected',
      DataReceived: 'dataReceived',
    },
  };
});
