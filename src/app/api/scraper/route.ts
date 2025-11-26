import chromium from "@sparticuz/chromium-min";
import moment from "moment";
import { Moment } from "moment";
import { NextResponse } from "next/server";
import puppeteer, { Browser, ElementHandle, Page } from "puppeteer-core";

chromium.setGraphicsMode = false;

type Auction = {
  title: string;
  url: string;
  timeStamp: Moment;
  price: string;
  category: string;
};

export async function POST(req: Request) {
  const reqData = await req.json();
  const urls = reqData.urls.split("\n");

  // Optional: Load any fonts you need.
  await chromium.font(
    "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf"
  );

  const browser = await puppeteer.launch({
    headless: true, // Use Chrome's new headless mode (harder to detect)
    args: [
      "--disable-blink-features=AutomationControlled", // Critical: Hides automation flag
      "--no-sandbox", // Required for environments without Chrome sandbox (e.g., Docker)
      "--disable-setuid-sandbox",
      "--window-size=1920,1080", // Realistic viewport
      "--lang=fi-FI",
      "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    ],
    defaultViewport: { width: 1920, height: 1080 }, // Match window size
    executablePath:
      process.env.CHROME_EXECUTABLE_PATH || (await chromium.executablePath()),
  });

  const res: any = {};
  const auctions: any = [];

  let currentURL;

  for (currentURL of urls) {
    const page = await createNewPage(browser);
    const [url, category] = currentURL.split(";");

    await page.goto(url);

    if (url.includes("tori.fi")) {
      const data = await getToriData(page, category);
      auctions.push(...data);
    } else if (url.includes("huuto.net")) {
      const data = await getHuutoData(page, category);
      auctions.push(...data);
    }

    const pageTitle = await page.title();
    res[url.slice(10, 20)] = pageTitle;
  }

  await browser.close();

  const sorted = auctions.sort((a: Auction, b: Auction) =>
    a.timeStamp.isBefore(b.timeStamp) ? 1 : -1
  );

  console.log(sorted);
  return Response.json({
    res,
    auctions: sorted,
  });
}

const getToriTimeStamp = (timeText: string) => {
  const timeNumber = timeText.match(/\d+/)?.[0] || 1;
  const currentTime: Moment = moment();

  if (timeText.includes("min")) {
    return currentTime.add(-timeNumber, "minute");
  } else if (timeText.includes("t")) {
    return currentTime.add(-timeNumber, "hour");
  } else {
    return currentTime;
  }
};

async function getHuutoData(page: Page, category: string): Promise<Auction[]> {
  const itemList = await page.$$(".item-card-container");
  console.log(itemList.length);

  const filterResults = await Promise.all(
    itemList.map(async (x) => {
      const huutoBsCheck = await x.$eval(
        "a div div.item-card__header div.item-card__header-left div.item-card__title",
        (element) => element.innerHTML
      );
      return !!huutoBsCheck;
    })
  );

  const items = itemList.filter((_, i) => filterResults[i]);

  const itemsData = await Promise.all(
    items.map(async (x) => {
      const title = await getText(
        "a div div.item-card__header div.item-card__header-left div.item-card__title",
        x
      );
      const href = await getHref(".item-card-link", x);
      const url = "https://www.huuto.net" + href;
      const timeText = await getText(
        "a > div > div.item-card__header > div.item-card__header-left > div.item-card__time > span > span",
        x
      );
      const timeStamp = moment(timeText, "DD.MM.YYYY HH:mm").add(2, "h");
      const price = await getText(
        "a div div.item-card__footer div.item-card__footer-column--right div.item-card__price",
        x
      );

      return {
        title,
        url,
        timeStamp,
        price,
        category,
      };
    })
  );

  return itemsData;
}

async function getToriData(page: Page, category: string): Promise<Auction[]> {
  const itemList = await page.$$(".sf-search-ad");

  const filterResults = await Promise.all(
    itemList.map(async (x) => {
      const timeString = await x.$eval(
        ".s-text-subtle > span:nth-child(2)",
        (element) => element.innerHTML
      );
      return timeString?.includes("min") || timeString?.includes("t");
    })
  );

  const items = itemList.filter((_, i) => filterResults[i]);

  const itemsData = await Promise.all(
    items.map(async (x) => {
      const title = await getText("div h2 a", x);
      const href = await getHref("div h2 a", x);
      const url = href;
      const timeText = await getText(".s-text-subtle span", x);
      const timeStamp = getToriTimeStamp(timeText);
      const price = await getText(".font-bold", x);

      return {
        title,
        url,
        timeStamp,
        price,
        category,
      };
    })
  );

  return itemsData;
}

const getText = async (sel: string, x: ElementHandle<Element>) => {
  const el = await x.$(sel);
  if (!el) return "";
  const txt = await el.evaluate((e: Element) => e.textContent?.trim() || "");
  return txt;
};

const getHref = async (sel: string, x: ElementHandle<Element>) => {
  const el = await x.$(sel);
  if (!el) return "";
  const href = await el.evaluate((e: Element) => e.getAttribute("href") || "");
  return href;
};

async function createNewPage(browser: Browser) {
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

async function returnScreenshot(page: Page) {
  await page.goto(
    "https://www.huuto.net/haku/sellernro_not/132641-2301946-1645317-2073413-2479878-2607731-1164405-25199-1645354-1532155/sort/newest/category/463"
  );
  const screenshot: Uint8Array<ArrayBufferLike> = await page.screenshot();
  const buffer = Buffer.from(screenshot);
  const ssBlob = new Blob([buffer], { type: "image/png" });
  const response = new NextResponse(ssBlob, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": "inline; filename=screenshot.png",
    },
    status: 200,
  });

  return response;
}
