import moment from "moment";
import { Moment } from "moment";
import { ElementHandle } from "puppeteer-core";

export const getToriTimeStamp = (timeText: string) => {
  const timeNumber = timeText.match(/\d+/)?.[0] || 1;
  const currentTime: Moment = moment().add(4, "h");

  if (timeText.includes("min")) {
    return currentTime.add(-timeNumber, "minute");
  } else if (timeText.includes("t")) {
    return currentTime.add(-timeNumber, "hour");
  } else {
    return currentTime;
  }
};

export const getText = async (sel: string, x: ElementHandle<Element>) => {
  const el = await x.$(sel);
  if (!el) return "";
  const txt = await el.evaluate((e: Element) => e.textContent?.trim() || "");
  return txt;
};

export const getHref = async (sel: string, x: ElementHandle<Element>) => {
  const el = await x.$(sel);
  if (!el) return "";
  const href = await el.evaluate((e: Element) => e.getAttribute("href") || "");
  return href;
};
