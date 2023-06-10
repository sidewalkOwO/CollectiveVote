const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database("./epd.db");
//const dbCommands = require('./dbCommands');

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
		
		https.get("https://server.collective.gg/api/cardByImgUrl/" + encodeURIComponent(cardLink), res => {
			let data = [];
			
			res.on('data', chunk => {
				data.push(chunk);
			});

			res.on('end', () => {
				const json = JSON.parse(Buffer.concat(data).toString());

				try{
					let name = json["card"]["name"];
					let ownerId = json["card"]["owner_id"];

					if(name && ownerId){
						if(submissionType=="UPDATE"){
							submitUpdate(name, ownerId);
						}
						else{
							submitCard(name, ownerId);
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

		function submitCard(name, ownerId){
			try{
				var sqlCheck = "SELECT link FROM Card WHERE cardName=?";
				db.get(sqlCheck, [name], (err, row) => {
					if(row && row["link"]){
						interaction.reply(row["link"] + "\n" + "Already exists!");
						return;
					}
					else{
						var sqlInsert = "INSERT INTO Card (cardName,link,creator,submitter,createTime,week)";
						sqlInsert += " VALUES (?,?,?,?,datetime('now'), FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) ) ";
						db.run(sqlInsert, [name, cardLink, ownerId, interaction.user.id]);

						var sqlInsert = "INSERT INTO Submission (cardName,type,link,linkBefore,submitter,optionalText,createTime,week)";
						sqlInsert += " VALUES (?,?,?,?,?,?,datetime('now'), FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) ) ";
						db.run(sqlInsert, [name, submissionType, cardLink, null, interaction.user.id, optionalText]);

						db.get("SELECT LAST_INSERT_ROWID() AS insertId", (err, row) => {
							//console.log(JSON.stringify(row));

							if(row && row["insertId"]){
								submissionReply(row["insertId"], name, ownerId);
							}
							else{
								interaction.reply("Submission failed!\n(Database error)");
							}
						});
					}
				});
			}
			catch(err){
				console.log(err);
				interaction.reply("database error");
				return;
			}
		}

		function submitUpdate(name, ownerId){
			try{
				var sqlCheck = "SELECT link FROM Card WHERE cardName=?";
				db.get(sqlCheck, [name], (err, row) => {
					if(row && row["link"]){
						var sqlInsert = "WITH RESULT AS (SELECT ? AS cardName, ? AS type, ? AS link";
						sqlInsert += ",? AS linkBefore,? AS submitter,? AS optionalText";
						sqlInsert += ",datetime('now') AS createTime, FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) AS week )";
						sqlInsert += "INSERT INTO Submission (cardName,type,link,linkBefore,submitter,optionalText,createTime,week)";
						sqlInsert += "SELECT * FROM RESULT ";
						sqlInsert += "WHERE NOT EXISTS (SELECT 1 FROM Submission S WHERE S.type=RESULT.type AND S.link=RESULT.link AND S.week=RESULT.week) ";
						db.run(sqlInsert, [name, submissionType, cardLink, row["link"], interaction.user.id, optionalText]);
						
						db.get("SELECT LAST_INSERT_ROWID() AS insertId", (err, row) => {
							//console.log(JSON.stringify(row));
							
							if(row && row["insertId"]){
								submissionReply(row["insertId"], name, ownerId);
							}
							else{
								interaction.reply(cardLink + "\n" + "Same Update already submitted this week!");
							}
						});
					}
					else{
						interaction.reply(cardLink + "\n" + "Card to update not in game yet!");
						return;
					}
				});
			}
			catch(err){
				console.log(err);
				interaction.reply("database error");
				return;
			}
		}

		function submissionReply(submissionId, name, ownerId){
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
			if(submissionType=="CARD"){
				replyContent = "[Card]";
			}
			else if(submissionType=="DC"){
				replyContent = "[DC]";
			}
			else if(submissionType=="UPDATE"){
				replyContent = "[Update]";
			}

			replyContent += " " + name;
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
							content = "You have upvoted the submission 👍";
							voteReply(b, content);
							break;
						}
						case "Downvote":{
							content = "You have downvoted the submission 👎";
							voteReply(b, content);
							break;
						}
						case "Novote":{
							content = "You are neutral to the submission 👐";
							voteReply(b, content);
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
	},
};