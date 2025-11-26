"use client";

import { useNextQueryParams } from "@/hooks/useNextQueryParams";
import { useCallback, useEffect, useState } from "react";
import moment from "moment";

export default function Home() {
  const { initialParams, updateParams } = useNextQueryParams({
    urls: "",
  });
  const [result, setResult] = useState<object>();
  const [urls, setUrls] = useState<string>(initialParams.get("urls") || "");

  const goScraping = useCallback(async () => {
    console.log("click");
    setResult({ loading: true });
    const scraped = await fetch("/api/scraper", {
      method: "POST",
      body: JSON.stringify({ urls }),
    }).then((r) => r.json());
    console.log(scraped);
    setResult(scraped);
  }, [urls]);

  const handleUrlChange = (value: string) => {
    setUrls(value);
    updateParams({ urls: value });
  };

  useEffect(() => {
    const scrape = async () => {
      console.log("click");
      setResult({ loading: true });
      const scraped = await fetch("/api/scraper", {
        method: "POST",
        body: JSON.stringify({ urls }),
      }).then((r) => r.json());
      const flattened: Auction[] =
        Object.values<Auction>(scraped).flat<Auction[]>();
      const sorted = flattened.sort((a: Auction, b: Auction) =>
        moment(a.timeStamp).isBefore(moment(b.timeStamp)) ? 1 : -1
      );
      console.log(flattened);
      setResult(sorted);
    };

    scrape();
    const intervalId = setInterval(() => {
      scrape();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [urls]);

  return (
    <main className="hero bg-base-200 min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold mb-8">
            Let&apos;s scrape something!
          </h1>
          <textarea
            rows={8}
            value={urls}
            onChange={(e) => handleUrlChange(e.target.value)}
          ></textarea>
          <p className="mb-6">
            <button className="btn btn-primary" onClick={goScraping}>
              Get Started
            </button>
          </p>
          {result && (
            <div className="grid">
              <pre className="bg-zinc-200 text-left py-4 px-5 rounded overflow-x-scroll">
                <code>{JSON.stringify(result, undefined, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
