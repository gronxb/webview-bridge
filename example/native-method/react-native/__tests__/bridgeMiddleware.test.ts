import {
  bridge,
  handleBridge,
  type BridgeMiddleware,
  type BridgeMiddlewareNext,
} from '../../../../packages/react-native/src/integrations/bridge';
import type {BridgeStore} from '@webview-bridge/react-native';

type HandleBridgeStore = Parameters<typeof handleBridge>[0]['bridge'];

const parseEmission = (script: string) => {
  const call = script.match(/\.emit\('([^']+)', (.+)\);/);
  if (!call) {
    throw new Error(`Could not find an emitter call in: ${script}`);
  }
  return [call[1], ...JSON.parse(`[${call[2]}]`)] as unknown[];
};

const invokeBridge = async (
  bridgeStore: HandleBridgeStore,
  method: string,
  args: unknown[] = [],
) => {
  const scripts: string[] = [];

  await handleBridge({
    bridge: bridgeStore,
    method,
    args,
    eventId: 'event',
    bridgeId: 'example',
    url: 'https://app.example/screen',
    webview: {
      injectJavaScript(script: string) {
        scripts.push(script);
      },
    } as never,
  });

  expect(scripts).toHaveLength(1);
  return parseEmission(scripts[0]);
};

describe('bridge middleware integration', () => {
  it('remains usable as a legacy BridgeStore when middleware is not used', async () => {
    const appBridge = bridge({
      async getMessage() {
        return 'native value';
      },
    });
    const legacyStore: BridgeStore<ReturnType<typeof appBridge.getState>> =
      appBridge;

    expect(Object.keys(appBridge)).toEqual([
      'getState',
      'setState',
      'subscribe',
    ]);
    await expect(invokeBridge(legacyStore, 'getMessage')).resolves.toEqual([
      'getMessage-event',
      'native value',
    ]);
  });

  it('chains three middlewares, propagates context, and transforms a response', async () => {
    const calls: string[] = [];
    type AuthContext = {auth: {userId: string}};
    const auth = (): BridgeMiddleware<AuthContext> =>
      async (request, next) => {
        calls.push('middleware 1 start');
        request.auth = {userId: 'user-1'};
        const response = await next();
        calls.push('middleware 1 end');
        return response;
      };
    const appBridge = bridge({
      async openExternalUrl(url: string) {
        calls.push(`method:${url}`);
        return { openedUrl: url };
      },
    })
      .use(auth())
      .use(async (request, next) => {
        calls.push(`middleware 2 start:${request.auth.userId}`);
        request.args = [
          new URL(
            String(request.args[0]).trim(),
            'https://example.com',
          ).toString(),
        ];
        const response = (await next()) as { openedUrl: string };
        calls.push('middleware 2 end');
        return { ...response, traced: true };
      })
      .use(async (request, next) => {
        calls.push(`middleware 3 start:${request.auth.userId}`);
        await next();
        calls.push('middleware 3 end');
      });

    const emission = await invokeBridge(appBridge, 'openExternalUrl', [
      '/docs ',
    ]);

    expect(calls).toEqual([
      'middleware 1 start',
      'middleware 2 start:user-1',
      'middleware 3 start:user-1',
      'method:https://example.com/docs',
      'middleware 3 end',
      'middleware 2 end',
      'middleware 1 end',
    ]);
    expect(emission).toEqual([
      'openExternalUrl-event',
      { openedUrl: 'https://example.com/docs', traced: true },
    ]);
  });

  it('short-circuits a blocked request without invoking native code', async () => {
    const nativeMethod = jest.fn(async () => 'opened');
    const appBridge = bridge({ openExternalUrl: nativeMethod }).use(
      (request, next) => {
        const [url] = request.args;
        return typeof url === 'string' && url.startsWith('https://')
          ? next()
          : { status: 'blocked' };
      },
    );

    const emission = await invokeBridge(appBridge, 'openExternalUrl', [
      'http://untrusted.example',
    ]);

    expect(nativeMethod).not.toHaveBeenCalled();
    expect(emission).toEqual([
      'openExternalUrl-event',
      { status: 'blocked' },
    ]);
  });

  it('allows outer middleware to recover a native error', async () => {
    const appBridge = bridge({
      async loadProfile() {
        throw new Error('native unavailable');
      },
    }).use(async (_request, next) => {
      try {
        return await next();
      } catch (error) {
        return {
          recovered: error instanceof Error ? error.message : String(error),
        };
      }
    });

    const emission = await invokeBridge(appBridge, 'loadProfile');

    expect(emission).toEqual([
      'loadProfile-event',
      { recovered: 'native unavailable' },
    ]);
  });

  it('isolates bridge instances and snapshots middleware per request', async () => {
    let releaseRequest!: () => void;
    const requestGate = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const firstBridge = bridge({
      async getValue() {
        return 'first native value';
      },
    }).use(async (_request, next) => {
      await requestGate;
      return next();
    });
    const secondBridge = bridge({
      async getValue() {
        return 'second native value';
      },
    });

    const inFlightRequest = invokeBridge(firstBridge, 'getValue');
    firstBridge.use(() => 'late middleware value');
    releaseRequest();

    await expect(inFlightRequest).resolves.toEqual([
      'getValue-event',
      'first native value',
    ]);
    await expect(invokeBridge(firstBridge, 'getValue')).resolves.toEqual([
      'getValue-event',
      'late middleware value',
    ]);
    await expect(invokeBridge(secondBridge, 'getValue')).resolves.toEqual([
      'getValue-event',
      'second native value',
    ]);
  });

  it('rejects duplicate and late next calls', async () => {
    const nativeMethod = jest.fn(async () => 'native value');
    const duplicateBridge = bridge({ getValue: nativeMethod }).use(
      async (_request, next) => {
        await next();
        return next();
      },
    );
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const duplicateEmission = await invokeBridge(duplicateBridge, 'getValue');
    const duplicateError = JSON.parse(String(duplicateEmission[2])) as {
      message: string;
    };

    expect(nativeMethod).toHaveBeenCalledTimes(1);
    expect(duplicateError.message).toBe('next() called multiple times');

    let lateNext!: BridgeMiddlewareNext;
    const lateBridge = bridge({
      async getValue() {
        return 'native value';
      },
    }).use((_request, next) => {
      lateNext = next;
      return 'short-circuited';
    });

    await expect(invokeBridge(lateBridge, 'getValue')).resolves.toEqual([
      'getValue-event',
      'short-circuited',
    ]);
    await expect(lateNext()).rejects.toThrow(
      'next() called after middleware completed',
    );

    consoleError.mockRestore();
  });
});
