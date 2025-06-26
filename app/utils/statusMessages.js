const i18next = require('i18next')
const Utils = require('./utils')

class StatusMessages {
  constructor({ breakPlanner, settings }) {
    this.reference = breakPlanner.scheduler.reference
    this.doNotDisturb = breakPlanner.dndManager.isOnDnd
    this.videoCallActive = breakPlanner.videoCallManager.isInVideoCall
    this.appExclusionPause = breakPlanner.appExclusionsManager.isSchedulerCleared
    this.timeLeft = breakPlanner.scheduler.timeLeft
    this.timeToNextBreak = breakPlanner.timeToNextBreak
    this.isPaused = breakPlanner.isPaused
    this.breakNumber = breakPlanner.breakNumber
    this.settings = settings
  }

  get trayMessage() {
    let message = ''
    if (this.reference === 'finishMicrobreak' || this.reference === 'finishBreak') {
      return message
    }

    if (this.isPaused) {
      if (this.timeLeft) {
        message += i18next.t('statusMessages.paused') + ' - ' +
          i18next.t('statusMessages.resuming') + ' ' +
          Utils.formatTimeIn(this.timeLeft, this.settings.get('language'))
        return message
      } else {
        message += i18next.t('statusMessages.paused') + ' ' +
          i18next.t('statusMessages.indefinitely')
        return message
      }
    }

    if (this.doNotDisturb) {
      message += i18next.t('statusMessages.paused') + ' - ' + i18next.t('statusMessages.dndMode')
      return message
    }

    if (this.videoCallActive) {
      message += i18next.t('statusMessages.paused') + ' - ' + i18next.t('statusMessages.videoCallMode')
      return message
    }

    if (this.appExclusionPause) {
      message += i18next.t('statusMessages.paused') + ' - ' + i18next.t('statusMessages.appExclusion')
      return message
    }

    const breakInterval = this.settings.get('breakInterval') + 1
    const breakNumber = this.breakNumber % breakInterval

    if (this.reference === 'startBreak' || this.reference === 'startBreakNotification') {
      message += i18next.t('statusMessages.nextLongBreak') + ' ' +
        Utils.formatTimeIn(this.timeToNextBreak, this.settings.get('language'))
      return message
    }

    if (this.reference === 'startMicrobreak' || this.reference === 'startMicrobreakNotification') {
      message += i18next.t('statusMessages.nextMiniBreak') + ' ' +
        Utils.formatTimeIn(this.timeToNextBreak, this.settings.get('language'))
      if (this.settings.get('break')) {
        message += '\n' + i18next.t('statusMessages.nextLongBreak') + ' ' +
          i18next.t('statusMessages.afterMiniBreak', { count: breakInterval - breakNumber })
      }
      return message
    }

    return message
  }
}

module.exports = StatusMessages
