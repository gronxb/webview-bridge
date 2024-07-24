import { linkBridge } from "@webview-bridge/web";

import type { AppBridge } from "../../App";

const bridge = linkBridge<AppBridge>({
  throwOnError: true,
});
document.addEventListener("DOMContentLoaded", async () => {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = /* html */ `
      <div>
         <h1>This is a web page.</h1>
         <h1 id="message"></h1>
         <button id="btn">
           open InAppBrowser
         </button>
   
       </div>
   `;

  document.getElementById("btn")!.addEventListener("click", async () => {
    if (bridge.isNativeMethodAvailable("openInAppBrowser")) {
      await bridge.openInAppBrowser("https://github.com/gronxb/webview-bridge");
    }
  });

  document.getElementById("message")!.innerText = await bridge.getMessage();
});
