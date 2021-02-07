const { token } = require('./secrets.json')
const queryString = require('query-string')
// const queryString = require('querystring')
const fetch = require('node-fetch')
const baseUrl = 'https://api.pinboard.in/v1'
const fuzzy = require('fuzzy')

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

// getPosts({ results: 3 }).then(console.log).catch(console.error)
// getPosts().then((res) => console.log(JSON.stringify(res, null, 2))).catch(console.error)

const db = require('./out.json')
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

const filterRow = ({ post }, query) => {
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

inquirer
  .prompt([{
    type: 'search-list',
    message: 'Select a link',
    name: 'link',
    arbitrary: 'salsa',
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
