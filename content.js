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
  };

  function toggleCSS(enabled) {
    if (enabled) {
      document.documentElement.classList.add("adblock-active");
    } else {
      document.documentElement.classList.remove("adblock-active");
    }
  }

  chrome.storage.local.get(Object.keys(settings), (result) => {
    for (const key in result) {
      if (result[key] !== undefined) {
        settings[key] = result[key];
      }
    }
    toggleCSS(settings.adblockEnabled);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local") {
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
    if (settings.adblockEnabled) {
      const adCards = document.querySelectorAll(
        '.feed-card:not([data-ad-checked="true"]), .bili-feed-card:not([data-ad-checked="true"])'
      );

      adCards.forEach((card) => {
        const isAdLink = card.querySelector('a[href*="cm.bilibili.com"]');
        const hasAdTarget = card.querySelector(
          '[data-target-url*="ad_source="]'
        );

        let isExplicitAdText = false;
        const statsNode = card.querySelector(".bili-video-card__stats--text");
        if (statsNode && statsNode.textContent.trim() === "广告") {
          isExplicitAdText = true;
        }

        if (isAdLink || hasAdTarget || isExplicitAdText) {
          card.classList.add("bili-ad-dead");
          card.setAttribute("data-ad-checked", "true");
        } else {
          card.setAttribute("data-ad-checked", "true");
        }
      });
    }

    const floorCards = document.querySelectorAll(".floor-single-card");
    floorCards.forEach((card) => {
      const titleNode = card.querySelector(".floor-title");
      if (titleNode) {
        const titleText = titleNode.textContent.trim();
        const settingKey = partitionMap[titleText];

        if (settingKey && settings[settingKey]) {
          card.style.setProperty("display", "none", "important");
        } else {
          card.style.removeProperty("display");
        }
      }
    });
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
