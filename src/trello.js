import oauth from './oauth.js'
import Promise from 'bluebird'

const apiBase = 'https://api.trello.com/1'

const requests = {}

function request(type, path, token, secret, data) {

  if (!['get', 'post', 'put', 'delete'].includes(type)) {
    throw new Error('request type not supported')
  }

  const method = oauth[type]

  return new Promise((resolve, reject) => {
    function resolveReject(e, responseData) {
      requests[token]--
      if (e) {
        console.log(data, e)
        reject(e)
      }
      resolve(JSON.parse(responseData))
    }

    const openRequests = requests[token]

    if (openRequests >= 1) {
      setTimeout(function() {
        resolve(request(type, path, token, secret, data))
      }, 100)
    } else {
      if (openRequests === undefined) {
        requests[token] = 1
      } else {
        requests[token]++
      }

      if (data) {
        method.call(oauth, `${apiBase}/${path}`, token, secret, data, resolveReject)
      } else {
        method.call(oauth, `${apiBase}/${path}`, token, secret, resolveReject)
      }
    }
  })
}

export const labelColors = {
  green: 'green',
  yellow: 'yellow',
  orange: 'orange',
  red: 'red',
  purple: 'purple',
  blue: 'blue',
  lime: 'lime',
  pink: 'pink',
  black: 'black'
}

// Boards

export const getUserBoards = (token, secret) =>
  request('get', 'members/me/boards', token, secret)

export const createBoard = (token, secret, { name }) =>
  request('post', 'boards', token, secret, { name })

// Lists

export const getLists = (token, secret, { boardId }) =>
  request('get', `boards/${boardId}/lists`, token, secret)

export const getBoardIdForList = (token, secret, { listId }) =>
  request('get', `lists/${listId}/idBoard`, token, secret).then(result => result['_value'])

export const createList = (token, secret, { name, boardId }) =>
  request('post', 'lists', token, secret, { name, idBoard: boardId })

// Cards

export const createCard = (token, secret, { listId, name, description, position, labelIds }) =>
  request('post', 'cards', token, secret, {
    idList: listId,
    name,
    desc: description,
    position,
    idLabels: labelIds.length ? labelIds.join(',') : null,
    due: null })

export const clearCards = (token, secret, { listId }) => request('get', `lists/${listId}/cards`, token, secret)
  .then(cards => Promise.map(cards, card => request('delete', `cards/${card.id}`, token, secret)))

// Labels

export const createLabel = (token, secret, { boardId, name, color }) =>
  request('post', 'labels', token, secret, { idBoard: boardId, name, color })

export const clearLabels = (token, secret, { boardId }) => request('get', `boards/${boardId}/labels`, token, secret)
  .then(labels => Promise.map(labels, label => request('delete', `labels/${label.id}`, token, secret)))

// Checklists

export const createChecklist = (token, secret, { cardId, name }) =>
  request('post', 'checklists', token, secret, { idCard: cardId, name })

export const createChecklistItem = (token, secret, { checklistId, name, checked }) =>
  request('post', `checklists/${checklistId}/checkItems`, token, secret, { name, checked })

export const createWebhook = (token, secret, { callbackURL, modelId, description }) => {
  return request('post', `webhooks`, token, secret, { callbackURL, idModel: modelId, description })
}
