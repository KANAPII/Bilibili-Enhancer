(function () {
  let quickBlockEnabled = true;

  chrome.storage.local.get(["quickBlock"], (result) => {
    if (result.quickBlock !== undefined) {
      quickBlockEnabled = result.quickBlock;
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.quickBlock !== undefined) {
      quickBlockEnabled = changes.quickBlock.newValue;
    }
  });

  const styleEl = document.createElement("style");
  styleEl.innerHTML = `
          .bili-quick-block--wrap {
              display: none !important;
              align-items: center;
              justify-content: center;
              position: absolute;
              top: 40px; 
              right: 8px;
              width: 28px;
              height: 28px;
              z-index: 100;
              cursor: pointer;
              background-color: rgba(33,33,33,.8);
              border-radius: 6px;
              transition: background-color 0.2s;
          }
    
          .pic-box .bili-quick-block--wrap {
              right: 6px !important;
          }
            
          .bili-quick-block--wrap img {
              width: 18px;
              height: 18px;
          }
          
          .bili-video-card__image--wrap:hover .bili-quick-block--wrap,
          .bili-video-card__cover:hover .bili-quick-block--wrap,
          .bili-cover-card:hover .bili-quick-block--wrap,
          .top-video__cover:hover .bili-quick-block--wrap,
          .pic-box:hover .bili-quick-block--wrap {
              display: flex !important;
          }
        `;
  document.documentElement.appendChild(styleEl);

  function renderQuickBlockButtons() {
    if (!quickBlockEnabled) return;

    const covers = document.querySelectorAll(
      ".bili-video-card__image--wrap, .top-video__cover, .pic-box"
    );

    covers.forEach((cover) => {
      if (cover.classList.contains("pic-box")) {
        const hasWatchLater = cover.querySelector(
          ".watch-later-video, .van-watchlater, .bili-watch-later"
        );
        if (!hasWatchLater) {
          return;
        }
      }

      if (
        cover.parentElement &&
        cover.parentElement.closest(
          ".bili-video-card__image--wrap, .bili-video-card__cover, .top-video__cover, .pic-box"
        )
      ) {
        return;
      }

      if (cover.querySelector(".bili-quick-block--wrap")) return;

      const blockBtn = document.createElement("div");
      blockBtn.className = "bili-quick-block--wrap";
      blockBtn.title = "一键拉黑";

      const icon = document.createElement("img");
      icon.src = chrome.runtime.getURL("block.png");
      blockBtn.appendChild(icon);

      blockBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        let fullCard =
          cover.closest(".feed-card") || cover.closest(".bili-feed-card");
        if (!fullCard) {
          fullCard = cover.closest(
            ".bili-video-card, .v-recommend-inline-player, .bili-live-card, .video-page-card-small"
          );
        }

        if (!fullCard) return;

        const spaceLink = fullCard.querySelector(
          'a[href*="space.bilibili.com/"]'
        );
        if (!spaceLink) {
          alert("拉黑失败：解析UID失败");
          return;
        }

        const uidMatch = spaceLink.href.match(/space\.bilibili\.com\/(\d+)/);
        if (!uidMatch) return;
        const fid = uidMatch[1];

        const csrfMatch = document.cookie.match(/bili_jct=([^;]+)/);
        const csrf = csrfMatch ? csrfMatch[1] : null;
        if (!csrf) {
          alert("拉黑失败：未获取到安全令牌");
          return;
        }

        const url =
          "https://api.bilibili.com/x/relation/modify?statistics=%7B%22appId%22:100,%22platform%22:5%7D";
        const params = new URLSearchParams({
          fid: fid,
          act: 5,
          re_src: 11,
          gaia_source: "web_main",
          spmid: "333.1387.0.0",
          extend_content: JSON.stringify({
            entity: "user",
            entity_id: parseInt(fid),
          }),
          csrf: csrf,
        });

        blockBtn.style.opacity = "0.4";

        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            credentials: "include",
            body: params.toString(),
          });
          const data = await res.json();

          if (data.code === 0) {
            fullCard.classList.add("bili-ad-dead");

            chrome.storage.local.get(["localBlacklist"], (res) => {
              let list = res.localBlacklist || [];
              if (!list.includes(fid)) {
                list.push(fid);
                chrome.storage.local.set({ localBlacklist: list });
              }
            });
          } else {
            alert(`拉黑失败: ${data.message}`);
            blockBtn.style.opacity = "1";
          }
        } catch (err) {
          alert("拉黑失败：网络请求异常");
          blockBtn.style.opacity = "1";
        }
      });

      cover.appendChild(blockBtn);
    });
  }

  let rafId = null;
  const observer = new MutationObserver(() => {
    if (!quickBlockEnabled) return;

    if (rafId) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      let frameWait = 0;
      function wait15Frames() {
        frameWait++;
        if (frameWait >= 15) {
          renderQuickBlockButtons();
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
