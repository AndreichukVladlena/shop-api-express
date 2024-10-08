const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const Item = require("./models/Item.js");
const CartItem = require("./models/CartItem.js");
const multer = require("multer");
const fs = require("fs");

require("dotenv").config();

const app = express();

const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = "jhnfkddjdiguoie84i";

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

mongoose.connect(process.env.MONGO_URL);

function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userDoc = await User.create({
      name,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });
    res.json(userDoc);
  } catch (e) {
    res.status(422).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await User.findOne({ email });
  if (userDoc) {
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
      jwt.sign(
        {
          email: userDoc.email,
          id: userDoc._id,
        },
        jwtSecret,
        {},
        (err, token) => {
          if (err) throw err;
          res.cookie("token", token).json(userDoc);
        }
      );
    } else {
      res.status(422).json("password not ok");
    }
  } else {
    res.json("not found");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  if (token) {
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const { name, email, _id } = await User.findById(userData.id);
      res.json({ name, email, _id });
    });
  } else {
    res.json(null);
  }
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json(true);
});

app.post("/upload-by-link", async (req, res) => {
  const { link } = req.body;
  const newName = "photo" + Date.now() + ".jpg";
  await imageDownloader.image({
    url: link,
    dest: __dirname + "/uploads/" + newName,
  });
  res.json(newName);
});

const photosMiddleware = multer({ dest: "uploads/" });
app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
  const uploadedFiles = [];
  let newPath;
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    uploadedFiles.push(newPath.replace("uploads/", ""));
  }
  res.json(uploadedFiles);
});

app.post("/items", (req, res) => {
  const { token } = req.cookies;
  const {
    title,
    color,
    addedPhotos,
    description,
    perks,
    productType,
    width,
    height,
    weight,
    price,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    if (err) throw err;

    const ItemDoc = await Item.create({
      title,
      color,
      photos: addedPhotos,
      description,
      perks,
      productType,
      width,
      height,
      weight,
      price,
    });
    res.json(ItemDoc);
  });
});

app.get("/items/:id", async (req, res) => {
  const { id } = req.params;
  res.json(await Item.findById(id));
});

app.put("/items", async (req, res) => {
  const { token } = req.cookies;
  const {
    id,
    title,
    color,
    addedPhotos,
    description,
    perks,
    productType,
    width,
    height,
    weight,
    price,
  } = req.body;
  jwt.verify(token, jwtSecret, {}, async (err, userData) => {
    const itemDoc = await Item.findById(id);

    itemDoc.set({
      title,
      color,
      photos: addedPhotos,
      description,
      perks,
      productType,
      width,
      height,
      weight,
      price,
    });
    await itemDoc.save();
    res.json("ok");
  });
});

app.get("/items", async (req, res) => {
  const filters = {};

  if (req.query.title) {
    filters.title = { $regex: req.query.title, $options: "i" };
  }

  if (req.query.color) {
    filters.color = req.query.color;
  }

  if (req.query.productType) {
    filters.productType = req.query.productType;
  }

  if (req.query.minPrice || req.query.maxPrice) {
    filters.price = {};
    if (req.query.minPrice) filters.price.$gte = req.query.minPrice;
    if (req.query.maxPrice) filters.price.$lte = req.query.maxPrice;
  }

  if (req.query.minWidth || req.query.maxWidth) {
    filters.width = {};
    if (req.query.minWidth) filters.width.$gte = req.query.minWidth;
    if (req.query.maxWidth) filters.width.$lte = req.query.maxWidth;
  }

  if (req.query.minHeight || req.query.maxHeight) {
    filters.height = {};
    if (req.query.minHeight) filters.height.$gte = req.query.minHeight;
    if (req.query.maxHeight) filters.height.$lte = req.query.maxHeight;
  }

  if (req.query.minWeight || req.query.maxWeight) {
    filters.weight = {};
    if (req.query.minWeight) filters.weight.$gte = req.query.minWeight;
    if (req.query.maxWeight) filters.weight.$lte = req.query.maxWeight;
  }

  try {
    const items = await Item.find(filters);
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/cart", async (req, res) => {
  const userData = await getUserDataFromRequest(req);
  const { item, name, phone, amount, price } = req.body;
  CartItem.create({
    item,
    name,
    phone,
    amount,
    price,
    user: userData.id,
  })
    .then((doc) => {
      res.json(doc);
    })
    .catch((err) => {
      throw err;
    });
});

app.get("/cart", async (req, res) => {
  const userData = await getUserDataFromRequest(req);
  res.json(await CartItem.find({ user: userData.id }).populate("item"));
});

app.listen(4000);
