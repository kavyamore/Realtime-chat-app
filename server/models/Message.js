const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },

    receiver: {
      type: String,
    },

    text: {
      type: String,
      required: true,
    },

    reactions: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      default: "sent",
    },

    groupId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Group",
      default: null 
    },

    replyTo: { 
      type: Object, // Will store { sender: "Kavyaa", text: "Hello!" }
      default: null
    },

    email: { 
    type: String, 
    default: "" 
  },

  bio: { 
    type: String, 
    default: "Hey there! I'm using this chat app." 
  },

  avatar: { 
    type: String, 
    default: "" 
  },
  
  img: { 
    type: String,
    default: "" ,
  },

  deletedFor: {
    type: [String],
    default: [],
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

  deletedText: {
    type: String,
    default: "",
  },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Message",
  messageSchema
);