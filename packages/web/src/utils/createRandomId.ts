const TABLE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export const createRandomId = (size = 21) => {
  const randomValues = new Uint8Array(size);
  crypto.getRandomValues(randomValues);

  const idArray = Array.from(randomValues, (value) => TABLE[value % 64]);

  return idArray.join("");
};
