import * as z from "zod";


const RootfileSchema = z.object({
    "full-path": z.string(),
    "media-type": z.string(),
});

const RootfileRootfileSchema = z.object({
    "$": RootfileSchema,
});

const ContainerRootfileSchema = z.object({
    "rootfile": z.array(RootfileRootfileSchema),
});

const ContainerClassSchema = z.object({
    "rootfiles": z.array(ContainerRootfileSchema),
});

export const ContainerSchema = z.object({
    "container": ContainerClassSchema,
});
export type Container = z.infer<typeof ContainerSchema>;
