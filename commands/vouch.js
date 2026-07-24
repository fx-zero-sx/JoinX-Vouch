const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { buildVouchModal } = require('../modals/vouchModal');
const { setPendingImage } = require('../utils/pendingImages');
const db = require('../database/database');
const config = require('../config/config.json');
const { formatDuration } = require('../utils/cooldown');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vouch')
    .setDescription('Submit a review for a product you purchased')
    .addAttachmentOption((option) =>
      option.setName('image').setDescription('Optional screenshot or proof image').setRequired(false)
    ),

  async execute(interaction) {
    const remaining = db.getCooldownRemaining(interaction.user.id, config.cooldownMs);
    if (remaining > 0) {
      await interaction.reply({
        content: `⏳ You can submit another vouch in ${formatDuration(remaining)}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const image = interaction.options.getAttachment('image');
    if (image) {
      if (!image.contentType?.startsWith('image/')) {
        await interaction.reply({
          content: '❌ That attachment doesn\'t look like an image. Please attach a PNG, JPG, GIF, or WEBP file.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }
      setPendingImage(interaction.user.id, image.url);
    }

    await interaction.showModal(buildVouchModal());
  }
};
