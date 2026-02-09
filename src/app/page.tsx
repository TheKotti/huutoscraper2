/* eslint-disable @next/next/no-img-element */
/* ^ This app is for local use, img bandwidth doesn't matter */
"use client";

import { useNextQueryParams } from "@/hooks/useNextQueryParams";
import { useCallback, useEffect, useState } from "react";
import moment from "moment";

export default function Home() {
  const { initialParams, updateParams } = useNextQueryParams({
    urls: "",
  });
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [urls, setUrls] = useState<string>(initialParams.get("urls") || "");
  const [scrapingStarted, setScrapingStarted] = useState(false);

  const scrape = useCallback(async () => {
    if (scrapingStarted) {
      console.info("Scraping...");
      const scraped = await fetch("/api/scraper", {
        method: "POST",
        body: JSON.stringify({ urls }),
      }).then((r) => r.json());

      const all: Auction[] = [];

      for (const value of Object.values(scraped)) {
        all.push(...(value as Auction[]));
      }

      setAuctions(all);
    }
  }, [scrapingStarted, urls]);

  const handleUrlChange = (value: string) => {
    setUrls(value);
    updateParams({ urls: value });
  };

  useEffect(() => {
    const runScrape = async () => {
      scrape();
    };

    runScrape();
    const intervalId = setInterval(() => {
      runScrape();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [scrape, urls]);

  return (
    <main className="hero bg-base-200 min-h-screen p-4">
      <div className="hero-content">
        <div className="">
          <h1 className="text-5xl font-bold mb-8">HuutoScraper</h1>
          <textarea
            rows={8}
            value={urls}
            className="bg-white text-black"
            onChange={(e) => handleUrlChange(e.target.value)}
          ></textarea>
          <p className="mb-6">
            <button
              className="cursor-pointer p-2 bg-blue-600 border border-blue-800"
              onClick={() => setScrapingStarted(true)}
            >
              Scrape
            </button>
          </p>

          <table>
            <tbody>
              {auctions
                .sort((a, b) => {
                  const ta = Math.floor(
                    new Date(a.timeStamp).getTime() / 60000,
                  );
                  const tb = Math.floor(
                    new Date(b.timeStamp).getTime() / 60000,
                  );
                  if (ta !== tb) return tb - ta;
                  return (a.title || "").localeCompare(b.title || "");
                })
                .map((x) => {
                  return (
                    <tr key={x.url} className="h-8">
                      <td className="px-3">
                        {moment(x.timeStamp).format("HH:mm")}
                      </td>
                      <td className="px-3">
                        <span className="flex w-4 items-center justify-center">
                          <img
                            className="max-h-5"
                            alt={x.category}
                            src={
                              x.category ? `/${x.category}.png` : "/other.png"
                            }
                          />
                        </span>
                      </td>
                      <td className="px-3 text-center text-nowrap">
                        {x.price}
                      </td>
                      <td className="px-3">
                        <a href={x.url} target="_blank">
                          {x.title}
                        </a>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
