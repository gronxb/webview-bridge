export const removeUndefinedKeys = (obj: Record<string, any>) => {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
};
