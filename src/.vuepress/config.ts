import { defineUserConfig } from "vuepress";
import theme from "./theme.js";

export default defineUserConfig({
  base: "/",

  locales: {
    "/": {
      lang: "en-US",
      title: "PC-Dong",
      description: "PC-Dong 的博客",
    },
  },

  theme,

  shouldPrefetch: false,
});
