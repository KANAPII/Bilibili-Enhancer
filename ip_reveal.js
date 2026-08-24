(function () {
  function injectScript() {
    const root = document.head || document.documentElement;
    if (root) {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("injected.js");
      script.onload = function () {
        this.remove();
      };
      root.appendChild(script);
    } else {
      requestAnimationFrame(injectScript);
    }
  }

  injectScript();
})();
