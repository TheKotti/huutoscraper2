import chromium from "@sparticuz/chromium-min";
import { NextResponse } from "next/server";
import puppeteer, { Page } from "puppeteer-core";
import {
  createNewPage,
  getHuutoData,
  getToriData,
} from "../../../../helpers/getPages";

chromium.setGraphicsMode = false;

const remoteExecutablePath =
  "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";
let browser;

export async function POST(req: Request) {
  const reqData = await req.json();
  const urls = reqData.urls.split("\n");

  // Optional: Load any fonts you need.
  await chromium.font(
    "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf",
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
      process.env.CHROME_EXECUTABLE_PATH ||
      (await chromium.executablePath(remoteExecutablePath)),
  });

  const res: any = {};
  const auctions: { [key: string]: Auction[] } = {};

  let currentURL;

  for (currentURL of urls) {
    const page = await createNewPage(browser);
    const [url, category] = currentURL.split(";");

    await page.goto(url);

    if (url.includes("tori.fi")) {
      const data = await getToriData(page, category);
      auctions[url] = data;
    } else if (url.includes("huuto.net")) {
      const data = await getHuutoData(page, category);
      auctions[url] = data;
    }
  }

  await browser.close();

  /* const sorted = auctions.sort((a: Auction, b: Auction) =>
    a.timeStamp.isBefore(b.timeStamp) ? 1 : -1
  ); */

  return Response.json(auctions);
}

async function returnScreenshot(page: Page) {
  await page.goto(
    "https://www.huuto.net/haku/sellernro_not/132641-2301946-1645317-2073413-2479878-2607731-1164405-25199-1645354-1532155/sort/newest/category/463",
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
