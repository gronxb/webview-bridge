export const timeout = (ms: number, throwOnError = true) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (throwOnError) {
        reject(new Error("Timeout"));
      } else {
        resolve(void 0);
      }
    }, ms);
  });
};
