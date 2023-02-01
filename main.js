const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const presets = require('./presets')
const actions = require('./actions')
const variables = require('./variables')
const feedback = require('./feedbacks')

class ModuleInstance extends InstanceBase {
	//An object array of all the clips in the current rundown
		clips 
	//Variables of the current status refreshed continuously (based on the variable 'workerCheckStatusTime')
		currnetClipParamsId;
		currentClipName;
		currentClipLength;
		currentClipStatus;
		currentClipLoopNumber;
		currentClipId;
		currentClipIndexOf;
	//Variables of the current selection ()
		selectedClipId;
	//Variables for the string concatenation during the http request  
		httpUrlPlayerControl;
		httpEndpoint;
		httpAuthorizationHeader;
		actionEndPoint;
	//Variables of the token
		token = '';
		tokenExpireDate;
		checkStatusTime;
	//Variables for control the promise
		openConnectionForToken;
		openConnectionForStatus;
	//Variable for chack if there is a match between clips when open a new rundown
		checkListOfClips;
	constructor(internal) {
		super(internal)
		Object.assign(this, {
			...presets,
			...actions,
			...variables,
			...feedback
		})
	}
	async destroy() {
		this.endTokenAndStatus()
		this.log('debug', 'destroy')
	}
	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'user',
				label: 'Username',
				width: 6,
			},
			{
				type: 'textinput',
				id: 'pass',
				label: 'Password',
				width: 6,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Port',
				width: 6,
				regex: this.REGEX_PORT,
			},
			{
				type: 'textinput',
				id: 'host',
				label: 'Hostname',
				width: 6,
			},
			{
				type: 'textinput',
				id: 'studioId',
				label: 'Current Studio ID',
				width: 4,
				required: true,
			},
			{
				type: 'number',
				id: 'requestStatus',
				label: 'Request Status Time (Min 500 Max 200)',
				default: 750,
        min: 500,
        max: 2000,
			}
		]
	}
	async init(config) {
		this.config = config
		this.initPresets()
		this.initActions()
		this.initVariables()
		this.initFeedback()
		this.checkListOfClips = true;
		this.updateStatus(InstanceStatus.Ok)
	}
	async configUpdated(config) {
		this.config = config
		if (this.config.host && this.config.port && this.config.pass && this.config.user) {
			try {
				if ( this.openConnectionForToken = false || this.openConnectionForStatus === true){
				this.endTokenAndStatus()
				}
			}catch (error){
				this.endTokenAndStatus()
				console.log('Error ', error)
			}finally{
				this.loadingOrder();
			}
		} else {
			this.log('warn', 'Please ensure your server IP, Port, User and Pass are correct in the module settings')
		}
	}
	/**
	 * Close the calls for token refresher and status request
	 */
	endTokenAndStatus(){
		this.openConnectionForToken = false;
		this.openConnectionForStatus = false;
	}
	/*
	* Setting the refresh time for the method workerForStatus
	*/
	async loadingOrder(){
		this.openConnectionForToken = true;
		this.openConnectionForStatus = true;
		this.checkStatusTime = this.config.requestStatus;
		this.currentClipIndexOf = 0;
		this.currentClipId = 'Finding id...';
		this.currentClipName = 'Finding asset...';
		this.createUrl();
		this.createEncriptedHeader();
		await this.connectToYesApyGatweway();
		await this.getCurrentStatus();
	}
	/**
	 * String concatenarion to create the endpoints
	 */
	createUrl(){
		this.httpEndpoint = `http://${this.config.host}:${this.config.port}/v1/`
		this.httpUrlPlayerControl = `http://${this.config.host}:${this.config.port}/v1/studios/${this.config.studioId}/player/`
	}
	/**
	 * String concatenarion to create and encripted the header
	 */
	createEncriptedHeader(){
		this.httpAuthorizationHeader = `Basic ${(Buffer.from((`${this.config.user}:${this.config.pass}`), 'utf-8')).toString('base64')}`;
	}

	/**
 	* Request to obtain the token from YES API GATEWAY 
 	*/
	async connectToYesApyGatweway(){	
		try {
			const url = `${this.httpEndpoint}token`;
			const body = JSON.stringify({})
			const response = await fetch(url, {
				method: 'post',
				body: JSON.stringify(body),
				headers: {
					'Content-Type': 'application/json',
					'Authorization': this.httpAuthorizationHeader
				}
			});
			const data = await response.json();
			if (data.accessToken){
				this.token = data.accessToken;
				this.tokenExpireDate = Date.parse(data.expireDate);
				console.log('Connected to: YES API GATEWAY')
			} else {
				this.status(this.STATUS_WARNING, 'Connecting')
			}
		} catch(error) {
		console.log('Error in connection with Yes Api Gateway: ',error)
		}
		this.tokenStatusRefresher()
	}
	/**
	 * Promise for setting the time of token refresher
	 */
	async tokenStatusRefresher(){
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (this.openConnectionForToken === true) {
					resolve([
						this.connectToYesApyGatweway()
					])
				} else {
					reject(console.log('Connection with YES API Gateway: Closed'))
				}
			}, 300000)
		}).catch(function () {
     console.log("Refresh token Ended");
		})
	}
	/*
	* Request the status of the player
	*/
	async getCurrentStatus(){
		try {	
			const url = `${this.httpUrlPlayerControl}status`;
			const response = await fetch(url, {
				method: 'get',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.token}`
				}
			});
			const data = await response.json();
			/*
			Check if the selected clip (with action method 'selectById') is the same of the current clip id
			The selection of the clip (variable:selectedClipId) is made by the button 'up' and 'down' 
			The current selection of the clip (variable: currentClip...) is made in this method and use in the request of the other buttons(play, pause,...)
			When you open a rundown or init the app, checkListOfClips true set for only once the selected clip at the first element of the clips.
			*/
			if (data.clips.length){
				console.log('<heartbeat>')
				if (this.checkListOfClips === true){
					this.doActions(`${this.httpUrlPlayerControl}select?clipId=${data.clips[0].id}`)
					this.checkListOfClips = false;
				}
				if (data.selectedClip.id === this.currentClipId){ 
					this.currentClipStatus = data.clips[this.currentClipIndexOf].status; 
					this.setVariableNameAndStatus();
					this.checkFeedbacks();
				} else {
					this.clips = data.clips;
					this.selectedClipId = data.selectedClip.id;
					this.currentClipIndexOf = data.clips.findIndex(object => {
						return object.id === data.selectedClip.id;
					})
					if (this.currentClipIndexOf === -1){this.currentClipIndexOf = 0}
					this.currentClipName = data.clips[this.currentClipIndexOf].title;
					this.currentClipId = data.clips[this.currentClipIndexOf].id;
					this.currentClipLength = data.clips.length;
					this.currnetClipParamsId = `?clipId=${this.currentClipId}`
					this.currentClipStatus = data.clips[this.currentClipIndexOf].status;
					this.setVariableNameAndStatus();
					this.checkFeedbacks()
				}
			} else {
					this.currentClipStatus = 500;
					this.currentClipName = 'NO DATA'
					this.setVariableNameAndStatus()
					this.checkFeedbacks()
					this.checkListOfClips = true;
			}

		} catch (error) {
			console.log(error)
		}
		this.clipStatusRefresher();
	}
	/*
	* Change the name of the button preset (check in presets.js) "Show Currtent Clip" and "Show Currtent Status"
	*/
	setVariableNameAndStatus(){
		this.setVariableValues({ [`NAME_CURRENT_CLIP`]: `${this.currentClipName}` })
		let status = this.currentClipStatus;
		switch (status) {
			case 0: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'CUEING'});break;
			case 1: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'CUED'});break;
			case 2: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'PREROLL'});break;
			case 3: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'ON AIR'});break;
			case 4: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'READY'});break;
			case 5: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'OFFLINE'});break;
			case 6: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'NOT LINKED'});break;
			case 7: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'EXCLUDED'});break;
			case 8: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'AS RUN'});break;
			case 9: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'PAUSED'});break;
			case 10: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'PLACEHOLDER'});break;
			case 11: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'LOOP'}); break;
			default: 	this.setVariableValues({['STATUS_CURRENT_CLIP']: 'NO STATUS'});break;
			}
	}

	async clipStatusRefresher(){
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (this.openConnectionForStatus === true) {
					resolve([
						this.getCurrentStatus()
					])
				} else {
					reject(console.log('clipStatusRefresher: STOPPED'))
				}
			}, this.checkStatusTime)
		}).catch(function () {
     console.log("Clips status check: ENDED");
		})
	}
	/**
	 * Create Endpoint based on the different ACTIONS params
	 */
	actionCallManager(action , param){
		if(param){
			switch(param){
				case 'id':
				this.doActions(`${this.httpUrlPlayerControl}${action}${this.currnetClipParamsId}`) 
				return 
				case 'clipUp':
				this.changeClipInInUseUp(`${this.httpUrlPlayerControl}${action}`)
				return 
				case 'clipDown':
				this.changeClipInInUseDown(`${this.httpUrlPlayerControl}${action}`)
				return 
				case 'loop':
				this.setLoopClipById(`${this.httpUrlPlayerControl}${action}${this.currnetClipParamsId}`)
				return
			}
		} else {
				this.doActions(`${this.httpUrlPlayerControl}${action}`) 
				return 
		}
	}
	/**
	 * Call for all the action
	 */
	doActions(endpoint){
	const response = fetch(endpoint,{
		method: 'put',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${this.token}`, 
			},
		});
	}
	/*
	* Method in the button ArrowUp that change the id of the selection
	*/
	changeClipInInUseUp(endpoint){
		if(this.currentClipIndexOf === 0){
			return
		} else {
			this.doActions(`${endpoint}?clipId=${this.clips[this.currentClipIndexOf-1].id}`);
		}
	}
	/*
	* Method in the button ArrowDown that change the id of the selection
	*/
	changeClipInInUseDown(endpoint){
		if(this.currentClipIndexOf === (this.currentClipLength-1)){
			return
		} else {
			this.doActions(`${endpoint}?clipId=${this.clips[this.currentClipIndexOf+1].id}`);
		}
	}
	/*
	* Check if the clip is already on loop or not 
	*/
	setLoopClipById(endpoint){
		this.currentClipLoopNumber = 1
		if (this.currentClipStatus === 11){
			this.currentClipLoopNumber = 0
		}
    this.doActions(`${endpoint}&loop=${this.currentClipLoopNumber}`);
	}
}
runEntrypoint(ModuleInstance, UpgradeScripts)