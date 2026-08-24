(function () {
  let autoPlayBlockEnabled = true;

  // ==========================================
  // 核心 1：注入 CSS 强制召唤各路“稍后再看”按钮
  // ==========================================
  const styleEl = document.createElement("style");

  // 扩充了拦截目标，把 bili-video-card__cover 和 top-video__cover 的变种也加进去了
  styleEl.innerHTML = `
        .bili-video-card__image:hover .bili-watch-later,
        .bili-video-card__cover:hover .bili-card-watch-later,
        .top-video__cover:hover .bili-card-watch-later {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
            z-index: 100 !important;
        }
      `;

  function toggleWatchLaterCSS(enabled) {
    if (enabled) {
      if (!document.head.contains(styleEl)) {
        document.head.appendChild(styleEl);
      }
    } else {
      if (document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    }
  }

  chrome.storage.local.get(["autoPlayBlock"], (result) => {
    if (result.autoPlayBlock !== undefined) {
      autoPlayBlockEnabled = result.autoPlayBlock;
    }
    toggleWatchLaterCSS(autoPlayBlockEnabled);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.autoPlayBlock !== undefined) {
      autoPlayBlockEnabled = changes.autoPlayBlock.newValue;
      toggleWatchLaterCSS(autoPlayBlockEnabled);
    }
  });

  // ==========================================
  // 核心 2：JS 悬浮事件截杀器 (Closest 智能寻祖版)
  // ==========================================
  function blockHoverEvents(e) {
    if (!autoPlayBlockEnabled) return;

    const target = e.target;

    // 使用 closest()，只要鼠标触碰的元素的祖先节点包含以下任意一个 class，全部拦截
    if (target && target.closest) {
      const blockedContainer = target.closest(
        ".bili-video-card__image, " +
          ".bili-video-card__image--wrap, " +
          ".v-inline-player, " +
          ".bili-video-card__cover, " +
          ".bili-cover-card, " +
          ".bili-card-inline-player, " +
          ".top-video__cover"
      );

      if (blockedContainer) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    }
  }

  window.addEventListener("mouseenter", blockHoverEvents, true);
  window.addEventListener("mouseover", blockHoverEvents, true);
  window.addEventListener("mouseleave", blockHoverEvents, true);
  window.addEventListener("mouseout", blockHoverEvents, true);
})();
