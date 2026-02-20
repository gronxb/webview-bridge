import "./style.css";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-native-method/react-native/types";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
});

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
   <div>
      <h1>This is a web page.</h1>
      <h1 id="message"></h1>
      <button id="btn">
        open InAppBrowser
      </button>
      <button id="btn-error" style="margin-top: 8px;">
        Test Error from Native
      </button>

      <div>
        isWebViewBridgeAvailable: ${String(bridge.isWebViewBridgeAvailable)}
      </div>

      <div id="error-result" style="margin-top: 16px; padding: 12px; background: #fee; border: 1px solid #f00; display: none;">
        <strong>Error caught:</strong>
        <pre id="error-detail" style="white-space: pre-wrap;"></pre>
      </div>
    </div>
`;

const run = async () => {
  document.getElementById("btn")!.addEventListener("click", async () => {
    if (bridge.isNativeMethodAvailable("openInAppBrowser")) {
      await bridge.openInAppBrowser("https://github.com/gronxb/webview-bridge");
    }
  });

  document.getElementById("btn-error")!.addEventListener("click", async () => {
    const resultEl = document.getElementById("error-result")!;
    const detailEl = document.getElementById("error-detail")!;
    try {
      await bridge.throwError();
    } catch (error) {
      resultEl.style.display = "block";
      if (error instanceof Error) {
        detailEl.textContent = `name: ${error.name}\nmessage: ${error.message}\nstack: ${error.stack ?? "N/A"}`;
      } else {
        detailEl.textContent = `Non-Error caught: ${String(error)}`;
      }
    }
  });

  document.getElementById("message")!.innerText = await bridge.getMessage();
};

run();
