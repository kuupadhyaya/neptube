"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchIcon, X } from "lucide-react";

const SearchInputContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/feed?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/feed");
    }
  };

  const handleClear = () => {
    setQuery("");
    router.push("/feed");
  };

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-[600px]">
      <div className="relative w-full">
        <input
          type="text"
          placeholder="Search videos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-4 py-2 pr-12 rounded-l-full border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="size-4 text-gray-500 dark:text-gray-400" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 border-l-0 rounded-r-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <SearchIcon className="size-5 dark:text-white" />
      </button>
    </form>
  );
};

const SearchInputSkeleton = () => {
  return (
    <div className="flex w-full max-w-[600px]">
      <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-l-full border dark:border-gray-600 animate-pulse" />
      <div className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 border-l-0 rounded-r-full">
        <SearchIcon className="size-5 text-gray-400" />
      </div>
    </div>
  );
};

export const SearchInput = () => {
  return (
    <Suspense fallback={<SearchInputSkeleton />}>
      <SearchInputContent />
    </Suspense>
  );
};