/**
 * initial-posts.ts — deliberately empty.
 *
 * All records in the Social Pulse feed must come from live API connectors
 * (YouTube Data API, GDELT DOC 2.0, Bluesky AT Protocol, Google News RSS,
 *  Google Places) or user-imported CSV files.
 *
 * No hardcoded sample posts. If the store is empty on first load, the feed
 * shows a clean empty state instructing the user to search or import data.
 */

import { Post } from "../types";

export const INITIAL_POSTS: Post[] = [];
