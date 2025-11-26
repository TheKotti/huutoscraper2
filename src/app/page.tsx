"use client";

import { useNextQueryParams } from "@/hooks/useNextQueryParams";
import { Suspense, useState } from "react";

export default function Home() {
  const { initialParams, updateParams } = useNextQueryParams({
    urls: "",
  });
  const [result, setResult] = useState<object>();
  const [urls, setUrls] = useState<string>(initialParams.get("urls") || "");

  const handleOnClick = async () => {
    console.log("click");
    setResult({ loading: true });
    const scraped = await fetch("/api/scraper", {
      method: "POST",
      body: JSON.stringify({ urls }),
    }).then((r) => r.json());
    console.log(scraped);
    setResult(scraped);
  };

  const handleOnClickSS = async () => {
    console.log("ss click");
    setResult({ loading: true });
    const scraped = await fetch("/api/scraper", {
      method: "POST",
      body: JSON.stringify({ urls }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);

        // Create an anchor element to initiate the download
        const a = document.createElement("a");
        a.href = url;
        a.download = "ss.png";
        document.body.appendChild(a);

        // Trigger the download
        a.click();

        // Clean up the URL object
        window.URL.revokeObjectURL(url);
      });
    console.log(scraped);
  };

  const handleUrlChange = (value: string) => {
    setUrls(value);
    updateParams({ urls: value });
  };

  return (
    <Suspense>
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
              <button className="btn btn-primary" onClick={handleOnClick}>
                Get Started
              </button>
              <button className="btn btn-primary" onClick={handleOnClickSS}>
                screenshot
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
    </Suspense>
  );
}
