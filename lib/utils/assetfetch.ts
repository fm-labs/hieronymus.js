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

export const fetchSpritesheetAtlas = async (url: string): Promise<SpritesheetAtlas> => {
  return await fetch(url).then(loaderSuccessHandler).catch(loaderErrorHandler)
}
