const express = require("express");
const router = express.Router();

const Message = require("../models/Message");

router.put("/:id", async (req, res) => {
  try {
    const { emoji } = req.body;

    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    message.reactions.push(emoji);

    await message.save();

    res.status(200).json(message);

  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
});

module.exports = router;