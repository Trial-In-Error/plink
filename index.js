const { token } = require('./secrets.json')
const queryString = require('query-string')
// const queryString = require('querystring')
const fetch = require('node-fetch')
const baseUrl = 'https://api.pinboard.in/v1'

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

getPosts({ results: 3 }).then(console.log).catch(console.error)
