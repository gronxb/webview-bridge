// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunction = (...args: any[]) => Promise<any>;

export type Primitive = string | number | boolean | null | undefined;

export type Bridge = {
  [key: string]: AsyncFunction | Primitive;
};
