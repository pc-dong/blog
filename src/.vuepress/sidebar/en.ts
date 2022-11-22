import { sidebar } from "vuepress-theme-hope";

export const enSidebar = sidebar({
  "/": [
    "",
    // {
    //   icon: "discover",
    //   text: "Demo",
    //   prefix: "demo/",
    //   link: "demo/",
    //   children: "structure",
    // },
    {
      text: "Articles",
      icon: "note",
      prefix: "posts/",
      collapsible: true,
      children:  [
        {
          text: "RSocket",
          icon: "edit",
          prefix: "rsocket/",
          collapsible: true,
          children: "structure",
        }
      ],
    },
    "intro",
    // "slides",
  ],
});
