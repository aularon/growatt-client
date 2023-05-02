import { DateTimeFormatter } from "https://deno.land/std@0.125.0/datetime/formatter.ts";
import { textEncoder } from "./utils.ts";

export const openLogFile = (path: string) =>
  Deno.open(path, {
    append: true,
    write: true,
    create: true,
  });

export const dayFormatter = new DateTimeFormatter("yyyy-MM-dd");

export const openRotatingLogFile = (path: `${string}{date}.jsons`) => {
  let file: Deno.FsFile;
  let previousDay: string;
  return async function log(record: { _date: Date }) {
    const newDay = dayFormatter.format(record._date);
    if (newDay !== previousDay || !file) {
      // need to rotate!
      console.log("rotating file %s: < %s > %s 📅", path, previousDay, newDay);
      if (file) file.close();
      file = await openLogFile(path.replace("{date}", newDay));
    }
    previousDay = newDay;
    return file.write(textEncoder.encode(JSON.stringify(record) + "\n"));
  };
};
