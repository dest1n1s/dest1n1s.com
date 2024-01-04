export type NavPoint = {
  src: string;
  id: string;
  playOrder: string;
  title?: string;
};

type EpubResourceBase = {
  id: string;
  zipPath: string;
  savePath: string;
};

export type XhtmlResource = EpubResourceBase & {
  content: string;
  mediaType: "application/xhtml+xml";
};

export type ImageResource = EpubResourceBase & {
  content: Buffer;
  mediaType: `image/${string}`;
};

export type NcxResource = EpubResourceBase & {
  content: string;
  mediaType: "application/x-dtbncx+xml";
};

export type FontResource = EpubResourceBase & {
  content: string;
  mediaType: `font/${string}` | `application/x-font-${string}` | `application/font-${string}`;
};

export type EpubResource = XhtmlResource | ImageResource | NcxResource;

export type Epub = {
  resources: EpubResource[];
  bookName: string;
  navPoints: NavPoint[];
  spine: string[];
  cover?: string;
  metadata: {
    title: string;
    language?: string;
    creator?: string;
    identifier?: string;
  };
};

export type EpubInfo = Pick<Epub, "bookName" | "metadata" | "cover">;

export type SinglePageXhtml = {
  xhtmlList: XhtmlResource[];
  navPoint: NavPoint;
};
