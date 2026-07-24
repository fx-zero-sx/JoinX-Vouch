const { Events, MessageFlags } = require('discord.js');
const db = require('../database/database');
const config = require('../config/config.json');
const { MODAL_ID, FIELD_PRODUCT, FIELD_RATING, FIELD_REVIEW } = require('../modals/vouchModal');
const { takePendingImage } = require('../utils/pendingImages');
const { buildReviewEmbed, buildReviewsListEmbed, formatReviewId } = require('../utils/embeds');
const { buildReviewActionRow, buildPaginationRow } = require('../components/buttons');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
      } else if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
        await handleVouchSubmit(interaction);
      } else if (interaction.isButton()) {
        await handleButton(interaction);
      }
    } catch (error) {
      console.error('Error handling interaction:', error);
      await safeErrorReply(interaction);
    }
  }
};

async function handleSlashCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  await command.execute(interaction);
}

async function handleVouchSubmit(interaction) {
  const product = interaction.fields.getTextInputValue(FIELD_PRODUCT).trim();
  const rawRating = interaction.fields.getTextInputValue(FIELD_RATING).trim();
  const review = interaction.fields.getTextInputValue(FIELD_REVIEW).trim();

  const rating = Number.parseInt(rawRating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    await interaction.reply({
      content: '❌ Rating must be a whole number between 1 and 5. Please run `/vouch` again.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const imageUrl = takePendingImage(interaction.user.id);

  const savedReview = db.createReview({
    userId: interaction.user.id,
    username: interaction.user.username,
    product,
    rating,
    review,
    imageUrl,
    timestamp: Date.now()
  });

  db.setCooldown(interaction.user.id);

  const vouchChannelId = process.env.VOUCH_CHANNEL_ID;
  const targetChannel = vouchChannelId
    ? await interaction.guild.channels.fetch(vouchChannelId).catch(() => null)
    : interaction.channel;

  if (!targetChannel || !targetChannel.isTextBased()) {
    await interaction.editReply({
      content: '⚠️ Your review was saved, but the vouch channel is not configured correctly. Please contact a server admin.'
    });
    return;
  }

  const embed = buildReviewEmbed(savedReview, interaction.guild);
  const row = buildReviewActionRow(savedReview.id, savedReview.helpfulCount, savedReview.favoriteCount);

  const posted = await targetChannel.send({ embeds: [embed], components: [row] });
  db.attachMessageInfo(savedReview.id, posted.id, posted.channelId);

  await interaction.editReply({
    content: `✅ Thanks for your review! It's been posted as ${formatReviewId(savedReview.id)} in <#${targetChannel.id}>.`
  });
}

async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId.startsWith('vouch_page_')) {
    await handlePagination(interaction);
    return;
  }

  if (customId.startsWith('vouch_helpful_') || customId.startsWith('vouch_favorite_')) {
    await handleVote(interaction);
    return;
  }

  if (customId.startsWith('vouch_copy_')) {
    await handleCopy(interaction);
  }
}

async function handlePagination(interaction) {
  const requestedPage = Number.parseInt(interaction.customId.replace('vouch_page_', ''), 10);
  const totalCount = db.getReviewCount();
  const totalPages = Math.max(1, Math.ceil(totalCount / config.reviewsPerPage));
  const page = Math.min(Math.max(requestedPage, 1), totalPages);

  const reviews = db.getReviewsPage(page, config.reviewsPerPage);
  const embed = buildReviewsListEmbed(reviews, page, totalPages, totalCount, interaction.guild);
  const row = buildPaginationRow(page, totalPages);

  await interaction.update({ embeds: [embed], components: [row] });
}

async function handleVote(interaction) {
  const isHelpful = interaction.customId.startsWith('vouch_helpful_');
  const type = isHelpful ? 'helpful' : 'favorite';
  const reviewId = Number.parseInt(interaction.customId.replace(`vouch_${type}_`, ''), 10);

  const review = db.getReview(reviewId);
  if (!review) {
    await interaction.reply({
      content: '❌ This review no longer exists.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const added = db.addVote(reviewId, interaction.user.id, type);
  if (!added) {
    await interaction.reply({
      content: `❌ You've already marked this review as ${type}.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const updatedReview = db.getReview(reviewId);
  const row = buildReviewActionRow(reviewId, updatedReview.helpfulCount, updatedReview.favoriteCount);

  await interaction.update({ components: [row] });
}

async function handleCopy(interaction) {
  const reviewId = Number.parseInt(interaction.customId.replace('vouch_copy_', ''), 10);
  const review = db.getReview(reviewId);

  if (!review) {
    await interaction.reply({
      content: '❌ This review no longer exists.',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
  const text = [
    `Review ${formatReviewId(review.id)}`,
    `Product: ${review.product}`,
    `Rating: ${stars} (${review.rating}/5)`,
    '',
    review.review
  ].join('\n');

  await interaction.reply({
    content: `\`\`\`\n${text}\n\`\`\``,
    flags: MessageFlags.Ephemeral
  });
}

async function safeErrorReply(interaction) {
  const payload = {
    content: '❌ Something went wrong while processing that. Please try again.',
    flags: MessageFlags.Ephemeral
  };
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload);
    } else {
      await interaction.reply(payload);
    }
  } catch (err) {
    console.error('Failed to send error reply:', err);
  }
}
