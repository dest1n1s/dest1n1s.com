import { cache } from "react";
import { loadEpub, loadEpubs } from "./epub";

import "server-only";

export const loadEpubCached = cache(loadEpub);
export const loadEpubsCached = cache(loadEpubs);
