// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Procedure = (...args: any[]) => any;

export type ProceduresObject<T extends Record<string, Procedure>> = {
  [K in keyof T]: (
    ...args: Parameters<T[K]>
  ) => Promise<Awaited<ReturnType<T[K]>>>;
};

export type Bridge = <T extends Record<string, Procedure>>(
  procedures: T,
) => ProceduresObject<T>;
