module.exports = {
	/**
	 * INTERNAL: Get the available actions.
	 *
	 * @returns {Object[]} the available actions
	 * @access protected
	 * @since 1.3.0
	 */
	getActions() {
		let actions = {}

		actions['get_studios'] = {
			label: 'get the studios',
		}


		//MEDIA CONTROL ACTIONS 
		actions['cue'] = {
			label: 'Cue',
		}

		actions['play'] = {
			label: 'Play',
		}

		actions['pause'] = {
			label: 'Pause',
		}

		actions['next clip'] = {
			label: 'Next Clip',
		}
		
		actions['loop'] = {
			label: 'Loop',
		}

		actions['loop sequence'] = {
			label: 'Loop Sequence',
		}

		actions['stop'] = {
			label: 'Stop',
		}

		actions['stop clip'] = {
			label: 'Stop Clip',
		}

		actions['selection up'] = {
			label: 'Selection Up',
		}

		actions['selection down'] = {
			label: 'Selection Down',
		}

		return actions
    },
}