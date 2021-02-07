const { token } = require('./secrets.json')
const queryString = require('query-string')
// const queryString = require('querystring')
const fetch = require('node-fetch')
const baseUrl = 'https://api.pinboard.in/v1'
const fuzzy = require('fuzzy')
const low = require('lowdb')
const FileAsync = require('lowdb/adapters/FileAsync')
const path = require('path')
const adapter = new FileAsync(path.resolve(__dirname, 'db.json'), { defaultValue: { posts: [], lastUpdate: undefined } })
let db = low(adapter)

const makeQuery = (params) => {
  return queryString.stringify(params, { encode: false })
}

const getPosts = async (config) => {
  const url = `${baseUrl}/posts/all?`
  return fetch(url + makeQuery({
    ...config,
    'auth_token': token,
    format: 'json',
  })).then((res) => res.json())
}

(async() => {
  const promises = []
  // ensure the promise to make the db has resolved
  db = await db


  // read what we need from the db
  promises.push(db.get('lastUpdate').value())
  promises.push(db.get('posts').value())
  await Promise.all(promises)
  let [lastUpdate, oldPosts] = promises


  // then get new posts
  const newPosts = await getPosts(lastUpdate ? { fromdt: lastUpdate } : {}) || []


  // then write everything we need to the db
  // this needs to be really fast, so we try to avoid writing to db as much as possible
  const posts = [...oldPosts, ...newPosts]
  const newLastUpdate = new Date(posts.map((post) => new Date(post.time).getTime()).sort().pop()).toISOString()
  if (newPosts.length !== 0) {
    promises.push(db.set('posts', posts).write())
  }
  if (lastUpdate !== newLastUpdate) {
    promises.push(db.set('lastUpdate', lastUpdate).write())
  }
  await Promise.all(promises)


  // then prompt the user for input
  await promptUser(posts)
})()

const inquirer = require('inquirer')
const url = require('url')
const chalk = require('chalk')
const figures = require("figures")
inquirer.registerPrompt('search-list', require('inquirer-search-list'))

const renderRow = (item, isSelected) => {
  const post = item.value;
  if (isSelected) {
    return `${chalk.cyan(figures.pointer)}${chalk.cyan(post.description)} (${chalk.white(url.parse(post.href).hostname)}) [${post.tags.split(' ').join(', ')}]`
  } else {
    return ` ${post.description} (${chalk.dim(url.parse(post.href).hostname)})`
  }
}

const filterRow = ({ value: post }, query) => {
  const desiredTags = query.split(' ').filter((subQuery) => subQuery[0] === '+')
  const queryMinusTags = query.split(' ').filter((subQuery) => subQuery[0] !== '+').join('')
  const actualTags = post.tags.split(' ')
  const validTags =
    desiredTags.every((desiredTag) => actualTags.some((actualTag) => fuzzy.test(desiredTag.slice(1), actualTag)))
  if (validTags) {
    return fuzzy.test(queryMinusTags, `${post.description} ${url.parse(post.href).hostname}`)
  } else {
    return false
  }
}


const promptUser = (db) => {
  return inquirer
    .prompt([{
      type: 'search-list',
      message: 'Select a link',
      name: 'link',
      // pageSize: 1,
      // we just overwrite name anyway in renderRow, not sure why it exists...
      choices: db.map((post) => { return { name: post.description, value: post } }),
      renderRow,
      filterRow
    }])
    .then((answers) => {
      console.log(JSON.stringify(answers, null, 2))
    })
    .catch((error) => console.log(error))
}
