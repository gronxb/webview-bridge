export const createPromiseProxy = () => {
  return new Proxy(
    {},
    {
      get: () => {
        return () => Promise.resolve();
      },
    },
  );
};
