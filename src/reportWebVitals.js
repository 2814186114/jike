const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    // 暂时禁用web-vitals的动态导入，解决ChunkLoadError问题
    // import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    //   getCLS(onPerfEntry);
    //   getFID(onPerfEntry);
    //   getFCP(onPerfEntry);
    //   getLCP(onPerfEntry);
    //   getTTFB(onPerfEntry);
    // });
  }
};

export default reportWebVitals;
