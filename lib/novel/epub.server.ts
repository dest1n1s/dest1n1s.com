import { cache } from "react";
import { loadEpub } from "./epub";

import "server-only";

export const loadEpubCached = cache(loadEpub);
