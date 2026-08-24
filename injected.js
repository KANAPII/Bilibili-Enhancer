(function () {
  function extractIPs(replies, ipMap) {
    if (!Array.isArray(replies)) return;

    replies.forEach((reply) => {
      if (
        reply.mid_str &&
        reply.reply_control &&
        reply.reply_control.location
      ) {
        const loc = reply.reply_control.location;
        if (loc.includes("IP属地")) {
          ipMap[reply.mid_str] = loc;
        }
      }
      if (reply.replies && Array.isArray(reply.replies)) {
        extractIPs(reply.replies, ipMap);
      }
    });
  }

  function processBiliResponse(data, type) {
    try {
      if (data && data.code === 0 && data.data) {
        const ipMap = {};

        if (data.data.replies) {
          extractIPs(data.data.replies, ipMap);
        }

        if (data.data.root) {
          extractIPs([data.data.root], ipMap);
        }

        if (data.data.top_replies) {
          extractIPs(data.data.top_replies, ipMap);
        }

        if (Object.keys(ipMap).length > 0) {
          window.postMessage(
            {
              type: "BILI_IP_DATA",
              payload: ipMap,
            },
            "*"
          );
        }
      }
    } catch (e) {
      console.error("IP_Reveal解析响应失败:", e);
    }
  }

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url =
      typeof args[0] === "string"
        ? args[0]
        : args[0] && args[0].url
        ? args[0].url
        : "";
    const requestPromise = originalFetch.apply(this, args);

    if (
      url.includes("/x/v2/reply/wbi/main") ||
      url.includes("/x/v2/reply/reply")
    ) {
      requestPromise
        .then((response) => {
          const clonedResponse = response.clone();
          clonedResponse
            .json()
            .then((data) => {
              const type = url.includes("/main") ? "main" : "reply";
              processBiliResponse(data, type);
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
    return requestPromise;
  };

  const originalXHR = window.XMLHttpRequest;
  const originalOpen = originalXHR.prototype.open;
  const originalSend = originalXHR.prototype.send;

  originalXHR.prototype.open = function (method, url) {
    this._bili_url = url;
    return originalOpen.apply(this, arguments);
  };

  originalXHR.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      if (
        this._bili_url &&
        (this._bili_url.includes("/x/v2/reply/wbi/main") ||
          this._bili_url.includes("/x/v2/reply/reply"))
      ) {
        try {
          const data = JSON.parse(this.responseText);
          const type = this._bili_url.includes("/main") ? "main" : "reply";
          processBiliResponse(data, type);
        } catch (e) {}
      }
    });
    return originalSend.apply(this, args);
  };
})();
