(async function () {
  "use strict";

  const GIST_ID = "c57454b207a09b2c3b353ef504113097";
  const TOKEN = "11AFJGCGA0p102BRJZqeG3_1CpaQovpKiJNkZQwabi0LUPhQDnrzxgjxVA7oEw1cE5SW6NUUBTRa2Ug7xL";

  console.log("timeline-sync:initialization");

  const originSetFunction = window.Lampa.Storage.set;
  window.Lampa.Storage.set = function (...args) {
    originSetFunction(...args);
    if (args[0] === "file_view_27689") {
      localStorage.setItem("timeline-sync:time", Date.now());
      window.dispatchEvent(new Event("timeline-sync"));
    }
  };

  async function getGistContent() {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "get",
      headers: {
        Authorization: `Bearer github_pat_${TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    const gist = await res.json();
    if (!gist.files) {
      throw new Error(gist.message || "Incorrect gist");
    }
    const file = gist.files["lampa-timeline-sync.json"];
    if (!file) {
      throw new Error("File not found");
    }
    const fileJson = JSON.parse(file.content);
    return fileJson;
  }

  async function patchGistContent(data) {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer github_pat_${TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        files: {
          "lampa-timeline-sync.json": {
            content: JSON.stringify({
              time: Date.now(),
              data,
            }),
          },
        },
      }),
    });
    const json = await res.json();
    return json;
  }

  async function sync() {
    const gistContent = await getGistContent();
    const storageData = localStorage.getItem("file_view_27689") || "{}";
    const storageTime = localStorage.getItem("timeline-sync:time") || "0";
    let data = {};
    if (Number(storageTime) > gistContent.time) {
      data = { ...gistContent.data, ...JSON.parse(storageData) };
    } else {
      data = { ...JSON.parse(storageData), ...gistContent.data };
    }
    localStorage.setItem("file_view_27689", JSON.stringify(data));
    await patchGistContent(data);
  }

  console.log("timeline-sync:initial-sync");
  await sync();

  window.addEventListener("timeline-sync", async (event) => {
    console.log("timeline-sync:sync", event);
    sync();
  });

  setInterval(() => {
    console.log("timeline-sync:background-sync");
    sync();
  }, 1024 * 60 * 5);
})();
