document.getElementById('togglePiP').addEventListener('click', async () => {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, { action: "togglePiP" });
    }
  } catch (error) {
    console.error("Failed to send PiP message:", error);
  }
});
