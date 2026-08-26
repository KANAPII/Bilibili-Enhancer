(function () {
  let isEnabled = true;

  const partitionMap = {
    直播: "hideLive",
    电影: "hideMovie",
    电视剧: "hideTV",
    纪录片: "hideDoc",
    漫画: "hideComic",
    番剧: "hideAnime",
    国创: "hideGuochuang",
    综艺: "hideVariety",
    课堂: "hideCourse",
    赛事: "hideSports",
  };

  let settings = {
    adblockEnabled: true,
    hideLive: true,
    hideMovie: true,
    hideTV: true,
    hideDoc: true,
    hideComic: true,
    hideAnime: true,
    hideGuochuang: true,
    hideVariety: true,
    hideCourse: true,
    hideSports: true,
    showIP: true,
    hideTrending: true,
  };

  let localBlacklist = [];

  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
    html.adblock-active .video-card-ad-small,
    html.adblock-active .ad-report,
    html.adblock-active .recommended-swipe,
    html.adblock-active .video-resource-list,
    html.adblock-active .video-page-special-card-small,
    html.adblock-active .slide_ad,
    html.adblock-active .slide-ad-exp,
    html.adblock-active .video-page-game-card-small {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }

    html.adblock-active .bili-ad-dead {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      pointer-events: none !important;
    }

    .feed-card {
      margin-top: 22px !important;
    }
  `;
  document.documentElement.appendChild(styleEl);

  function toggleCSS(enabled) {
    if (enabled) {
      document.documentElement.classList.add("adblock-active");
    } else {
      document.documentElement.classList.remove("adblock-active");
    }
  }

  chrome.storage.local.get(
    ["localBlacklist", ...Object.keys(settings)],
    (result) => {
      if (result.localBlacklist) {
        localBlacklist = result.localBlacklist;
      }
      for (const key in result) {
        if (settings.hasOwnProperty(key) && result[key] !== undefined) {
          settings[key] = result[key];
        }
      }
      toggleCSS(settings.adblockEnabled);
    }
  );

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
      if (changes.localBlacklist) {
        localBlacklist = changes.localBlacklist.newValue;
      }
      for (const key in changes) {
        if (settings.hasOwnProperty(key)) {
          settings[key] = changes[key].newValue;
        }
      }
      if (changes.adblockEnabled !== undefined) {
        toggleCSS(settings.adblockEnabled);
      }
      markContent();
    }
  });

  let currentTheme = "light";

  function detectBiliTheme() {
    const htmlClasses = document.documentElement.classList;
    if (
      htmlClasses.contains("bili_dark") ||
      htmlClasses.contains("night-mode")
    ) {
      if (currentTheme !== "dark") {
        currentTheme = "dark";
        chrome.storage.local.set({ biliThemeMode: "dark" });
      }
    } else {
      if (currentTheme !== "light") {
        currentTheme = "light";
        chrome.storage.local.set({ biliThemeMode: "light" });
      }
    }
  }

  detectBiliTheme();

  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") {
        detectBiliTheme();
      }
    });
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  function markContent() {
    let newlyHiddenCount = 0;

    if (settings.adblockEnabled) {
      const adSelectors = [
        '.feed-card:not([data-ad-checked="true"])',
        '.bili-feed-card:not([data-ad-checked="true"])',
        '.video-card-ad-small:not([data-ad-checked="true"])',
        '.ad-report:not([data-ad-checked="true"])',
        '.recommended-swipe:not([data-ad-checked="true"])',
        '.video-resource-list:not([data-ad-checked="true"])',
        '.video-page-special-card-small:not([data-ad-checked="true"])',
        '.slide_ad:not([data-ad-checked="true"])',
        '.slide-ad-exp:not([data-ad-checked="true"])',
        '.video-page-game-card-small:not([data-ad-checked="true"])',
      ].join(", ");

      const adCards = document.querySelectorAll(adSelectors);

      adCards.forEach((card) => {
        const isDirectAd = card.matches(
          ".video-card-ad-small, .ad-report, .recommended-swipe, .video-resource-list, .video-page-special-card-small, .slide_ad, .slide-ad-exp, .video-page-game-card-small"
        );
        const isAdLink = card.querySelector('a[href*="cm.bilibili.com"]');
        const hasAdTarget = card.querySelector(
          '[data-target-url*="ad_source="]'
        );

        let isExplicitAdText = false;
        const statsNode = card.querySelector(".bili-video-card__stats--text");
        if (statsNode && statsNode.textContent.trim() === "广告") {
          isExplicitAdText = true;
        }

        if (isDirectAd || isAdLink || hasAdTarget || isExplicitAdText) {
          card.classList.add("bili-ad-dead");
          if (!card.dataset.hiddenCounted) {
            card.dataset.hiddenCounted = "true";
            newlyHiddenCount++;
          }
        }
        card.setAttribute("data-ad-checked", "true");
      });
    }

    const floorCards = document.querySelectorAll(
      ".floor-single-card:not([data-part-checked='true'])"
    );
    floorCards.forEach((card) => {
      const titleNode = card.querySelector(".floor-title");
      if (titleNode) {
        const titleText = titleNode.textContent.trim();
        const settingKey = partitionMap[titleText];

        if (settingKey && settings[settingKey]) {
          card.style.setProperty("display", "none", "important");
          if (!card.dataset.hiddenCounted) {
            card.dataset.hiddenCounted = "true";
            newlyHiddenCount++;
          }
        }
      }
      card.setAttribute("data-part-checked", "true");
    });

    const feedCards = document.querySelectorAll(
      ".feed-card:not([data-live-checked='true']), .bili-feed-card:not([data-live-checked='true'])"
    );
    feedCards.forEach((card) => {
      const liveIndicator = card.querySelector(
        ".bili-live-card__info--living__text"
      );

      if (liveIndicator && liveIndicator.textContent.trim() === "直播中") {
        if (settings.hideLive) {
          card.style.setProperty("display", "none", "important");
          if (!card.dataset.hiddenCounted) {
            card.dataset.hiddenCounted = "true";
            newlyHiddenCount++;
          }
        } else {
          if (!card.classList.contains("bili-ad-dead")) {
            card.style.removeProperty("display");
          }
        }
      }
      card.setAttribute("data-live-checked", "true");
    });

    const allCards = document.querySelectorAll(
      ".feed-card:not([data-bl-checked='true']), .bili-feed-card:not([data-bl-checked='true']), .bili-video-card:not([data-bl-checked='true']), .video-page-card-small:not([data-bl-checked='true'])"
    );
    allCards.forEach((card) => {
      const spaceLink = card.querySelector('a[href*="space.bilibili.com/"]');
      if (spaceLink) {
        const uidMatch = spaceLink.href.match(/space\.bilibili\.com\/(\d+)/);
        if (uidMatch && localBlacklist.includes(uidMatch[1])) {
          card.classList.add("bili-ad-dead");
          if (!card.dataset.hiddenCounted) {
            card.dataset.hiddenCounted = "true";
            newlyHiddenCount++;
          }
        }
      }
      card.setAttribute("data-bl-checked", "true");
    });

    const trendingElements = document.querySelectorAll(".trending");
    trendingElements.forEach((el) => {
      if (settings.hideTrending) {
        el.style.setProperty("display", "none", "important");
        if (!el.dataset.hiddenCounted) {
          el.dataset.hiddenCounted = "true";
          newlyHiddenCount++;
        }
      } else {
        el.style.removeProperty("display");
      }
    });

    if (newlyHiddenCount > 0) {
      chrome.storage.local.get(["totalHiddenCount"], (res) => {
        const currentCount = res.totalHiddenCount || 0;
        chrome.storage.local.set({
          totalHiddenCount: currentCount + newlyHiddenCount,
        });
      });
    }
  }

  const ipCache = {};

  window.addEventListener("message", function (event) {
    if (
      event.source === window &&
      event.data &&
      event.data.type === "BILI_IP_DATA"
    ) {
      Object.assign(ipCache, event.data.payload);
      if (settings.showIP) {
        renderIPs();
      }
    }
  });

  function deepQueryCommentRenderers() {
    const renderers = [];
    const queue = [document];

    while (queue.length > 0) {
      const root = queue.shift();

      const found = root.querySelectorAll(
        "bili-comment-renderer, bili-comment-reply-renderer"
      );
      found.forEach((r) => renderers.push(r));

      const customEls = root.querySelectorAll("*");
      for (let i = 0; i < customEls.length; i++) {
        const el = customEls[i];
        if (el.tagName.includes("-") && el.shadowRoot) {
          queue.push(el.shadowRoot);
        }
      }
    }
    return renderers;
  }

  function renderIPs() {
    if (!settings.showIP) return;

    const commentNodes = deepQueryCommentRenderers();

    commentNodes.forEach((node) => {
      if (!node.shadowRoot) return;

      const avatarNode = node.shadowRoot.querySelector("#user-avatar");
      if (!avatarNode) return;

      const mid = avatarNode.getAttribute("data-user-profile-id");
      if (!mid) return;

      const locationText = ipCache[mid];
      if (locationText) {
        const actionContainer = node.shadowRoot.querySelector(
          "bili-comment-action-buttons-renderer"
        );
        if (!actionContainer || !actionContainer.shadowRoot) return;

        const pubdateDiv = actionContainer.shadowRoot.querySelector("#pubdate");

        if (pubdateDiv && !pubdateDiv.querySelector(".bili-ip-reveal")) {
          const ipSpan = document.createElement("span");
          ipSpan.className = "bili-ip-reveal";
          ipSpan.innerHTML = `&nbsp;&nbsp;${locationText}`;
          pubdateDiv.appendChild(ipSpan);
        }
      }
    });
  }

  let rafId = null;
  const observer = new MutationObserver(() => {
    const anyFeatureEnabled = Object.values(settings).some(
      (val) => val === true
    );
    if (!anyFeatureEnabled) return;

    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      let frameWait = 0;
      function wait15Frames() {
        frameWait++;
        if (frameWait >= 15) {
          markContent();
          if (settings.showIP) renderIPs();
          rafId = null;
        } else {
          requestAnimationFrame(wait15Frames);
        }
      }
      wait15Frames();
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
