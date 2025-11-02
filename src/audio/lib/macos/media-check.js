#!/usr/bin/env osascript -l JavaScript

function run() {
  const result = {
    playing: false,
    sources: []
  };

  const systemEvents = Application('System Events');
  const processes = systemEvents.processes.whose({ backgroundOnly: false }).name();

  // Check Music app
  if (processes.includes('Music')) {
    try {
      const music = Application('Music');
      if (music.playerState() === 'playing') {
        result.playing = true;
        result.sources.push('Music');
      }
    } catch (e) { }
  }

  // Check Spotify
  if (processes.includes('Spotify')) {
    try {
      const spotify = Application('Spotify');
      if (spotify.playerState() === 'playing') {
        result.playing = true;
        result.sources.push('Spotify');
      }
    } catch (e) { }
  }

  // Note: VLC and browser detection removed
  // - VLC doesn't have reliable AppleScript support for playback state
  // - Browsers can't reliably report if media is actually playing via JXA
  // - This prevents false positives when tabs are open but not playing
  // For comprehensive browser detection, use Windows/Linux implementations

  return JSON.stringify(result);
}
