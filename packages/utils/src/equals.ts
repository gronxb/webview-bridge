export const equals = (a: any, b: any) => {
  if (a === b) {
    return true;
  }

  if (a && b && typeof a === "object" && typeof b === "object") {
    const arrA = Array.isArray(a);
    const arrB = Array.isArray(b);
    let i: number;
    let length: number;
    let key: string;

    if (arrA && arrB) {
      length = a.length;
      if (length !== b.length) {
        return false;
      }
      for (i = length; i-- !== 0; ) {
        if (!equals(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }

    if (arrA !== arrB) {
      return false;
    }

    const keys = Object.keys(a);
    length = keys.length;

    if (length !== Object.keys(b).length) {
      return false;
    }

    for (i = length; i-- !== 0; ) {
      if (!Object.prototype.hasOwnProperty.call(b, keys[i])) {
        return false;
      }
    }

    for (i = length; i-- !== 0; ) {
      key = keys[i];
      if (!equals(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }

  // biome-ignore lint/suspicious/noSelfCompare: <explanation>
  return a !== a && b !== b;
};
