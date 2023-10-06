(async function () {
  "use strict";

  console.log("timeline-sync: init");

  const originSetFunction = window.Lampa.Storage.set;
  window.Lampa.Storage.set = function (...args) {
    originSetFunction(...args);
    if (args[0] === "file_view") {
      window.dispatchEvent(new Event("timeline-sync"));
    }
  };

  const GIST_ID = "c57454b207a09b2c3b353ef504113097";
  const TOKEN = "11AFJGCGA0NChmW5zlPtbh_A5QWu6KXW1KsFzXFouxoQpXMFh6yl6hVoFQGjxTXQLCZ7LHNK6AZm9y3qJ5";

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

  const gistContent = await getGistContent();

  const lastSyncTime = localStorage.getItem("last-sync-time");
  if (!lastSyncTime || Number(lastSyncTime) < gistContent.time) {
    localStorage.setItem("file_view", JSON.stringify(gistContent.data));
    localStorage.setItem("last-sync-time", Date.now());
  } else {
    const storageData = localStorage.getItem("file_view");
    if (storageData) {
      patchGistContent(JSON.parse(storageData));
      localStorage.setItem("last-sync-time", Date.now());
    }
  }

  window.addEventListener("timeline-sync", async (event) => {
    console.log("timeline-sync: sync", event);
    const storageData = localStorage.getItem("file_view");
    if (storageData) {
      patchGistContent(JSON.parse(storageData));
      localStorage.setItem("last-sync-time", Date.now());
    }
  });
})();
