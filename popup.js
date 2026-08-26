document.addEventListener("DOMContentLoaded", () => {
  const settingsConfig = [
    { id: "showIP", title: "显示评论IP属地", default: true },
    { id: "autoPlayBlock", title: "拦截鼠标悬浮播放", default: true },
    { id: "quickBlock", title: "快速拉黑按钮", default: true },
    { id: "adblockEnabled", title: "隐藏广告", default: true },
    { id: "hideTrending", title: "隐藏热搜", default: true },
    //{ id: "hidePromo", title: "隐藏推广", default: true },
    { id: "hideLive", title: "隐藏直播推荐", default: true },
    { id: "hideGuochuang", title: "隐藏国创推荐", default: true },
    { id: "hideCourse", title: "隐藏课堂推荐", default: true },
    { id: "hideSports", title: "隐藏赛事推荐", default: true },
    { id: "hideVariety", title: "隐藏综艺推荐", default: true },
    { id: "hideTV", title: "隐藏电视剧推荐", default: true },
    { id: "hideDoc", title: "隐藏纪录片推荐", default: true },
    { id: "hideMovie", title: "隐藏电影推荐", default: true },
    { id: "hideComic", title: "隐藏漫画推荐", default: true },
    { id: "hideAnime", title: "隐藏番剧推荐", default: true },
  ];

  const container = document.getElementById("settings-container");

  const storageKeys = settingsConfig.map((item) => item.id);
  storageKeys.push("biliThemeMode");

  settingsConfig.forEach((item) => {
    const div = document.createElement("div");
    div.className = "setting-item";
    div.innerHTML = `
          <div class="setting-info">
            <span class="setting-title">${item.title}</span>
          </div>
          <label class="switch">
            <input type="checkbox" id="${item.id}" />
            <span class="slider"></span>
          </label>
        `;
    container.appendChild(div);
  });

  chrome.storage.local.get(storageKeys, (result) => {
    if (result.biliThemeMode === "dark") {
      document.documentElement.classList.add("dark-mode");
    } else {
      document.documentElement.classList.remove("dark-mode");
    }

    settingsConfig.forEach((item) => {
      const toggle = document.getElementById(item.id);
      if (toggle) {
        toggle.checked =
          result[item.id] !== undefined ? result[item.id] : item.default;

        toggle.addEventListener("change", (e) => {
          chrome.storage.local.set({ [item.id]: e.target.checked });
        });
      }
    });
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.biliThemeMode) {
      if (changes.biliThemeMode.newValue === "dark") {
        document.documentElement.classList.add("dark-mode");
      } else {
        document.documentElement.classList.remove("dark-mode");
      }
    }
  });

  function formatCount(num) {
    if (num >= 10000) return (num / 10000).toFixed(1).replace(/\.0$/, "") + "w";
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    return num.toString();
  }

  chrome.storage.local.get(["totalHiddenCount"], (res) => {
    const count = res.totalHiddenCount || 0;
    const displayEl = document.getElementById("block-count-display");
    if (displayEl) displayEl.textContent = formatCount(count);
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.totalHiddenCount) {
      const displayEl = document.getElementById("block-count-display");
      if (displayEl) {
        displayEl.textContent = formatCount(changes.totalHiddenCount.newValue);
      }
    }
  });
});
