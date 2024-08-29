const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Item" },
  user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  amount: { type: Number },
  price: { type: Number },
});

const CartItemModel = mongoose.model("CartItem", cartItemSchema);

module.exports = CartItemModel;
