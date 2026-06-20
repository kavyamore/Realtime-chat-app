const express = require("express");
const router = express.Router();
const Group = require("../models/Group"); // Assuming you saved the schema here
const Message = require("../models/Message");

// 1. CREATE A NEW GROUP
router.post("/create", async (req, res) => {
  try {
    const { name, members, admin } = req.body;

    // Ensure the admin is also included in the members list
    if (!members.includes(admin)) {
      members.push(admin);
    }

    const newGroup = await Group.create({
      name: name,
      members: members,
      admin: admin
    });

    res.status(201).json(newGroup);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// 2. GET ALL GROUPS FOR A SPECIFIC USER
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Find groups where this user's username is inside the 'members' array
    const groups = await Group.find({ members: username });

    res.status(200).json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.put("/:groupId/leave", async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({
        message: "Group not found",
      });
    }

    group.members = group.members.filter((member) => member !== username);
    await group.save();
    io.to(group._id).emit("group_notification", {
      groupId: group._id,
      text: `👋 ${username} left the group`,
    });
    res.json(group);
  } catch (error) {res.status(500).json({message: error.message});
  }
});

router.put("/:id/add-members", async (req, res) => {
  try {
    const { members } = req.body;

    const group = await Group.findById(req.params.id);

    if (!group) {
      return res
        .status(404)
        .json({ error: "Group not found" });
    }

    group.members = [
      ...new Set([
        ...group.members,
        ...members,
      ]),
    ];

    await group.save();

    const systemMessage = await Message.create({
      sender: "System",
      groupId: group._id,
      text: `➕ ${req.body.addedBy} added ${members.join(", ")}`,
      isSystem: true,
    });

    res.json({
      group,
      systemMessage,
    });

    await group.save();

    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to add members",
    });
  }
});
module.exports = router;