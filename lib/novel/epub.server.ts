import { cache } from "react";
import { loadEpub, loadInfos } from "./epub";

import "server-only";

export const loadEpubCached = cache(loadEpub);
export const loadInfosCached = cache(loadInfos);
