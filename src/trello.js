import oauth from './oauth.js'

const apiBase = 'https://api.trello.com/1'

function request(type, path, token, secret, data) {

  if (!['get', 'post', 'put', 'delete'].includes(type)) {
    throw new Error('request type not supported')
  }

  const method = oauth[type]

  return new Promise((resolve, reject) => {
    function resolveReject(e, data) {
      if (e) {
        reject(e)
      }
      resolve(JSON.parse(data))
    }

    if (data) {
      method.call(oauth, `${apiBase}/${path}`, token, secret, data, resolveReject)
    } else {
      method.call(oauth, `${apiBase}/${path}`, token, secret, resolveReject)
    }
  })
}

export const getUserBoards = (token, secret) => {
  return request('get', 'members/me/boards', token, secret)
}

export const getLists = (token, secret, boardId) => {
  return request('get', `boards/${boardId}/lists`)
}

export const createBoard = (token, secret, { name }) => {
  return request('post', 'boards', token, secret, { name })
}

export const createList = (token, secret, { name, boardId }) => {
  return request('lists', token, secret, { name, idBoard: boardId })
}

export const createCard = (token, secret, { listId, name, description, position }) => {
  return request('cards', token, secret, { listId, name, description, position, due: null })
}
