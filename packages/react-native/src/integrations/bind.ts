import { BridgeSignature } from "../types/bridge";

export const bind = <
  T extends { __signature: BridgeSignature },
  U extends { __signature: BridgeSignature },
>(
  bridges: [T, U],
) => {
  const methodBridge = (bridges.find(
    (item) => item?.__signature === "methodBridge",
  ) ?? { __signature: "methodBridge" }) as T;

  const eventBridge =
    bridges.find((item) => item?.__signature === "eventBridge") ??
    ({ __signature: "eventBridge" } as U);

  return [methodBridge, eventBridge] as T extends {
    __signature: "methodBridge";
  }
    ? [T, U]
    : [U, T];
};
