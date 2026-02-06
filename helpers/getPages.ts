import { Browser, Page } from "puppeteer-core";
import { getHref, getText, getToriTimeStamp } from "./getFields";
import moment from "moment";

export async function createNewPage(browser: Browser) {
  const page = await browser.newPage();
  // Override fingerprint leaks before page loads
  await page.evaluateOnNewDocument(() => {
    // 1. Override navigator.webdriver (critical for Cloudflare)
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined, // Hide the webdriver flag
    });

    // 2. Add realistic navigator properties
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"], // Mimic real browser languages
    });
    Object.defineProperty(navigator, "platform", {
      get: () => "Win32", // Match Windows 10
    });
  });

  page.setJavaScriptEnabled(false);
  return page;
}

export async function getHuutoData(
  page: Page,
  category: string,
): Promise<Auction[]> {
  const itemList = await page.$$(".item-card-container");

  const filterResults = await Promise.all(
    itemList.map(async (x) => {
      const huutoBsCheck = await x.$eval(
        "a div div.item-card__header div.item-card__header-left div.item-card__title",
        (element) => element.innerHTML,
      );
      return !!huutoBsCheck;
    }),
  );

  const items = itemList.filter((_, i) => filterResults[i]);

  const itemsData = await Promise.all(
    items.map(async (x) => {
      const title = await getText(
        "a div div.item-card__header div.item-card__header-left div.item-card__title",
        x,
      );
      const href = await getHref(".item-card-link", x);
      const url = "https://www.huuto.net" + href;
      const timeText = await getText(
        "a > div > div.item-card__header > div.item-card__header-left > div.item-card__time > span > span",
        x,
      );
      const timeStamp = moment(timeText, "DD.MM.YYYY HH:mm");
      const price = await getText(
        "a div div.item-card__footer div.item-card__footer-column--right div.item-card__price",
        x,
      );

      return {
        title,
        url,
        timeStamp: timeStamp.toISOString(),
        price,
        category,
      };
    }),
  );

  return itemsData;
}

export async function getToriData(
  page: Page,
  category: string,
): Promise<Auction[]> {
  const itemList = await page.$$(".sf-search-ad");

  const filterResults = await Promise.all(
    itemList.map(async (x) => {
      const timeString = await x.$eval(
        ".s-text-subtle span:nth-child(2)",
        (element) => element.innerHTML,
      );
      return timeString?.includes("min") || timeString?.includes("t");
    }),
  );

  const items = itemList.filter((_, i) => filterResults[i]);

  const itemsData = await Promise.all(
    items.map(async (x) => {
      const title = await getText("div h2 a", x);
      const href = await getHref("div h2 a", x);
      const url = href;
      const timeText = await getText(".s-text-subtle span:nth-child(2)", x);
      const timeStamp = getToriTimeStamp(timeText);
      const price = await getText(".font-bold", x);

      return {
        title,
        url,
        timeStamp,
        price,
        category,
      };
    }),
  );

  return itemsData;
}
