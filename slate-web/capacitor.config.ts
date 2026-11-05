import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.slate.whiteboard",
  appName: "Slate",
  webDir: ".output/public",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  backgroundColor: "#ffffff",
  android: {
    allowMixedContent: false,
    captureInput: true,
    backgroundColor: "#ffffff",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
