const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const dbCommands = require('./dbCommands');
const commandTypes = ["commands", "modals"];

dbCommands.init();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

for(let commandType of commandTypes){
	client[commandType] = new Collection();
	const foldersPath = path.join(__dirname, commandType);
	const commandFolders = fs.readdirSync(foldersPath);

	for (const folder of commandFolders) {
		const commandsPath = path.join(foldersPath, folder);
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				client[commandType].set(command.data.name, command);
			} else {
				console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}
	}
}

client.once(Events.ClientReady, () => {
	console.log('Ready!');
});

client.on(Events.InteractionCreate, async interaction => {
	if (interaction.isChatInputCommand()){
		interactionChatInputCommand(interaction);
		return;
	}

	if (interaction.isModalSubmit()){
		interactionModalSubmit(interaction);
		return;
	}
});

function interactionChatInputCommand(interaction){
	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}

function interactionModalSubmit(interaction){
	const command = client["modals"].get(interaction.customId);

	if (!command) return;

	try {
		command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
}

client.login(token);