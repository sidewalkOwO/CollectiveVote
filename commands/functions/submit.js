const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require('discord.js');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database("./epd.db");

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
		const card_link = interaction.options.getString('card_link');
		const optional_text = interaction.options.getString('optional_text');
		const submission_type = interaction.options.getString('submission_type')||"CARD";
		
		https.get("https://server.collective.gg/api/cardByImgUrl/" + encodeURIComponent(card_link), res => {
			let data = [];
			
			res.on('data', chunk => {
				data.push(chunk);
			});

			res.on('end', () => {
				const json = JSON.parse(Buffer.concat(data).toString());

				try{
					let name = json["card"]["name"];
					let owner_id = json["card"]["owner_id"];

					if(name && owner_id){
						if(submission_type=="UPDATE"){
							submitUpdate(name, owner_id);
						}
						else{
							submitCard(name, owner_id);
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

		function submitCard(name, owner_id){
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
						db.run(sqlInsert, [name, card_link, owner_id, interaction.user.id]);

						var sqlInsert = "INSERT INTO Submission (cardName,type,link,linkBefore,submitter,optional_text,createTime,week)";
						sqlInsert += " VALUES (?,?,?,?,?,?,datetime('now'), FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) ) ";
						db.run(sqlInsert, [name, submission_type, card_link, null, interaction.user.id, optional_text]);

						console.log("insert success");

						submissionReply(name, owner_id);
					}
				});
			}
			catch(err){
				console.log(err);
				interaction.reply("database error");
				return;
			}
		}

		function submitUpdate(name, owner_id){
			try{
				var sqlCheck = "SELECT link FROM Card WHERE cardName=?";
				db.get(sqlCheck, [name], (err, row) => {
					if(row && row["link"]){
						var sqlInsert = "WITH RESULT AS (SELECT ? AS cardName, ? AS type, ? AS link";
						sqlInsert += ",? AS linkBefore,? AS submitter,? AS optional_text";
						sqlInsert += ",datetime('now') AS createTime, FLOOR( (JULIANDAY(datetime('now')) - JULIANDAY(date('2018-04-05')))/7 ) AS week )";
						sqlInsert += "INSERT INTO Submission (cardName,type,link,linkBefore,submitter,optional_text,createTime,week)";
						sqlInsert += "SELECT * FROM RESULT ";
						sqlInsert += "WHERE NOT EXISTS (SELECT 1 FROM Submission S WHERE S.type=RESULT.type AND S.link=RESULT.link AND S.week=RESULT.week) ";
						db.run(sqlInsert, [name, submission_type, card_link, row["link"], interaction.user.id, optional_text]);
						
						db.get("select changes() AS ok", (err, row) => {
							if(row && row["ok"]){
								submissionReply(name, owner_id);
							}
							else{
								interaction.reply(card_link + "\n" + "Same Update already submitted this week!");
							}
						});
					}
					else{
						interaction.reply(card_link + "\n" + "Card to update not in game yet!");
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

		function submissionReply(name, owner_id){
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
			if(submission_type=="CARD"){
				replyContent = "[Card]";
			}
			else if(submission_type=="DC"){
				replyContent = "[DC]";
			}
			else if(submission_type=="UPDATE"){
				replyContent = "[Update]";
			}

			replyContent += " " + name;
			if(optional_text){
				replyContent += " (" + optional_text + ")";
			}
			replyContent += "\n" + card_link + "\n" + "Submitted!"
			
			interaction.reply({
				content: replyContent,
				components: [row],
			})
			.then((response)=>{
				const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button });

				collector.on('collect', async (b) => {
					if(b.customId == "Upvote"){
						await b.reply({ content: "You have upvoted the submission", ephemeral: true });
					}
					else if(b.customId == "Downvote"){
						await b.reply({ content: "You have downvoted the submission", ephemeral: true });
					}
					else if(b.customId == "Novote"){
						await b.reply({ content: "You are neutral to the submission", ephemeral: true });
					}
				});
			});
		}
	},
};