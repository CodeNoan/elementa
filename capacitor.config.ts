import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.com.codenoan.elementa",
  appName: "Elementa",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
