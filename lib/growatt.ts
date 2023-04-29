import {
  Cookie,
  CookieJar,
  wrapFetch,
} from "https://deno.land/x/another_cookiejar@v5.0.3/mod.ts";
import {
  RawPlantDevices,
  RawPlantList,
  RawStorageStatusData,
} from "./types.ts";
import { fixObjectProps, sleep } from "./utils.ts";

type Credentials = Record<"username" | "password", string>;

type Options = {
  cookiesFile: string;
  logPath: string;
};

const numFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "exceptZero",
});
const encoder = new TextEncoder();

const LOGIN_PATH = "/login";
const COOKIES_FILE = "./cookies.json";
const LOG_PATH = "./";

class Growatt {
  baseURL = "https://server.growatt.com";

  credentials!: Credentials;
  options!: Options;

  cookieJar!: CookieJar;
  cookieFetch!: typeof fetch;
  serializedCookies?: string;

  constructor(credentials: Credentials, options: Partial<Options> = {}) {
    this.credentials = credentials;
    const cookieJar = (this.cookieJar = new CookieJar());
    this.cookieFetch = wrapFetch({ cookieJar });
    this.options = {
      cookiesFile: COOKIES_FILE,
      logPath: LOG_PATH,
      ...options,
    };
  }

  async start() {
    console.log(
      'Using cookies file "%s". Saving logs to "%s"',
      this.options.cookiesFile,
      this.options.logPath
    );

    try {
      this.serializedCookies = await Deno.readTextFile(
        this.options.cookiesFile
      );
      const cookies: Cookie[] = JSON.parse(this.serializedCookies);
      this.cookieJar.replaceCookies(cookies);
      console.log("loaded %d cookies", cookies.length);
    } catch (e) {
      console.error(
        "could not load cookies, probably first time? Error:",
        e?.message || e
      );
    }

    const plants = await this.getPlantList();
    const plantsDevices = await Promise.all(
      plants.map((p) => this.getPlantDevices(p.id))
    );

    const totalDevices = plantsDevices.reduce((p1, p2) => p1 + p2.length, 0);
    console.log("got %d plants with %d devices", plants.length, totalDevices);

    let deviceCounter = 0;
    plants.forEach((plant, i) => {
      console.log(
        "🏠 %s (#%d, GMT%s)",
        plant.plantName,
        plant.id,
        numFormatter.format(plant.timezone)
      );
      plantsDevices[i]?.forEach((device) => {
        console.log(
          "  🔌 %s [%s] 🛜 %s [%s]",
          device.sn === device.alias
            ? device.deviceModel
            : `${device.alias} (${device.deviceModel})`,
          device.sn,
          device.datalogTypeTest,
          device.datalogSn
        );
        sleep(deviceCounter++ * (60e3 / totalDevices)).then(() =>
          this.monitorStorage(plant.id, device.sn)
        );
      });
    });
  }

  async login() {
    console.log("logging in as %s/%s", this.credentials.username, "xxx");

    const { json } = await this.fetch<{ result: number }>(LOGIN_PATH, {
      account: this.credentials.username,
      password: this.credentials.password,
      validateCode: "",
      isReadPact: "0",
    });

    if (json.result === -2) throw new Error("Bad username/password!");
    if (json.result !== 1) throw new Error("Unknown Error!");
  }

  async monitorStorage(plantId: number, storageSn: string, every = 60) {
    const file = await Deno.open(`${this.options.logPath}/${storageSn}.jsons`, {
      append: true,
      write: true,
      create: true,
    });
    const started = Date.now();
    let prevText = "";
    for (let i = 1; ; i++) {
      const { calculated, ...storageData } = await this.getStorageStatusData(
        plantId,
        storageSn
      );
      const now = new Date();
      const shortNowString = now.toISOString().substring(5, 19);
      if (prevText === calculated.text) {
        // don't output again if status has not changed!
        // just inform that status is still current!
        Deno.stdout.write(encoder.encode(`... ${shortNowString}...\r`));
      } else {
        const estimatedTimeRemaining = new Date(
          calculated.secondsRemaining * 1e3 + 86400e3 * 9
        );
        console.log(
          "[%s] %s ℹ️ %d/%d 🔋%s%sw: %fw/%fva (%f% / %f%, %sw) . %f% (~%s)",
          storageSn,
          shortNowString,
          storageData.status,
          storageData.invStatus,
          storageData.batPower < 0 ? "🔌" : "⚡",
          numFormatter.format(-storageData.batPower),
          storageData.loadPower,
          storageData.rateVA,
          storageData.loadPrecent,
          calculated.batteryPercentLoad,
          numFormatter.format(-calculated.loss),
          storageData.capacity,
          isNaN(estimatedTimeRemaining.valueOf())
            ? "!"
            : estimatedTimeRemaining
                .toISOString()
                .substring(9, 19)
                .replace(/^0T/, "")
                .replace("T", " days ")
        );
      }
      const shouldGetNextAt = started + i * every * 1e3;
      file.write(
        encoder.encode(
          JSON.stringify({
            _date: now,
            ...storageData,
          }) + "\n"
        )
      );

      prevText = calculated.text;
      await sleep(shouldGetNextAt - now.valueOf());
    }
  }

  async getStorageStatusData(plantId: number, storageSn: string) {
    const { json, text } = await this.fetch<RawStorageStatusData>(
      `/panel/storage/getStorageStatusData?plantId=${plantId}`,
      { storageSn }
    );

    const data = fixObjectProps(
      json.obj,
      Object.keys(json.obj) as (keyof typeof json.obj)[],
      []
    );

    const secondsRemaining =
      (((data.capacity - 21) * 87) / data.batPower) * 3600;

    return {
      ...data,
      // FIXME This has assumptions that do not hold for all systems
      calculated: {
        batteryPercentLoad: data.batPower / 50,
        loss: data.batPower - data.loadPower,
        secondsRemaining,
        text,
      },
    };
  }

  async getPlantList() {
    const rawPlantList = await this.fetch<RawPlantList>(
      "/index/getPlantListTitle"
    );
    return rawPlantList.json.map((r) => fixObjectProps(r, ["id", "timezone"]));
  }

  async getPlantDevices(plantId: number) {
    const devices = await this.fetch<RawPlantDevices>(
      "/panel/getDevicesByPlantList",
      {
        currPage: "1",
        plantId: plantId.toString(),
      }
    ).then(
      ({
        json: {
          obj: { datas },
        },
      }) =>
        datas.map((d) =>
          fixObjectProps(
            d,
            [
              "deviceType",
              "ptoStatus",
              "timezone",
              "plantId",
              "nominalPower",
              "bdcStatus",
              "eToday",
              "eMonth",
              "eTotal",
              "pac",
              "status",
            ],
            ["timeServer", "lastUpdateTime"]
          )
        )
    );

    return devices;
  }

  async fetch<T = unknown>(
    path: `/${string}`,
    body?: Record<string, string> | string,
    init?: RequestInit
  ): Promise<{ text: string; json: T; response: Response }> {
    if (!path.startsWith("/")) throw new Error("path should start with /");
    const requestInit = {
      method: body ? "POST" : "GET",
      body: !body
        ? undefined
        : typeof body === "string"
        ? body
        : new URLSearchParams(Object.entries(body)),
      redirect: "manual",
      ...init,
    } satisfies RequestInit;

    // Deno.stdout.write(encoder.encode(`${requestInit.method} ${path}... `));

    const response = await this.cookieFetch(
      `${this.baseURL}${path}`,
      requestInit
    );

    // console.log(response.status);

    if (
      response.status === 302 &&
      response.headers.get("location")?.includes("errorNoLogin")
    ) {
      console.log("seems like we need to log in again!");
      await this.login();
      return this.fetch(path, body, init);
    } else if (response.status === 500) {
      console.info("retrying request...");
      await sleep(Math.random() * 5e3 + 1e3); // between 1s and 6s
      return this.fetch(path, body, init);
    } else if (response.status !== 200) {
      console.error("Non-200 response", path, response);
    }

    this.persistCookies();

    const text = await response.text();
    const json: T = JSON.parse(text);

    return { text, json, response };
  }

  persistCookies() {
    const serializedCookies = JSON.stringify(this.cookieJar.cookies);
    if (serializedCookies === this.serializedCookies) return;

    this.serializedCookies = serializedCookies;
    Deno.writeTextFile(this.options.cookiesFile, serializedCookies);
  }
}

export default Growatt;
