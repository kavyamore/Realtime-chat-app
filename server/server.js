const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const Message = require("./models/Message");
const Group = require("./models/Group");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");
const reactionRoutes = require("./routes/reactionRoutes");
const groupRoutes = require("./routes/groupRoutes");
const User = require("./models/User"); // Make sure this is near the top

dotenv.config();

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ==========================================
// EXPRESS HTTP ROUTES (ORDER MATTERS!)
// ==========================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// FIXED: This SPECIFIC route must come BEFORE the generic messageRoutes!
// FETCH GROUP MESSAGES
app.get("/api/messages/group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId: groupId });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching group messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Now Express can safely load the generic message routes
app.use("/api/messages", messageRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/groups", groupRoutes);

// UNREAD COUNTS ROUTE
app.get("/api/unread/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Find all messages sent TO this user that are NOT marked as 'seen'
    const unreadMessages = await Message.find({
      receiver: username,
      status: { $ne: "seen" } 
    });

    // Group them by the sender 
    const unreadCounts = {};
    unreadMessages.forEach((msg) => {
      unreadCounts[msg.sender] = (unreadCounts[msg.sender] || 0) + 1;
    });

    res.json(unreadCounts);
  } catch (error) {
    console.error("Error fetching unread counts:", error);
    res.status(500).json({ error: "Failed to fetch unread counts" });
  }
});

app.get("/", (req, res) => {
  res.send("Server Running");
});

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// ==========================================
// SOCKET.IO REAL-TIME LISTENERS
// ==========================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});
const onlineUsers = {};

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_room", (username) => {
    socket.join(username);
    onlineUsers[username] = socket.id;
    console.log(`${username} joined their room`);
    io.emit("online_users", Object.keys(onlineUsers));
  });

  // JOIN GROUP ROOM
  socket.on("join_group", (groupId) => {
    socket.join(groupId);
    console.log(`User joined group room: ${groupId}`);
  });

  // --- UPGRADED TYPING INDICATOR ---
  socket.on("typing", ({ sender, receiver, groupId }) => {
    if (groupId) {
      // Tell everyone in the group (except the sender)
      socket.to(groupId).emit("display_typing", { sender });
    } else if (receiver) {
      // Tell the specific user in a 1-on-1 chat
      socket.to(receiver).emit("display_typing", { sender });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const username in onlineUsers) {
      if (onlineUsers[username] === socket.id) {
        delete onlineUsers[username];
        break;
      }
    }
    io.emit("online_users", Object.keys(onlineUsers));
  });

  socket.on("send_message", async (data) => {
    try {
      // 1. Save to database 
      const message = await Message.create({
        sender: data.sender,
        receiver: data.receiver || null,
        groupId: data.groupId || null, 
        text: data.text,
        status: "sent",
        replyTo: data.replyTo || null
      });

      // 2. Broadcast the message
      if (data.groupId) {
        // If it's a group message, send it to the Group Room
        io.to(data.groupId).emit("receive_message", message);
      } else {
        // If it's a direct message, send it to the receiver AND the sender
        io.to(data.receiver).emit("receive_message", message);
        io.to(data.sender).emit("receive_message", message);
      }
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("mark_as_read", async ({ sender, receiver }) => {
    try {
      await Message.updateMany(
        { sender: sender, receiver: receiver, status: { $ne: "seen" } },
        { $set: { status: "seen" } }
      );
      
      io.to(sender).emit("message_status_updated", {
        sender: sender,
        receiver: receiver, 
        status: "seen"
      });
      
    } catch (error) {
      console.error("Error updating read status:", error);
    }
  });

  // DELETE MESSAGE LISTENER
  socket.on("delete_message", async (message) => {
    try {
      await Message.findByIdAndUpdate(
        message._id,
        {
          isDeleted: true,
          deletedText: "This message was deleted",
          text: "",
          img: "",
        }
      );

      io.emit("message_deleted", message._id);
    } catch (error) {
      console.error("Delete message error:", error);
    }
  });

  socket.on("delete_for_me", async ({ messageId, username }) => {
    try {
      await Message.findByIdAndUpdate(
        messageId,
        {
          $addToSet: {
            deletedFor: username,
          },
        }
      );

      socket.emit("message_deleted_for_me", messageId);
    } catch (error) {
      console.error("Delete for me error:", error);
    }
  });

  // EDIT MESSAGE LISTENER
  socket.on("edit_message", async ({ messageId, newText }) => {
    try {
      // 1. Update the database (and flag it as edited)
      const updatedMsg = await Message.findByIdAndUpdate(
        messageId,
        { text: newText, $set: { isEdited: true } },
        { new: true } // Returns the updated document
      );

      if (!updatedMsg) return;

      // 2. Broadcast the change to the right people
      if (updatedMsg.groupId) {
        io.to(updatedMsg.groupId).emit("message_edited", { messageId, newText });
      } else {
        io.to(updatedMsg.receiver).emit("message_edited", { messageId, newText });
        io.to(updatedMsg.sender).emit("message_edited", { messageId, newText });
      }
    } catch (error) {
      console.error("Error editing message:", error);
    }
  });

  socket.on("disconnect", async () => {
    console.log("User disconnected:", socket.id);
    let disconnectedUser = null;

    // Find who just disconnected
    for (const username in onlineUsers) {
      if (onlineUsers[username] === socket.id) {
        disconnectedUser = username;
        delete onlineUsers[username];
        break;
      }
    }

    // NEW: Save their "Last Seen" timestamp to the database
    if (disconnectedUser) {
      try {
        await User.findOneAndUpdate(
          { username: disconnectedUser },
          { lastSeen: new Date() }
        );
      } catch (error) {
        console.error("Error saving last seen:", error);
      }
    }

    io.emit("online_users", Object.keys(onlineUsers));
  });

  socket.on("leave_group", async ({ groupId, username }) => {
    try {
      const group = await Group.findById(groupId);

      if (!group) return;

      const systemMessage = await Message.create({
        sender: "System",
        groupId,
        text: `👋 ${username} left the group`,
        isSystem: true,
      });

      io.to(groupId).emit(
        "receive_message",
        systemMessage
      );

      group.members = group.members.filter(
        (member) => member !== username
      );

      await group.save();

      io.to(groupId).emit(
        "group_updated",
        group
      );
    } catch (error) {
      console.error(
        "Error leaving group:",
        error
      );
    }
  });

  socket.on("group_updated", ({ group, addedBy, newMembers }) => {
    io.emit("group_updated", group);

    const systemMessage = {
      _id: Date.now(),
      sender: "System",
      groupId: group._id,
      text: `➕ ${addedBy} added ${newMembers.join(
        ", "
      )}`,
      isSystem: true,
    };

    io.to(group._id).emit(
      "receive_message",
      systemMessage
    );
  });
  
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});