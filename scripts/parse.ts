import xml2js from 'xml2js'
import JSZip, { loadAsync } from 'jszip'
import fs from 'fs'
import { Toc, TocSchema } from '@/types/toc'
import { ContainerSchema, Container } from '@/types/container'
import { Opf, OpfSchema } from '@/types/opf'
import { join, sep } from 'path'

const callbackToPromise = async <T>(callback: (callback: (err: any, result: T) => void) => void) => {
    return await new Promise<T>((resolve, reject) => {
        callback((err, result) => {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

const parseXml = async <T>(xml: string) => {
    const xmlParser = new xml2js.Parser({ explicitCharkey: true, emptyTag: () => ({}) })
    return await callbackToPromise<T>(callback => xmlParser.parseString(xml, callback))
}

const readFile = async (path: string) => {
    return await callbackToPromise<Buffer>(callback => fs.readFile(path, callback))
}

const loadZip = async (path: string) => {
    const zipContent = await readFile(path)
    return await loadAsync(zipContent)
}

const resolvePathFromZip = async (zip: JSZip, path: string) => {
    const file = zip.file(path)
    if (!file) {
        throw new Error(`File not found: ${path}`)
    }
    return await file.async('string')
}

const resolveXmlFromZip = async (zip: JSZip, path: string) => {
    const xml = await resolvePathFromZip(zip, path)
    return await parseXml(xml)
}

const getOpfPath = (container: Container) => {
    return container.container.rootfiles[0].rootfile[0].$['full-path']
}

const getSpine = (opf: Opf) => {
    return opf.package.spine[0].itemref.map(itemref => itemref.$.idref)
}

const getManifest = (opf: Opf) => {
    return opf.package.manifest[0].item.map(item => ({
        id: item.$.id,
        href: item.$.href,
        mediaType: item.$['media-type'],
    }))
}

const getTocPath = (opf: Opf) => {
    const tocId = opf.package.spine[0].$['toc']
    const manifest = getManifest(opf)
    const tocItem = manifest.find(item => item.id === tocId)
    if (!tocItem) {
        throw new Error(`Toc item not found: ${tocId}`)
    }
    return tocItem.href
}

const getNavPoints = (toc: Toc) => {
    return toc.ncx.navMap[0].navPoint.map(navPoint => ({
        id: navPoint.$.id,
        playOrder: navPoint.$.playOrder,
        src: navPoint.content[0].$.src,
        title: navPoint.navLabel[0].text[0]['_'],
    }))
}

const parseEpub = async (path: string) => {
    const zip = await loadZip(path)
    const container: Container = ContainerSchema.parse(await resolveXmlFromZip(zip, 'META-INF/container.xml'))
    const opfPath = getOpfPath(container)
    const rootPath = opfPath.split(sep).slice(0, -1).join(sep)
    const opf: Opf = OpfSchema.parse(await resolveXmlFromZip(zip, opfPath))
    const tocPath = getTocPath(opf)
    const toc: Toc = TocSchema.parse(await resolveXmlFromZip(zip, join(rootPath, tocPath)))
    console.log(JSON.stringify(getNavPoints(toc), null, 2))
    return opf
}

const main = async () => {
    const opf = await parseEpub('./data/test2.epub')
}

main()