const express = require("express");
const router = express.Router();

const User = require("../models/User");

router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

// GET USER PROFILE
router.get("/profile/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// UPDATE USER PROFILE
router.put("/profile/:username", async (req, res) => {
  try {
    const { email, bio, avatar } = req.body;
    const updatedUser = await User.findOneAndUpdate(
      { username: req.params.username },
      { email, bio, avatar },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

router.put("/update", async (req, res) => {
  try {
    const { username, email, bio, avatar } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { username },
      {
        email,
        bio,
        avatar,
      },
      { new: true }
    ).select("-password");

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      error: "Failed to update profile",
    });
  }
});

module.exports = router;