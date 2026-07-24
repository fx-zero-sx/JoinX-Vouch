const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Buttons shown under every posted review: Helpful, Favorite, Copy Review.
 */
function buildReviewActionRow(reviewId, helpfulCount, favoriteCount) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vouch_helpful_${reviewId}`)
      .setLabel(`Helpful (${helpfulCount})`)
      .setEmoji('❤️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vouch_favorite_${reviewId}`)
      .setLabel(`Favorite (${favoriteCount})`)
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vouch_copy_${reviewId}`)
      .setLabel('Copy Review')
      .setEmoji('📋')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Previous/Next pagination row for /reviews. Disables buttons at the boundaries.
 */
function buildPaginationRow(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vouch_page_${page - 1}`)
      .setLabel('Previous')
      .setEmoji('⬅')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId(`vouch_page_${page + 1}`)
      .setLabel('Next')
      .setEmoji('➡')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page >= totalPages)
  );
}

module.exports = { buildReviewActionRow, buildPaginationRow };
