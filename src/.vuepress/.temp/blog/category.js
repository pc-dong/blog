export const categoryMap = {"category":{"/":{"path":"/category/","map":{"DDD":{"path":"/category/ddd/","keys":["v-d00c1b28"]},"响应式编程":{"path":"/category/%E5%93%8D%E5%BA%94%E5%BC%8F%E7%BC%96%E7%A8%8B/","keys":["v-487cc656"]},"RSocket":{"path":"/category/rsocket/","keys":["v-2db4b5f4","v-311e6732"]}}}},"tag":{"/":{"path":"/tag/","map":{"ddd":{"path":"/tag/ddd/","keys":["v-d00c1b28"]},"smart domain":{"path":"/tag/smart-domain/","keys":["v-d00c1b28"]},"java":{"path":"/tag/java/","keys":["v-487cc656"]},"nio":{"path":"/tag/nio/","keys":["v-487cc656"]},"rsocket":{"path":"/tag/rsocket/","keys":["v-2db4b5f4","v-311e6732"]},"jmeter":{"path":"/tag/jmeter/","keys":["v-2db4b5f4"]},"性能测试":{"path":"/tag/%E6%80%A7%E8%83%BD%E6%B5%8B%E8%AF%95/","keys":["v-2db4b5f4"]}}}}};

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept();
  if (__VUE_HMR_RUNTIME__.updateBlogCategory)
    __VUE_HMR_RUNTIME__.updateBlogCategory(categoryMap);
}

if (import.meta.hot)
  import.meta.hot.accept(({ categoryMap }) => {
    __VUE_HMR_RUNTIME__.updateBlogCategory(categoryMap);
  });


