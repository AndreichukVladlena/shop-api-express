const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/test", (req, res) => {
  res.json("test ok");
});

app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
  })
);

app.listen(4000);
