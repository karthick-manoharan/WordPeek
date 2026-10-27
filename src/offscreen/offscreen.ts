chrome.runtime.onMessage.addListener((message: { type: string; url?: string }) => {
  if (message.type === "PLAY_AUDIO_OFFSCREEN" && message.url) {
    new Audio(message.url).play().catch(() => {
      // audio failed silently
    });
  }
});
