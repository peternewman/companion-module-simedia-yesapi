const instance_skel = require('../../instance_skel');
const actions = require('./actions');
const presets = require('./presets');
const feedback = require('./feedback');
const { updateVariableDefinitions } = require('./variables');
const fetch = require ('node-fetch');
const {Worker } = require('worker_threads');

class instance extends instance_skel {
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
	//Variables of the token
		token = '';
		tokenExpireDate;
	//Variables of the worker (there are two web workers that work as a parallel thread)
		workerTokenRefresher;
		workerStatus;
		workerCheckStatusTime;
	//Variables for control the workers
		workerForTokenStatus = false;
		workerForStateStatus = false;

		constructor(system,id,config) {
			super(system,id,config);
				Object.assign(this, {
					...actions,
					...presets,
					...feedback
				})
				this.updateVariableDefinitions = updateVariableDefinitions
		}
/*
 * Module config fields
 */
		config_fields() {
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
					type: 'dropdown',
					id: 'requestStatus',
					label: 'Request Status Time (millisecond)',
					default: 2,
					choices: [
						{ id: '1', label: 500 },
						{ id: '2', label: 750 },
						{ id: '3', label: 1000 },
						{ id: '4', label: 2000 },
						{ id: '5', label: 20000 }
					  ],
					width: 4,
					required: true,
				},
			]
		}

		destroy() {
			this.workerTokenRefresher.terminate();
			this.workerStatus.terminate();
		}
/*
 * init at the start
 */
		init(){
			this.status(this.STATUS_WARNING, 'Connecting')
			this.initActions();
			this.initPresets();
			this.initVariables();
			this.initFeedbacks();
			if (this.config.host && this.config.port && this.config.pass && this.config.user) {
				try {
					if (this.workerForTokenStatus == true || this.workerForStateStatus == true){
						this.endThread()
					}
				}catch (error){
					console.log('Error from: INIT', error)
				}finally{
					this.loadingOrder();
				}
			}
			 else {
				this.log('warn', 'Please ensure your server IP and server port are correct in the module settings')
			}
		}
/*
 * Update every time you change the module
 */
		updateConfig(config) {    
			this.config = config

			if (this.config.host && this.config.port && this.config.pass && this.config.user) {
				try {
					if (this.workerForTokenStatus == true || this.workerForStateStatus == true){
						this.endThread()
					}
				}catch (error){
					console.log('Error ', error)
					this.endThread()
				}finally{
					this.loadingOrder();
				}
			} else {
				this.log('warn', 'Please ensure your server IP, Port, User and Pass are correct in the module settings')
			}
		}

/*
 * Setting the refresh time for the method workerForStatus
 */
		async loadingOrder(){
			this.setRefreshTime();
			this.currentClipIndexOf = 0;
			this.currentClipId = 'Finding id...';
			this.currentClipName = 'Finding asset...';
			this.createUrl();
			this.createEncriptedHeader();
			await this.connectToYesApyGatweway();
			this.workerForRefresToken();
			this.workerForStatus();
			this.setVariable('NAME_CURRENT_CLIP', this.currentClipName);
		}
/**
 * Setting the refresh time for the method workerForStatus
 */
		setRefreshTime(){
			switch (this.config.requestStatus){
					case '1':
					this.workerCheckStatusTime = 500;
					break;

					case '2':
					this.workerCheckStatusTime = 750;
					break;

					case '3':
					this.workerCheckStatusTime = 1000;
					break;

					case '4':
					this.workerCheckStatusTime = 2000;
					break;

					case '5':
					this.workerCheckStatusTime = 20000;
					break;
			}
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
					this.status(this.STATUS_OK)
					this.token = data.accessToken;
					this.tokenExpireDate = Date.parse(data.expireDate);
				} else {
					this.status(this.STATUS_WARNING, 'Connecting')
				}
			} catch (error) {
				console.log('Error in connection with Yes Api Gateway: ',error)
			}
		}
/**
 * Load the feedback (feedbacks.js)
 */
		initFeedbacks() {
			this.setFeedbackDefinitions(this.getFeedbacks())
		}
/**
 * Load the action (actions.js)
 */
		initActions() {
			this.setActions(this.getActions())
		}
/**
 * Load the variables
 */
		initVariables() {
			this.setVariableDefinitions([
				{
					label: 'Current Clip Selected',
					name: 'NAME_CURRENT_CLIP',
				}
			])
			this.setVariableDefinitions([
				{
					label: 'Current Clip Status',
					name: 'STATUS_CURRENT_CLIP',
				}
			])
		}
/**
 * Load the presets (presets.js)
 */
		initPresets() {
			this.setPresetDefinitions(this.getPresets())
		}
/**
 * setup a method for every action
 */
		action(action) {
			let id = action.action
			switch (id) {
				case 'cue':
				this.cueById();
				break;

				case 'play':
				this.playById();
				break;

				case 'pause':
				this.pauseById();
				break;

				case 'next clip':
				this.nextClip();
				break;

				case 'loop':
				this.setLoopClipById();
				break;

				case 'stop':
				this.stopAll();
				break;

				case 'stop clip':
				this.stopById();
				break;

				case 'selection up':
				this.changeClipInInUseUp();
				break;

				case 'selection down':
				this.changeClipInInUseDown();
				break;
			}
		}
/*
* Cue the clip
*/
			cueById(){
				const url = `${this.httpUrlPlayerControl}cue${this.currnetClipParamsId}`;
				const response = fetch(url,{
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					},
				});
			}
/*
* Play the clip
*/
			playById(){
				const url = `${this.httpUrlPlayerControl}play${this.currnetClipParamsId}`;
				const response = fetch(url, {
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					}
				});
			}
/*
* Pause the clip
*/
			pauseById(){
				const url = `${this.httpUrlPlayerControl}pause${this.currnetClipParamsId}`;
				const response = fetch(url, {
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					}
				});
			}
/*
* Change the clip selected
*/
			selectById(id){
				const url = `${this.httpUrlPlayerControl}select${id}`;
				const response = fetch(url, {
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					}
				});
			}
/*
* Next clip
*/
			stopById(){
				const url = `${this.httpUrlPlayerControl}stop${this.currnetClipParamsId}`;
				const response = fetch(url, {
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					},
				});
			}
/*
* Stop all the clips
*/
			stopAll(){
				const url = `${this.httpUrlPlayerControl}stopall`;
				const response = fetch(url, {
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					}
				});
			}
/*
* Next clip
*/
			nextClip(){
				const url = `${this.httpUrlPlayerControl}next`;
				const response = fetch(url, {
					method: 'put',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					}
				});
			}
/*
* Check if the clip is already on loop or not 
*/
			setLoopClipById(){
					this.currentClipLoopNumber = 1
				if (this.currentClipStatus === 11){
					this.currentClipLoopNumber = 0
				}
                this.loopClipById();
			}
/*
* Loop the clip 
*/
			loopClipById(){
				const url = `${this.httpUrlPlayerControl}loop${this.currnetClipParamsId}&loop=${this.currentClipLoopNumber}`;
				const body = JSON.stringify({})
				const response = fetch(url, {
					method: 'put',
					body: JSON.stringify(body),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.token}`,
					},
					params: { clipId: this.currentClipId }
				});
			}
/*
* Method in the button ArrowUp that change the id of the selection
*/
			changeClipInInUseUp(){
				if(this.currentClipIndexOf === 0){
					return
				} else {
					this.selectById(`?clipId=${this.clips[this.currentClipIndexOf-1].id}`);
				}
				
			}
/*
* Method in the button ArrowDown that change the id of the selection
*/
			changeClipInInUseDown(){
				if(this.currentClipIndexOf === (this.currentClipLength-1)){
					return
				} else {
					this.selectById(`?clipId=${this.clips[this.currentClipIndexOf+1].id}`);
				}
			}

/*
* Request the status of the player
*/
			async getCurrentStatus(){
				try {	
					const url = `${this.httpUrlPlayerControl}status`;
					const body = JSON.stringify({})
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
					*/
					if (this.selectedClipId == false){
						this.selectedClipId = this.currentClipId;
					}
					if (data.clips.length){
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
						this.checkFeedbacksOnControlButton();

						let item = data.clips.find(x => x.id === this.selectedClipId)
						if (item == false){
							this.selectById(`?clipId=${data.clips[0].id}`);
							this.selectedClipId = data.clips[0].id;
						}

					} else {
						this.selectedClipId = '';
						this.currentClipStatus = 500;
						this.currentClipName = 'NO DATA'
						this.setVariableNameAndStatus()
						this.checkFeedbacksOnControlButton();
					}
					} catch (error) {
						console.log(error)
					}
				}
/*
* Check trough the feedbacks if something has changed (feedback are in feedback.js and used in presets.js)
*/
			checkFeedbacksOnControlButton(){
				this.checkFeedbacks('cueDeactivated')
				// this.checkFeedbacks('cueActivated')
				this.checkFeedbacks('playDeactivated')
				// this.checkFeedbacks('playActivated')
				this.checkFeedbacks('pauseDeactivated')
				// this.checkFeedbacks('pauseActivated')
				this.checkFeedbacks('nextClipDeactivated')
				this.checkFeedbacks('loopDeactivated')
				// this.checkFeedbacks('loopActivated')
				this.checkFeedbacks('stopDeactivated')
				this.checkFeedbacks('stopClipDeactivated')
				this.checkFeedbacks('ChangeClipUpDeactivated')
				this.checkFeedbacks('ChangeClipDownDeactivated')
				this.checkFeedbacks('currentStatusColor')
			}
/*
* Change the name of the button preset (check in presets.js) "Show Currtent Clip" and "Show Currtent Status"
*/
			setVariableNameAndStatus(){
				this.setVariable('NAME_CURRENT_CLIP', this.currentClipName);
				let status = this.currentClipStatus;
				switch (status) {
					case 0:
					this.setVariable('STATUS_CURRENT_CLIP', 'CUEING');
					break;
	
					case 1:
					this.setVariable('STATUS_CURRENT_CLIP', 'CUED');
					break;
	
					case 2:
					this.setVariable('STATUS_CURRENT_CLIP', 'PREROLL');
					break;

					case 3:
					this.setVariable('STATUS_CURRENT_CLIP', 'ON AIR');
					break;

					case 4:
					this.setVariable('STATUS_CURRENT_CLIP', 'READY');
					break;

					case 5:
					this.setVariable('STATUS_CURRENT_CLIP', 'OFFLINE');
					break;

					case 6:
					this.setVariable('STATUS_CURRENT_CLIP', 'NOT LINKED');
					break;

					case 7:
					this.setVariable('STATUS_CURRENT_CLIP', 'EXCLUDED');
					break;

					case 8:
					this.setVariable('STATUS_CURRENT_CLIP', 'AS RUN');
					break;

					case 9:
					this.setVariable('STATUS_CURRENT_CLIP', 'PAUSED');
					break;

					case 10:
					this.setVariable('STATUS_CURRENT_CLIP', 'PLACEHOLDER');
					break;

					case 11:
					this.setVariable('STATUS_CURRENT_CLIP', 'LOOP');
					break;

					default:
					this.setVariable('STATUS_CURRENT_CLIP', 'NO STATUS');
					break;
				}
			}
/**
 * this worker call the method to connect to YES APY GATEWAY every 5 minutes to refresh the token and auto-restart by calling itself
 */
			workerForRefresToken(){
				this.workerForTokenStatus = true;
				this.workerTokenRefresher = new Worker('./module-local-dev/si-media-yes-api-gateway/tokenRefresh.js', {
					workerData: {
						num: this.tokenExpireDate
					}
				});
				this.workerTokenRefresher.on("message", (result) => this.restartWorkerForRefresToken());
				this.workerTokenRefresher.on("error", (error) => {console.log(error)});
				this.workerTokenRefresher.on("close", () => console.log('closed!', closing));
			}
			async restartWorkerForRefresToken(){
				this.connectToYesApyGatweway();
				this.workerForRefresToken();
			}
/**
 * this worker call the method to connect to GET THE STATUS every X millisecond to refresh the token and auto-restart by calling itself
 * (Millisecond depends on the Config you can set during module connections)
 */
			workerForStatus(){
				this.workerForStateStatus = true;
				this.workerStatus = new Worker('./module-local-dev/si-media-yes-api-gateway/obtainStatus.js', {
					workerData: {
						num: this.workerCheckStatusTime
					}
				});
				this.workerStatus.on("message", (result) => this.restartWorkerForStatus());
				this.workerStatus.on("error", (error) => {console.log(error)});
				this.workerStatus.on("close", (closing) => {console.log('closed!', closing)});
			}

			async restartWorkerForStatus(){
				await this.getCurrentStatus();
				this.workerForStatus();
			}

			endThread(){
				this.workerTokenRefresher.terminate();
				this.workerStatus.terminate();
			}
		}
exports = module.exports = instance;