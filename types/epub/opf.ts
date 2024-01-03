import * as z from "zod";

const ItemrefSchema = z.object({
  idref: z.string(),
});

const ItemrefElementSchema = z.object({
  $: ItemrefSchema,
});

const SpineSchema = z.object({
  toc: z.string(),
});

const SpineElementSchema = z.object({
  $: SpineSchema,
  itemref: z.array(ItemrefElementSchema),
});

const MetaSchema = z.any();

const MetaElementSchema = z.object({
  $: MetaSchema.optional(),
});

const DcIdentifierSchema = z.object({
  id: z.string().optional(),
  "opf:scheme": z.string().optional(),
});

const DcIdentifierElementSchema = z.object({
  _: z.string().optional(),
  $: DcIdentifierSchema.optional(),
});

const DcDateSchema = z.object({
  "opf:event": z.string().optional(),
  "xmlns:opf": z.string().optional(),
});

const DcDateElementSchema = z.object({
  _: z.string().optional(),
  $: DcDateSchema.optional(),
});

const DcCreatorSchema = z.object({
  "opf:role": z.string().optional(),
});

const DcCreatorElementSchema = z.object({
  _: z.string().optional(),
  $: DcCreatorSchema.optional(),
});

const DCTitleElementSchema = z.object({
  _: z.string(),
});

const DCLanguageElementSchema = z.object({
  _: z.string().optional(),
});

export const MetadatumSchema = z.object({
  "dc:identifier": z.array(DcIdentifierElementSchema).optional(),
  meta: z.array(MetaElementSchema).optional(),
  "dc:title": z.array(DCTitleElementSchema),
  "dc:creator": z.array(DcCreatorElementSchema).optional(),
  "dc:language": z.array(DCLanguageElementSchema).optional(),
  "dc:date": z.array(DcDateElementSchema).optional(),
});
export type Metadatum = z.infer<typeof MetadatumSchema>;

const ItemSchema = z.object({
  href: z.string(),
  id: z.string(),
  "media-type": z.string(),
});

const ItemElementSchema = z.object({
  $: ItemSchema,
});

const ManifestSchema = z.object({
  item: z.array(ItemElementSchema),
});

const PackageSchema = z.object({
  metadata: z.array(MetadatumSchema),
  manifest: z.array(ManifestSchema),
  spine: z.array(SpineElementSchema),
});

export const OpfSchema = z.object({
  package: PackageSchema,
});

export type Opf = z.infer<typeof OpfSchema>;
