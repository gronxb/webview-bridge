// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AsyncFunction = (...args: any[]) => Promise<any>;

export type Bridge = Record<string, AsyncFunction>;
