"use client"
import {trpc } from "@/trpc/client";

export default function Home() {
  const { data } = trpc.hello.useQuery({ text: "from tRPC" });
  return (
      <div>
        <h1 className="text-5xl text-gray-500">Video incoming!!!</h1>
        {data && <p>{data.greeting}</p>}
      </div>
    
  );
}
