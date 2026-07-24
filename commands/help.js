const { SlashCommandBuilder } = require('discord.js');
const { buildHelpEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder().setName('help').setDescription('Show the Vouch Bot help menu'),

  async execute(interaction) {
    await interaction.reply({ embeds: [buildHelpEmbed(interaction.guild)] });
  }
};
