import { DateTimeFormatter } from "https://deno.land/std@0.125.0/datetime/formatter.ts";

export const fixObjectProps = <
  TObj extends Record<string, string>,
  TNumProps extends (keyof TObj)[],
  TDateProps extends (keyof TObj)[]
>(
  object: TObj,
  numericalProps: TNumProps,
  dateProps?: TDateProps
) => ({
  ...(object as Record<
    Exclude<keyof TObj, TNumProps[number] | TDateProps[number]>,
    string
  >),
  ...(Object.fromEntries(
    Object.entries(object)
      .filter(([key]) => numericalProps.includes(key))
      .map(([key, value]) => [key, parseFloat(value)])
  ) as Record<TNumProps[number], number>),
  ...(Object.fromEntries(
    Object.entries(object)
      .filter(([key]) => dateProps?.includes(key))
      .map(([key, value]) => [key, new Date(value)])
  ) as Record<TDateProps[number], Date>),
});

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const numFormatter = new Intl.NumberFormat("en-US", {
  signDisplay: "exceptZero",
});
export const dateFormatter = new DateTimeFormatter("MM/dd HH:mm:ss");
export const textEncoder = new TextEncoder();
