#!/usr/bin/env -S deno run --allow-env=GRTPWD --allow-read=./ --allow-write=./ --allow-net=server.growatt.com:443

import Growatt from "./lib/growatt.ts";

const username = Deno.args[0];
const password = Deno.env.get("GRTPWD");
if (!username || !password) {
  console.error(
    "Usage: GRTPWD=password ./%s username",
    import.meta.url.split("/").pop()
  );
  Deno.exit(1);
}

const gw = new Growatt(
  {
    username,
    password,
  },
  {
    cookiesFile: "./run/cookies.json",
    logPath: "./log/",
  }
);

gw.start();
