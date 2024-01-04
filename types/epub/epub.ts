export type XhtmlResource = {
  src: string;
  html: string;
};

export type ImageResource = {
  src: string;
  image: Buffer;
};

export type NavPoint = {
  src: string;
  id: string;
  playOrder: string;
  title?: string;
};

export type Epub = {
  xhtmlList: XhtmlResource[];
  resourceList: ImageResource[];
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
