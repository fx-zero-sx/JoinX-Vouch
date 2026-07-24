const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../database/database');
const { formatReviewId } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Delete a review by its Review ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((option) =>
      option
        .setName('review_id')
        .setDescription('The numeric Review ID, e.g. 124 for #00124')
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    // Defense in depth: also verify at runtime in case defaults were overridden in Server Settings.
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: '❌ You need the **Manage Server** permission to use this command.',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const reviewId = interaction.options.getInteger('review_id', true);
    const review = db.getReview(reviewId);

    if (!review) {
      await interaction.reply({
        content: `❌ No review found with ID ${formatReviewId(reviewId)}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Try to clean up the posted embed too, but don't fail the command if that's not possible.
    if (review.channelId && review.messageId) {
      try {
        const channel = await interaction.guild.channels.fetch(review.channelId);
        if (channel?.isTextBased()) {
          const message = await channel.messages.fetch(review.messageId);
          await message.delete();
        }
      } catch {
        // Message or channel may already be gone — safe to ignore.
      }
    }

    db.deleteReview(reviewId);

    await interaction.editReply({
      content: `✅ Deleted review ${formatReviewId(reviewId)} (${review.product}) submitted by <@${review.userId}>.`
    });
  }
};
