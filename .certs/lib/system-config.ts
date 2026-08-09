export const PI_NETWORK_CONFIG = {
  SDK_URL: "https://sdk.minepi.com/pi-sdk.js",
  SANDBOX: false,
} as const;

export const BACKEND_CONFIG = {
  BASE_URL: "https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com",
} as const;

export const BACKEND_URLS = {
  LOGIN: `${BACKEND_CONFIG.BASE_URL}/v1/login`,
  LOGIN_PREVIEW: `${BACKEND_CONFIG.BASE_URL}/v1/login/preview`,
  CHAT: `${BACKEND_CONFIG.BASE_URL}/v1/chat/default`,
} as const;
