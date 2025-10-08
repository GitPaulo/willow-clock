#!/usr/bin/env node
// outputs JSON:
// {"playing":true,"sources":["chromium","spotify"]}

import { Message } from "dbus-next";

async function getMediaState() {
  const dbus = await import("dbus-next");
  const bus = dbus.sessionBus();

  const msg = new Message({
    destination: "org.freedesktop.DBus",
    path: "/org/freedesktop/DBus",
    interface: "org.freedesktop.DBus",
    member: "ListNames",
  });

  const result = { playing: false, sources: [] };

  try {
    const reply = await bus.call(msg);
    const names = reply.body[0];
    const players = names.filter((n) => n.startsWith("org.mpris.MediaPlayer2."));

    for (const name of players) {
      const appName = name.replace("org.mpris.MediaPlayer2.", "");
      try {
        // Get playback status
        const getMsg = new Message({
          destination: name,
          path: "/org/mpris/MediaPlayer2",
          interface: "org.freedesktop.DBus.Properties",
          member: "Get",
          signature: "ss",
          body: ["org.mpris.MediaPlayer2.Player", "PlaybackStatus"],
        });

        const resp = await bus.call(getMsg);
        const status = resp.body[0].value;
        if (status === "Playing") {
          result.playing = true;
          result.sources.push(appName);
        }
      } catch (err) {
        // ignore unresponsive players
      }
    }
  } catch (err) {
    result.error = err.message;
  } finally {
    // Close the D-Bus connection to allow the process to exit
    bus.disconnect();
  }

  return result;
}

(async () => {
  const state = await getMediaState();
  console.log(JSON.stringify(state));
})();
