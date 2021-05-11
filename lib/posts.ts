import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import unified from 'unified'
import slug from 'remark-slug'
import toc from 'remark-toc'
import markdown from 'remark-parse'
import headings from 'remark-autolink-headings'
import html from 'remark-html'
import guide from 'remark-preset-lint-markdown-style-guide'
import highlight from 'remark-highlight.js'

const postsDirectory = path.join(process.cwd(), 'posts')

interface IPostData {
  date: string
  title: string
  description: string
  tag: string
  category: string
  cover: string
}

// 格式化gray-matter数据
const dateStripped = (obj: { [s: string]: any }): { data?: any } => {
  let newObj: { [s: string]: any } = {}
  Object.keys(obj).forEach((key) => {
    let value = obj[key]
    if (value !== null) {
      // If array, loop...
      if (Array.isArray(value)) {
        value = value.map((item) => dateStripped(item))
      }
      // ...if property is date/time, stringify/parse...
      else if (
        typeof value === 'object' &&
        typeof value.getMonth === 'function'
      ) {
        value = JSON.parse(JSON.stringify(value))
      }
      // ...and if a deep object, loop.
      else if (typeof value === 'object') {
        value = dateStripped(value)
      }
    }
    newObj[key] = value
  })
  return newObj
}

/**
 * @description 过滤写完的blog
 * @returns 
 */
const getFinishedFiles = ()=>{
  const fileNames = fs.readdirSync(postsDirectory)
  const unfinishedTag = '[未完待续...]'
  return fileNames.filter((fileName) => {
    const filePath = path.resolve(postsDirectory, fileName)
    const content = fs.readFileSync(filePath, 'utf-8')
    return !content.trim().endsWith(unfinishedTag)
  })
}

// index page blog 列表
export function getSortedPostsData(pageSize = 10) {

  const finishFileNames = getFinishedFiles()

  const allPostsData = finishFileNames.map((fileName) => {
    const id = encodeURI(fileName.replace(/\.md$/, ''))
    const fullPath = path.join(postsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const matterResult = matter(fileContents)
    return {
      id,
      ...(dateStripped(matterResult).data as IPostData),
    }
  })
  // Sort posts by date
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1
    } else {
      return -1
    }
  })
}

/** 
 * 返回动态路由id
 * Returns an array that looks like this:
   [
    {
      params: {
        id: 'ssg-ssr'
      }
    },
    {
      params: {
        id: 'pre-rendering'
      }
    }
  ]
*/
export function getAllPostIds() {
  const finishFileNames = getFinishedFiles()

  return finishFileNames.map((fileName) => {
    return {
      params: {
        id: decodeURI(fileName.replace(/\.md$/, '')),
        // id: fileName.replace(/\.md$/, ''),
      },
    }
  })
}

// 获取单个博客的内容
export async function getPostData(id: string) {
  const fullPath = path.join(postsDirectory, `${decodeURI(id)}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const matterResult = matter(fileContents)
  const processedContent = unified()
    .use(markdown)
    .use(guide)
    .use(highlight)
    .use(slug)
    .use(toc)
    .use(headings)
    .use(html)
    .processSync(matterResult.content)

  const contentHtml = processedContent.toString()
  return {
    id,
    contentHtml,
    ...(dateStripped(matterResult).data as IPostData),
  }
}
