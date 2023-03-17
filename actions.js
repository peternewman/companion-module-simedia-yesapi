exports.initActions = function () {
	let self = this
	let actions = {}
	/**
	 * All actions here send a PUT to Yes Apiu gateway, now all the action are use to create a concatenated url for the fetch
	 * the URL is create by an ACTION CALL MANAGER that create the call with che parameters you send in che function actionCallManager()
	 * 
	 * The FIRST parameter is the name of the action (cue, play,stop...)
	 * 
	 * The SECOND parameter is what is necessary for YES APY GATEWAY to execute correwctly:
	 * 
	 * -id = action that require ID, for example the id of the item to play
	 * 
	 * -null = action that require only the name, stop all and next clip don't requires ID
	 * 
	 * -ClipUP & ClipDOWN = are required to start a funcion to set the new selection and change the ID of selected clip Globally and send a call for that
	 * 
	 * -LOOP = is required this parameter because the manager need to check the loop status if the object is already in lopp
	 */


	actions['cue'] = {
		name: 'cue',
		options: [],
		callback: () => {
			self.actionCallManager('cue' , 'id');
		},
	}
	actions['play'] = {
		name: 'play',
		options: [],
		callback: () => {
			self.actionCallManager('play' , 'id');
		},
	}
	actions['pause'] = {
		name: 'pause',
		options: [],
		callback: () => {
			self.actionCallManager('pause' , 'id');
		},
	}
	actions['stop'] = {
		name: 'stop',
		options: [],
		callback: () => {
			self.actionCallManager('stop' , 'id');
		},
	}
	actions['stopAll'] = {
		name: 'stopAll',
		options: [],
		callback: () => {
			self.actionCallManager('stopall' , null);
		},
	}
	actions['nextClip'] = {
		name: 'nextClip',
		options: [],
		callback: () => {
			self.actionCallManager('next' , null);
		},
	}
	actions['clipUp'] = {
		name: 'clipUp',
		options: [],
		callback: () => {
			self.actionCallManager('select' , 'clipUp');
		},
	}
	actions['clipDown'] = {
		name: 'clipDown',
		options: [],
		callback: () => {
			self.actionCallManager('select' , 'clipDown');
		},
	}
		actions['loop'] = {
		name: 'loop',
		options: [],
		callback: () => {
			self.actionCallManager('loop' , 'loop');
		},
	}
	this.setActionDefinitions(actions)
}
