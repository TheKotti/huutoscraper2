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

  const goScraping = useCallback(async () => {
    console.log("click");
    const scraped = await fetch("/api/scraper", {
      method: "POST",
      body: JSON.stringify({ urls }),
    }).then((r) => r.json());

    const all: Auction[] = [];

    for (const value of Object.values(scraped)) {
      all.push(...(value as Auction[]));
    }

    setAuctions(all);
  }, [urls]);

  const handleUrlChange = (value: string) => {
    setUrls(value);
    updateParams({ urls: value });
  };

  useEffect(() => {
    const scrape = async () => {
      goScraping();
    };

    scrape();
    const intervalId = setInterval(() => {
      scrape();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [urls]);

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
              onClick={goScraping}
            >
              Scrape
            </button>
          </p>

          <table>
            <tbody>
              {auctions
                .sort((a, b) => (a.timeStamp < b.timeStamp ? 1 : -1))
                .map((x) => {
                  return (
                    <tr key={x.url} className="h-8">
                      <td className="px-3">
                        {moment(x.timeStamp).format("HH:mm")}
                      </td>
                      <td className="px-3 flex items-center justify-center">
                        <img className="max-h-5" src={`/${x.category}.png`} />
                      </td>
                      <td className="px-3 text-center">{x.price}</td>
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
