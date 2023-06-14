const dbCommands = require('../../dbCommands');

module.exports = {
	data: {
		name:"commentModal"
	},
	async execute(interaction) {
		const commentInput = interaction.fields.getTextInputValue("commentInput");

		await interaction.reply({ content: "Comment added", ephemeral: true});
	},
};