(function () {
  let autoPlayBlockEnabled = true;

  const styleEl = document.createElement("style");

  styleEl.innerHTML = `
          .bili-video-card__image:hover .bili-watch-later,
          .bili-video-card__cover:hover .bili-card-watch-later,
          .top-video__cover:hover .bili-card-watch-later,
          .pic-box:hover .watch-later-video {
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

  function blockHoverEvents(e) {
    if (!autoPlayBlockEnabled) return;

    const target = e.target;

    if (target && target.closest) {
      const blockedContainer = target.closest(
        ".bili-video-card__image, " +
          ".bili-video-card__image--wrap, " +
          ".v-inline-player, " +
          ".bili-video-card__cover, " +
          ".bili-cover-card, " +
          ".bili-card-inline-player, " +
          ".top-video__cover, " +
          ".pic-box, " +
          ".framepreview-box, " +
          ".v-recommend-inline-player"
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
