import { navbar } from "vuepress-theme-hope";

export const enNavbar = navbar([
  "/",
  // { text: "Demo", icon: "discover", link: "/demo/" },
  {
    text: "Articles",
    icon: "edit",
    prefix: "/posts/",
    children: [
      {
        text: "RSocket",
        icon: "edit",
        prefix: "rsocket/",
        children: [
          { text: "通过自定义注解实现REST风格的RSocket CRUD应用", icon: "edit", link: "1" }
        ],
      }
    ],
  },
  // {
  //   text: "Github首页",
  //   icon: "note",
  //   link: "https://github.com/pc-dong",
  // },
]);
