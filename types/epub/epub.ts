export type NavPoint = {
  src: string;
  id: string;
  playOrder: string;
  title?: string;
};

export type EpubResource = {
  id: string;
  zipPath: string;
  savePath: string;
  content: string;
  mediaType: string;
};

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
  xhtmlList: EpubResource[];
  navPoint: NavPoint;
};
