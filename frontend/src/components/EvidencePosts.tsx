"use client";

import React, { useEffect, useState } from "react";
import { Post } from "@/types";
import { api } from "@/lib/api";
import { PostCard } from "./PostCard";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  postIds?: string[];
  initialPosts?: Post[];
  title?: string;
  subtitle?: string;
}

export function EvidencePosts({
  postIds,
  initialPosts,
  title = "Supporting Evidence",
  subtitle = "Direct audience voices backing this insight",
}: Props) {
  const [posts, setPosts] = useState<Post[]>(initialPosts || []);
  const [loading, setLoading] = useState<boolean>(!initialPosts && !!postIds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPosts) {
      setPosts(initialPosts);
      return;
    }

    if (postIds && postIds.length > 0) {
      setLoading(true);
      api
        .getPosts({ ids: postIds })
        .then((res) => setPosts(res.items))
        .catch(() => setError("Unable to load evidence posts."))
        .finally(() => setLoading(false));
    }
  }, [postIds, initialPosts]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0067A5]" />
          <h4 className="text-sm font-semibold text-[#252525]">{title}</h4>
          <span className="text-xs text-[#666666]">
            ({posts.length} verified posts)
          </span>
        </div>
        <span className="text-[11px] text-[#666666]">{subtitle}</span>
      </div>

      {loading ? (
        <div className="py-8 flex flex-col items-center justify-center text-[#666666] gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#0067A5]" />
          <span className="text-xs">Fetching supporting post evidence...</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
          {error}
        </div>
      ) : posts.length === 0 ? (
        <div className="p-4 bg-white rounded-lg border border-[#E5E7EB] text-center text-xs text-[#666666]">
          No linked evidence posts found for this item.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
