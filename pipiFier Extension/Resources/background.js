browser.runtime.onInstalled.addListener(() => {
  console.log("PiPifier Extension Installed");
});

const iconUrl = chrome.runtime.getURL("PiP_Toolbar_Icon_white_new.svg");
const iconUrl = safari.extension.baseURI + "PiP_Toolbar_Icon_white_new.svg";
// You can now use this URL for setting an image, icon, etc.

// Optional: respond to browser action clicks
// (not needed if you're using a popup.html)
browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { action: "togglePiP" });
});
