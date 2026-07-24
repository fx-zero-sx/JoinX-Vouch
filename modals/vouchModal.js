const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} = require('discord.js');

const MODAL_ID = 'vouch_submit_modal';
const FIELD_PRODUCT = 'vouch_product';
const FIELD_RATING = 'vouch_rating';
const FIELD_REVIEW = 'vouch_review';

function buildVouchModal() {
  const modal = new ModalBuilder().setCustomId(MODAL_ID).setTitle('Submit a Review');

  const productInput = new TextInputBuilder()
    .setCustomId(FIELD_PRODUCT)
    .setLabel('Product Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. Discord Nitro')
    .setMaxLength(100)
    .setRequired(true);

  const ratingInput = new TextInputBuilder()
    .setCustomId(FIELD_RATING)
    .setLabel('Rating (1-5)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('5')
    .setMinLength(1)
    .setMaxLength(1)
    .setRequired(true);

  const reviewInput = new TextInputBuilder()
    .setCustomId(FIELD_REVIEW)
    .setLabel('Review Message')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Tell us about your experience...')
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(productInput),
    new ActionRowBuilder().addComponents(ratingInput),
    new ActionRowBuilder().addComponents(reviewInput)
  );

  return modal;
}

module.exports = {
  buildVouchModal,
  MODAL_ID,
  FIELD_PRODUCT,
  FIELD_RATING,
  FIELD_REVIEW
};
