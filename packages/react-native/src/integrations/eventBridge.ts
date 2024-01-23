import { EventBridge } from "../types/bridge";

export const eventBridge = <
  EventBridgeObject extends Omit<EventBridge, "__signature">,
>(
  procedures: EventBridgeObject,
): EventBridge<EventBridgeObject> => {
  return {
    ...procedures,
    __signature: "eventBridge",
  } as EventBridge<EventBridgeObject>;
};
