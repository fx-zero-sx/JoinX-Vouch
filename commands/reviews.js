const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const db = require('../database/database');
const config = require('../config/config.json');
const { buildReviewsListEmbed } = require('../utils/embeds');
const { buildPaginationRow } = require('../components/buttons');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reviews')
    .setDescription('Browse recent customer reviews'),

  async execute(interaction) {
    await interaction.deferReply();

    const totalCount = db.getReviewCount();
    const totalPages = Math.max(1, Math.ceil(totalCount / config.reviewsPerPage));
    const page = 1;

    const reviews = db.getReviewsPage(page, config.reviewsPerPage);
    const embed = buildReviewsListEmbed(reviews, page, totalPages, totalCount, interaction.guild);
    const row = buildPaginationRow(page, totalPages);

    await interaction.editReply({
      embeds: [embed],
      components: totalCount > 0 ? [row] : []
    });
  }
};
