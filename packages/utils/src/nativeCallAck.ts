/**
 * The event native emits to the page when it starts running a Web-to-Native
 * call. The page stops applying its `timeout` to a call once it is acknowledged.
 */
export const nativeCallAckEventName = (method: string, eventId: string) =>
  `${method}-${eventId}:ack`;
