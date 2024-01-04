import * as pug from 'pug'

type HtmlTemplate = string
type TemplateFunction = (...args: any[]) => string
type TemplateFunctions = { [key: string]: HtmlTemplate }

// const dummyTemplateFun: TemplateFunction = eval(
//   pug.compileFileClient(path.join(__dirname, 'dummy.pug'), {}),
// ) as TemplateFunction

const dummyPug: string = `
doctype html
html
  head
    title= name
  body
    h1= name
`

const templates: TemplateFunctions = {
  dummy: dummyPug,
}

export default templates
