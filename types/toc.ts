import * as z from "zod";


const NavPointSchema = z.object({
    "id": z.string(),
    "playOrder": z.string(),
});

const ContentSchema = z.object({
    "src": z.string(),
});

const ContentElementSchema = z.object({
    "$": ContentSchema,
});

const TextSchema = z.object({
    "_": z.string().optional(),
});

const DocTitleSchema = z.object({
    "text": z.array(TextSchema),
});


const NavPointElementSchema = z.object({
    "$": NavPointSchema,
    "navLabel": z.array(DocTitleSchema),
    "content": z.array(ContentElementSchema),
});

const NavMapSchema = z.object({
    "navPoint": z.array(NavPointElementSchema),
});

const MetaSchema = z.object({
    "name": z.string(),
    "content": z.string(),
});

const MetaElementSchema = z.object({
    "$": MetaSchema,
});

const HeadSchema = z.object({
    "meta": z.array(MetaElementSchema),
});

const NcxClassSchema = z.object({
    "xmlns": z.string(),
    "version": z.string(),
});
const NcxSchema = z.object({
    "$": NcxClassSchema,
    "head": z.array(HeadSchema),
    "docTitle": z.array(DocTitleSchema),
    "navMap": z.array(NavMapSchema),
});

export const TocSchema = z.object({
    "ncx": NcxSchema,
});
export type Toc = z.infer<typeof TocSchema>;
