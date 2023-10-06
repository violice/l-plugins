(async function () {
  "use strict";

  const GIST_ID = "c57454b207a09b2c3b353ef504113097";
  const TOKEN = "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";

  async function getGistContent () {
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`);
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
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${TOKEN}`,
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
    patchGistContent(storageData);
    localStorage.setItem("last-sync-time", Date.now());
  }

  window.addEventListener("storage", async (event) => {
    console.log("STORAGE_EVENT", e);
    if (event.key === "file_view") {
      const storageData = localStorage.getItem("file_view");
      patchGistContent(storageData);
      localStorage.setItem("last-sync-time", Date.now());
    }
  });
})();
