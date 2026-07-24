const { EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');

function starString(rating) {
  const filled = '★'.repeat(rating);
  const empty = '☆'.repeat(5 - rating);
  return filled + empty;
}

function formatReviewId(id) {
  return `#${String(id).padStart(config.reviewIdPadding, '0')}`;
}

/**
 * Builds the premium review embed posted in the vouch channel and shown in /reviews.
 */
function buildReviewEmbed(review, guild) {
  const timestampSeconds = Math.floor(review.timestamp / 1000);

  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle('⭐ Verified Customer Review')
    .setDescription(starString(review.rating))
    .addFields(
      { name: '👤 Customer', value: `<@${review.userId}>`, inline: true },
      { name: '🛒 Product', value: review.product, inline: true },
      { name: '\u200B', value: '\u200B', inline: false },
      { name: '💬 Review', value: review.review },
      {
        name: '\u200B',
        value: `🆔 Review ${formatReviewId(review.id)}\n🕒 <t:${timestampSeconds}:F>`
      }
    );

  if (review.imageUrl) {
    embed.setImage(review.imageUrl);
  }

  if (guild?.iconURL()) {
    embed.setFooter({ text: guild.name, iconURL: guild.iconURL() });
  }

  return embed;
}

/**
 * Builds a compact embed for one page of the /reviews list (10 per page).
 */
function buildReviewsListEmbed(reviews, page, totalPages, totalCount, guild) {
  const embed = new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle('⭐ Customer Reviews')
    .setFooter({
      text: `Page ${page}/${totalPages} • ${totalCount} total review${totalCount === 1 ? '' : 's'}`,
      iconURL: guild?.iconURL() ?? undefined
    });

  if (reviews.length === 0) {
    embed.setDescription('No reviews yet. Be the first to `/vouch`!');
    return embed;
  }

  const lines = reviews.map((r) => {
    const timestampSeconds = Math.floor(r.timestamp / 1000);
    return [
      `**${formatReviewId(r.id)}** • ${starString(r.rating)} • **${r.product}**`,
      `> ${r.review.length > 120 ? `${r.review.slice(0, 117)}...` : r.review}`,
      `> <@${r.userId}> • <t:${timestampSeconds}:R> • ❤️ ${r.helpfulCount}  ⭐ ${r.favoriteCount}`
    ].join('\n');
  });

  embed.setDescription(lines.join('\n\n'));
  return embed;
}

function buildHelpEmbed(guild) {
  return new EmbedBuilder()
    .setColor(config.embedColor)
    .setTitle('⭐ Vouch Bot — Help')
    .setDescription('A premium way to collect and showcase customer reviews.')
    .addFields(
      {
        name: '/vouch',
        value: 'Submit a review for a product via a quick popup form (product, rating 1–5, message, optional image). Limited to once every 10 minutes per user.'
      },
      {
        name: '/reviews',
        value: 'Browse recent reviews with ⬅ Previous / ➡ Next pagination, 10 per page.'
      },
      {
        name: '/delete',
        value: 'Remove a review by its Review ID. Requires the **Manage Server** permission.'
      },
      {
        name: '/help',
        value: 'Shows this menu.'
      }
    )
    .setFooter({ text: guild?.name ?? 'Vouch Bot', iconURL: guild?.iconURL() ?? undefined });
}

module.exports = {
  starString,
  formatReviewId,
  buildReviewEmbed,
  buildReviewsListEmbed,
  buildHelpEmbed
};
