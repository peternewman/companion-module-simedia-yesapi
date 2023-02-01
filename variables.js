exports.initVariables = function () {
	const variables = [
		{
			name: 'Current Clip Selected',
			variableId: 'NAME_CURRENT_CLIP',
		},
		{
			name: 'Current Clip Status',
			variableId: 'STATUS_CURRENT_CLIP',
		}
  ]
	this.setVariableDefinitions(variables)
}