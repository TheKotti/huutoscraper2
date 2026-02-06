import chromium from "@sparticuz/chromium-min";
import { NextRequest, NextResponse } from "next/server";
import {
  createNewPage,
  getHuutoData,
  getToriData,
} from "../../../../helpers/getPages";

// URL to the Chromium binary package hosted in /public, if not in production, use a fallback URL
// alternatively, you can host the chromium-pack.tar file elsewhere and update the URL below
const CHROMIUM_PACK_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/chromium-pack.tar`
  : "https://github.com/gabenunez/puppeteer-on-vercel/raw/refs/heads/main/example/chromium-dont-use-in-prod.tar";

// Cache the Chromium executable path to avoid re-downloading on subsequent requests
let cachedExecutablePath: string | null = null;
let downloadPromise: Promise<string> | null = null;

/**
 * Downloads and caches the Chromium executable path.
 * Uses a download promise to prevent concurrent downloads.
 */
async function getChromiumPath(): Promise<string> {
  // Return cached path if available
  if (cachedExecutablePath) return cachedExecutablePath;

  // Prevent concurrent downloads by reusing the same promise
  if (!downloadPromise) {
    const chromium = (await import("@sparticuz/chromium-min")).default;
    chromium.setGraphicsMode = false;
    downloadPromise = chromium
      .executablePath(CHROMIUM_PACK_URL)
      .then((path) => {
        cachedExecutablePath = path;
        console.log("Chromium path resolved:", path);
        return path;
      })
      .catch((error) => {
        console.error("Failed to get Chromium path:", error);
        downloadPromise = null; // Reset on error to allow retry
        throw error;
      });
  }

  return downloadPromise;
}

/**
 * API endpoint to scrape target urls
 */
export async function POST(req: NextRequest) {
  // Extract URL parameter from query string
  const reqData = await req.json();
  const urls: string[] = reqData.urls.split("\n");
  if (urls?.length === 0) {
    return new NextResponse("Please provide a URL.", { status: 400 });
  }

  let browser;

  try {
    // Configure browser based on environment
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer: any,
      launchOptions: any = {
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
      };

    if (isVercel) {
      // Vercel: Use puppeteer-core with downloaded Chromium binary
      puppeteer = await import("puppeteer-core");
      const executablePath = await getChromiumPath();

      launchOptions = {
        ...launchOptions,
        executablePath,
      };
      console.log("Launching browser with executable path:", executablePath);
    } else {
      // Local: Use regular puppeteer with bundled Chromium
      puppeteer = await import("puppeteer");
    }

    // Launch browser and capture screenshot
    browser = await puppeteer.launch(launchOptions);
    await delay(3000);

    const auctions: { [key: string]: Auction[] } = {};

    for (let currentURL of urls) {
      const page = await createNewPage(browser);
      const [url, category] = currentURL.split(";");

      (await page.goto(url), { waitUntil: "networkidle2" });
      await delay(3000);

      if (url.includes("tori.fi")) {
        const data = await getToriData(page, category);
        auctions[url] = data;
      } else if (url.includes("huuto.net")) {
        const data = await getHuutoData(page, category);
        auctions[url] = data;
      }
      await delay(3000);
    }

    // Return the auctions
    return Response.json(auctions);
  } catch (error) {
    console.error("Scraping error:", error);
    return new NextResponse("An error occurred while scarping auctions.", {
      status: 500,
    });
  } finally {
    // Always clean up browser resources
    if (browser) {
      await browser.close();
    }
  }
}

function delay(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
