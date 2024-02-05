import { defineClientConfig } from "@vuepress/client";
import { setupPWA } from "/Users/peichao.dong/Documents/projects/dpc/blog/pc-dong.github.io/node_modules/vuepress-plugin-pwa2/lib/client/composables/setup.js";
import SWUpdatePopup from "/Users/peichao.dong/Documents/projects/dpc/blog/pc-dong.github.io/node_modules/vuepress-plugin-pwa2/lib/client/components/SWUpdatePopup.js";


export default defineClientConfig({
  setup: () => {
    setupPWA();
  },
  rootComponents: [
    SWUpdatePopup,
    
  ],
});
