export type EpubChapter<Resource = EpubResource> = {
  id: string;
  playOrder: string;
  title?: string;
  sections: Resource[];
};

export type EpubResource = {
  id: string;
  zipPath: string;
  resourceName: string;
  content: string;
  mediaType: string;
};

export type Epub<Resource = EpubResource> = {
  resources: Resource[];
  bookName: string;
  chapters: EpubChapter<Resource>[];
  cover: Resource | null;
  metadata: {
    title: string;
    language?: string;
    creator?: string;
    identifier?: string;
  };
};
