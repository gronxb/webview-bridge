const TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ID_LENGTH = 21;

export const createRandomId = (size = ID_LENGTH) => {
  const randomValues = Array.from(
    { length: size },
    () => TABLE[Math.floor(Math.random() * TABLE.length)],
  );

  return randomValues.join("");
};
