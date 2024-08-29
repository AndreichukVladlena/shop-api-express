const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
  title: String,
  color: String,
  photos: [String],
  description: String,
  perks: [String],
  productType: String,
  width: Number,
  height: Number,
  weight: Number,
  price: Number,
});

const ItemModel = mongoose.model("Item", itemSchema);

module.exports = ItemModel;
