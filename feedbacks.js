const { combineRgb } = require('@companion-module/base')
exports.initFeedback = function () {
	let feedbacks = {}

  /**
   * Feedback ['buttonsDeactivated'] change the icon of the buttons from white to grey
   * The other Feedbacks change the colour of the status button based on the current status of the clip
   */
  feedbacks['buttonsDeactivated'] = {
		type: 'boolean',
    name: 'all Button Deactivated',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 500){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['noClip'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 500 || this.currentClipStatus === 13){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsCuing'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 0){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsCued'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 1 || this.currentClipStatus === 19 || this.currentClipStatus === 20 || this.currentClipStatus === 21 ){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsOnAir'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 3 || this.currentClipStatus === 14 || this.currentClipStatus === 16 || this.currentClipStatus === 18){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsReady'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 4){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsOffline'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 5){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsPaused'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 9){
        return true
      }else {
        return false
      }
    },
	}

  feedbacks['clipIsInLoop'] = {
		type: 'boolean',
    name: 'Change color based on status',
    defaultStyle: {
    },
    options: [{
    }],
    callback: () => {
      if (this.currentClipStatus === 11){
        return true
      }else {
        return false
      }
    },
	}
	this.setFeedbackDefinitions(feedbacks)
}
