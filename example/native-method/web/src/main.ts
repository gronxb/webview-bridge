import "./style.css";
import { linkBridge } from "@webview-bridge/web";
import type { AppBridge } from "@webview-bridge-example-native-method/react-native";

const bridge = linkBridge<AppBridge>();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
   <div>
      <h1>This is a web page.</h1>
      <h1 id="message"></h1>
      <button id="btn">
        open InAppBrowser
      </button>

      <div>
        isWebViewBridgeAvailable: ${String(bridge.isWebViewBridgeAvailable)}
      </div>
    </div>
`;

document.getElementById("btn")!.addEventListener("click", async () => {
  if (bridge.isNativeMethodAvailable("openInAppBrowser")) {
    await bridge.openInAppBrowser("https://github.com/gronxb/webview-bridge");
  }
});

document.getElementById("message")!.innerText = await bridge.getMessage();
