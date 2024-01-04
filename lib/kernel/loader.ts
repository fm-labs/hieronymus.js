const loaderSuccessHandler = (res: Response) => {
  console.log(`Asset loaded from ${res.url}`)
  return res.json()
}
const loaderErrorHandler = (e: Error) => {
  console.error(`Asset loading FAILED: ${e.message}`)
}

export const loadHtmlImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = reject
    return img
  })
}

export const loadSpritesheetImage = async (url: string): Promise<HtmlSpritesheetImage> => {
  const image = await loadHtmlImage(url)
  const mapUrl = url.replace('.png', '.json')
  const sprites = await fetch(mapUrl).then(loaderSuccessHandler).catch(loaderErrorHandler)
  return { url, image, sprites }
}

/**
 * Load a kenney repacked spritesheet by name
 * @param name
 * @deprecated Use loadSpritesheetImage instead
 */
export const loadKenneySpritesheetImage = async (name: string): Promise<HtmlSpritesheetImage> => {
  const url = `/assets/2d/${name}/${name}.png`
  const image = await loadHtmlImage(url)
  const mapUrl = url.replace('.png', '.json')
  const sprites = await fetch(mapUrl).then(loaderSuccessHandler).catch(loaderErrorHandler)
  return { url, image, sprites }
}
