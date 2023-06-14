const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const https = require('https');
const dbCommands = require('../../dbCommands');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('submit')
		.setDescription('submit card for voting')
		.addStringOption(option =>
            option.setName('card_link')
                .setDescription('example:https://files.collective.gg/p/cards/d1769110-eb8f-11e9-8dd7-ad389da86c72-m.png')
                .setRequired(true)
		)
		.addStringOption(option =>
            option.setName('optional_text')
                .setDescription('optional text displayed in parentheses')
		)
		.addStringOption(option =>
            option.setName('submission_type')
                .setDescription('optional type like [CARD],[UPDATE],[DC] - default is [CARD]')
				.addChoices(
					{ name: 'CARD', value: 'CARD' },
					{ name: 'UPDATE', value: 'UPDATE' },
					{ name: 'DC', value: 'DC' },
				)
		),
	async execute(interaction) {
		const cardLink = interaction.options.getString('card_link');
		const optionalText = interaction.options.getString('optional_text');
		const submissionType = interaction.options.getString('submission_type')||"CARD";

		const typeToTag = {"CARD":"[Card]", "DC":"[DC]", "UPDATE":"[Update]"};
		
		https.get("https://server.collective.gg/api/cardByImgUrl/" + encodeURIComponent(cardLink), res => {
			let data = [];
			
			res.on('data', chunk => {
				data.push(chunk);
			});

			res.on('end', () => {
				const json = JSON.parse(Buffer.concat(data).toString());

				try{
					let cardName = json["card"]["name"];
					let ownerId = json["card"]["owner_id"];

					if(cardName && ownerId){
						if(submissionType=="UPDATE"){
							submitUpdate(cardName, ownerId);
						}
						else{
							submitCard(cardName, ownerId);
						}
					}
					else{
						interaction.reply('Submission failed! Empty card name.');
					}
				}
				catch(err){
					console.error(err);
					interaction.reply('Submission failed! Invalid card format from server.');
				}
			});
		}).on('error', err => {
			console.log('Error: ', err.message);
			interaction.reply('Submission failed! Unable to fetch card from server.');
		});

		function submitCard(cardName, ownerId){
			try{
				dbCommands.selectLink(cardName).then(
					(fetchLink) => {//success
						interaction.reply(fetchLink + "\n" + "Already exists!");
				  	}, 
					(fail) => {//fail
						dbCommands.insertSubmissionCard(cardName, submissionType, cardLink, ownerId, interaction.user.id, optionalText).then(
							(insertId) => {//success
								submissionReply(insertId, cardName, ownerId);
							}, 
							(fail) => {//fail
								interaction.reply("Submission failed!\n(Database error)");
							}
						);
					}
				);
			}
			catch(err){
				console.log(err);
				interaction.reply("database error");
			}
		}

		function submitUpdate(cardName, ownerId){
			try{
				dbCommands.selectLink(cardName).then(
					(fetchLink) => {//success
						
						dbCommands.insertSubmissionUpdate(cardName, submissionType, cardLink, fetchLink, interaction.user.id, optionalText).then(
							(insertId) => {//success
								submissionReply(insertId, cardName, ownerId);
							}, 
							(fail) => {//fail
								interaction.reply(cardLink + "\n" + "Same Update already submitted this week!");
							}
						);
				  	}, 
					(fail) => {//fail
						interaction.reply(cardLink + "\n" + "Card to update not in game yet!");
					}
				);
			}
			catch(err){
				console.log(err);
				interaction.reply("database error");
			}
		}

		function submissionReply(submissionId, cardName, ownerId){
			const bt_upvote = new ButtonBuilder()
				.setCustomId('Upvote')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('👍');

			const bt_novote = new ButtonBuilder()
				.setCustomId('Novote')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('👐');

			const bt_downvote = new ButtonBuilder()
				.setCustomId('Downvote')
				.setStyle(ButtonStyle.Primary)
				.setEmoji('👎');

			const row = new ActionRowBuilder()
				.addComponents(bt_upvote, bt_novote, bt_downvote);
			

			var replyContent = "";
			
			var tag = typeToTag[submissionType];
			if(!tag){
				tag = "";
			}
			replyContent += tag;

			replyContent += " " + cardName;
			if(optionalText){
				replyContent += " (" + optionalText + ")";
			}
			replyContent += "\n" + cardLink + "\n" + "Submitted!";

			//console.log(replyContent);
			
			interaction.reply({
				content: replyContent,
				components: [row],
			})
			.then((response)=>{
				const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button });

				collector.on('collect', async (b) => {
					var content = "";
					switch(b.customId){
						case "Upvote":{
							dbCommands.vote(submissionId, interaction.user.id, 1);

							content = "You have upvoted the submission 👍";
							voteReply(b, content);

							break;
						}
						case "Downvote":{
							dbCommands.vote(submissionId, interaction.user.id, -1);

							content = "You have downvoted the submission 👎";
							voteReply(b, content);

							break;
						}
						case "Novote":{
							dbCommands.vote(submissionId, interaction.user.id, 0);

							content = "You are neutral to the submission 👐";
							voteReply(b, content);

							break;
						}
						case "Comment":{
							content = "Comment for the " + tag + " " + cardName + " :";
							commentReply(b, content);
							break;
						}
					}
				});
			});
		}

		function voteReply(collected, content){
			const bt_comment = new ButtonBuilder()
			.setCustomId('Comment')
			.setStyle(ButtonStyle.Primary)
			.setLabel('Add Comment');

			const row = new ActionRowBuilder()
				.addComponents(bt_comment);

			collected.reply({ content: content, ephemeral: true, components: [row] });
		}

		function commentReply(collected, content){
			const modal = new ModalBuilder()
			.setCustomId('commentModal')
			.setTitle('Add Comment');

			const commentInput = new TextInputBuilder()
			.setCustomId('commentInput')
			.setLabel(content)
			.setStyle(TextInputStyle.Paragraph);

			const firstActionRow = new ActionRowBuilder().addComponents(commentInput);

			modal.addComponents(firstActionRow);

			collected.showModal(modal);
		}
	},
};