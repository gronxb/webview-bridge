// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const removeUndefinedKeys = (obj: Record<string, any>) => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};
