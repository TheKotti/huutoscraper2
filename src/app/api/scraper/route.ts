import { NextRequest, NextResponse } from "next/server";
import {
  createNewPage,
  getHuutoData,
  getToriData,
} from "../../../../helpers/getPages";

/**
 * API endpoint to scrape target urls
 */
export async function POST(req: NextRequest) {
  // Extract URL parameter from query string
  const reqData = await req.json();
  if (reqData.urls.length === 0) {
    return new NextResponse("Please provide a URL.", { status: 400 });
  }

  const urls: string[] = reqData.urls.split("\n");

  let browser;

  try {
    // Local: Use regular puppeteer with bundled Chromium
    const puppeteer = await import("puppeteer");
    // Launch browser
    browser = await puppeteer.launch({
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
    });

    const auctions: { [key: string]: Auction[] } = {};

    for (const currentURL of urls) {
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
