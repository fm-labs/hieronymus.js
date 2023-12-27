export const loadHtmlImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.src = url
    img.onload = () => resolve(img)
    img.onerror = reject
  })
}

export const loadSpritesheet = async (url: string): Promise<SpritesheetImage> => {
  const image = await loadHtmlImage(url)
  const mapUrl = url.replace('.png', '.json')
  const sprites = await fetch(mapUrl).then((res) => res.json())
  return { url, image, sprites }
}

export const loadSpritesheetByName = async (name: string): Promise<SpritesheetImage> => {
  const url = `/assets/2d/${name}/${name}.png`
  const image = await loadHtmlImage(url)
  const mapUrl = url.replace('.png', '.json')
  const sprites = await fetch(mapUrl).then((res) => res.json())
  return { url, image, sprites }
}
