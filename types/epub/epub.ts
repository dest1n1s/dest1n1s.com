export type Epub = {
  xhtmlList: {
    src: string;
    html: string;
  }[];
  resourceList: {
    src: string;
    image: Buffer;
  }[];
  opf: {
    toc: {
      src: string;
      id: string;
      playOrder: string;
      title?: string;
    }[];
    spine: string[];
    metadata: {
      title: string;
      language?: string;
      creator?: string;
      identifier?: string;
    };
  };
  bookName: string;
};
