const loaderSuccessHandler = (res: Response) => {
  console.log(`Asset loaded from ${res.url}`)
  return res.json()
}
const loaderErrorHandler = (e: Error) => {
  console.error(`Asset loading FAILED: ${e.message}`)
}

export const fetchImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = reject
    return img
  })
}

export const fetchSpritesheet = async (
  url: string,
): Promise<{ $element: HTMLImageElement; type: 'SPRITESHEET'; sprites: SpritesheetItem[] }> => {
  const image = await fetchImage(url)
  const mapUrl = url.replace('.png', '.json')
  const info: any = await fetch(mapUrl).then(loaderSuccessHandler).catch(loaderErrorHandler)
  return {
    sprites: info.sprites as SpritesheetItem[],
    type: 'SPRITESHEET',
    $element: image,
    //sprites: info.sprites,
  }
}

/**
 * Load a kenney repacked spritesheet by name
 * @param name
 * @deprecated Use loadSpritesheetImage instead
 */
export const fetchKenneySpritesheet = async (name: string): Promise<SpritesheetResource> => {
  const url = `/assets/sprites/kenney-assets/2d/${name}/${name}.png`
  return fetchSpritesheet(url)
}
