import models, { schemas } from 'backlog-models'

const { backlog, sprint, card } = schemas

const backlogMethods = {
  addTrelloLabel: function(token, secret, labelId, trelloLabelId) {
    //TODO check if authorized
    const label = this.labels.id(labelId)
    label.sync = label.sync || {}
    label.sync.trello = {
      id: trelloLabelId
    }
    this.markModified('labels')
    return this.save()
  },

  removeTrelloLabel: function(token, secret, labelId) {
    //TODO check if authorized
    const label = this.labels.id(labelId)
    if (!label.sync || !label.sync.trello) {
      throw new Error('No Trello list synchronized')
    }
    label.sync.trello = undefined
    this.markModified('labels')
    return this.save()
  }
}

const cardMethods = {
  addTrelloCard: function(token, secret, cardId) {
    //TODO check if authorized
    this.sync = this.sync || {}
    this.sync.trello = {
      id: cardId
    }
    return this.save()
  },

  removeTrelloCard: function(token, secret) {
    //TODO check if authorized
    if (!this.sync || !this.sync.trello) {
      throw new Error('No Trello list synchronized')
    }
    this.sync.trello = undefined
    return this.save()
  },

  addTrelloChecklistItem: function(token, secret, acId, itemId, checklistId) {
    //TODO check if authorized
    const ac = this.acceptanceCriteria.id(acId)
    ac.sync = ac.sync || {}
    ac.sync.trello = {
      id: itemId,
      checklistId
    }
    this.markModified('acceptanceCriteria')
    return this.save()
  },

  removeTrelloChecklistItem: function(token, secret, acId) {
    //TODO check if authorized
    const ac = this.acceptanceCriteria.id(acId)
    if (!ac.sync || !ac.sync.trello) {
      throw new Error('No Trello list synchronized')
    }
    ac.sync.trello = undefined
    this.markModified('acceptanceCriteria')
    return this.save()
  }
}

backlog.methods = Object.assign(backlog.methods, backlogMethods)
card.methods = Object.assign(card.methods, cardMethods)

backlog.add({ trello: { id: String, token: String, secret: String } }, 'sync')
sprint.add({ trello: { id: String } }, 'sync')
card.add({ trello: { id: String } }, 'sync')

export default models({
  backlog,
  sprint,
  card
})
