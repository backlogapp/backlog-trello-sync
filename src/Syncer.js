import { mongoose } from 'backlog-models'
import models from './models'
import Promise from 'bluebird'
import * as trello from './trello'

const { Backlog, Sprint, Card } = models

export default class Syncer {
  constructor(dbUrl) {
    mongoose.connect(dbUrl)
    mongoose.Promise = Promise
    this.db = mongoose.connection
    this.db.on('error', console.error.bind(console, 'connection error:'))
    this.db.once('open', () => {
      console.log('Syncer running')
    })
  }

  addCard(token, secret, listId, card, labelsMapping) {
    const { title, description, estimate, labelIds } = card
    const trelloLabelIds = labelIds.map(labelId => labelsMapping[labelId])

    return trello.createCard(token, secret, {
        listId,
        name: `(${estimate || '?'}) ${title}`,
        description,
        labelIds: trelloLabelIds
      })
      .then(trelloCard => card.addTrelloCard(token, secret, trelloCard.id))
      .tap(newCard => this.exportAcceptanceCriteria(token, secret, newCard))
  }

  exportSprintToList(token, secret, sprint, listId, labelsMapping) {
    return trello.clearCards(token, secret, { listId })
      .then(() => Card.find({ _id: { $in: sprint.cardIds } }).exec())
      .then(cards => cards.sort((a, b) => sprint.cardIds.indexOf(a._id) - sprint.cardIds.indexOf(b._id)))
      .then(sortedCards =>
        Promise.mapSeries(sortedCards, card => this.addCard(token, secret, listId, card, labelsMapping))
      )
  }

  addLabel(token, secret, boardId, backlog, label) {
    return trello.createLabel(token, secret, {
      boardId,
      name: label.name || '',
      color: trello.labelColors[label.color] || null
    }).then(trelloLabel => backlog.addTrelloLabel(token, secret, label._id, trelloLabel.id))
  }

  addAcceptanceCriterium(token, secret, checklistId, ac, card) {
    return trello.createChecklistItem(token, secret, {
      checklistId: checklistId,
      name: ac.title,
      checked: ac.done
    }).then(checklistItem => card.addTrelloChecklistItem(token, secret, ac.id, checklistItem.id, checklistId))
  }

  exportAcceptanceCriteria(token, secret, card) {
    const { sync: { trello: { id: cardId } }, acceptanceCriteria } = card
    if (acceptanceCriteria.length > 0) {
      return trello.createChecklist(token, secret, { cardId, name: 'Acceptance criteria' }).then(checklist =>
        Promise.mapSeries(acceptanceCriteria, acceptanceCriterium =>
          this.addAcceptanceCriterium(token, secret, checklist.id, acceptanceCriterium, card))
      )
    }
    return Promise.resolve({})
  }

  exportLabels(token, secret, backlog, boardId) {
    return trello.clearLabels(token, secret, { boardId })
      .then(() => Promise.mapSeries(backlog.labels, this.addLabel.bind(this, token, secret, boardId, backlog)))
      .then(() => Backlog.findById(backlog._id).exec())
      .then(backlogWithLabels => backlogWithLabels.labels)
      .reduce((mapping, label) => {
        mapping[label._id] = label.sync.trello.id

        return mapping
      }, {})
  }

  exportActiveSprintFromBacklog(token, secret, backlogId) {
    return Backlog.findOne({ _id: backlogId }).exec().then(backlog => {
      const { sync: { trello: { accessToken, accessTokenSecret, listId } } } = backlog

      if (accessToken !== token || accessTokenSecret !== secret) {
        throw new Error('not authorized')
      }

      return Promise.all([
        trello.getBoardIdForList(token, secret, { listId }),
        Sprint.findOne({ backlogId, isActive: true }).exec()
      ]).spread((boardId, sprint) => this.exportLabels(token, secret, backlog, boardId)
        .then(labelsMapping => this.exportSprintToList(token, secret, sprint, listId, labelsMapping))
      )
    })
  }
}
