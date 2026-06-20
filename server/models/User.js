const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      default: ""
    },

    password: {
      type: String,
      required: true,
    },

    bio: { 
      type: String, 
      default: "" 
    },

    avatar: {
      type: String,
      default: "",
    },

    lastSeen: {
      type: Date,
      default: Date.now
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);