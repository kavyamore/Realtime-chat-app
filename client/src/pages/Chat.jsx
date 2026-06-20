import React, { useState, useEffect, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import { io } from "socket.io-client";

const socket = io("https://realtime-chat-app-61zl.onrender.com");


const Chat = () => {
  // ==========================================
  // 1. STATE VARIABLES
  // ==========================================
  const currentUser = localStorage.getItem("username") || "TestUser"; // Fallback for testing
  const token = localStorage.getItem("token");

  const [users, setUsers] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const [typingIndicator, setTypingIndicator] = useState("");
  const typingTimeoutRef = useRef(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [emojiPickerId, setEmojiPickerId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editMsgText, setEditMsgText] = useState("");
  const [deleteMsg, setDeleteMsg] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ email: "", bio: "", avatar: "" });
  const [showViewProfileModal, setShowViewProfileModal] = useState(false);
  const [viewProfileData, setViewProfileData] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editBioText, setEditBioText] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [groupInfo, setGroupInfo] = useState(null);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [membersToAdd, setMembersToAdd] = useState([]);

  // ==========================================
  // 2. USE EFFECTS (Data Fetching & Sockets)
  // ==========================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    socket.emit("join_room", currentUser);

    const fetchUsersAndGroups = async () => {
      try {
        const userRes = await fetch("https://realtime-chat-app-61zl.onrender.com/api/users");
        const userData = await userRes.json();
        setUsers(userData.filter(u => u.username !== currentUser));

        const groupRes = await fetch(`https://realtime-chat-app-61zl.onrender.com/api/groups/${currentUser}`);
        const groupData = await groupRes.json();
        setGroups(groupData);

        const unreadRes = await fetch(`https://realtime-chat-app-61zl.onrender.com/api/unread/${currentUser}`);
        const unreadData = await unreadRes.json();
        setUnreadCounts(unreadData);
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchUsersAndGroups();

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
      if (data.sender !== currentUser) {
        setUnreadCounts((prev) => ({
          ...prev,
          [data.sender]: (prev[data.sender] || 0) + 1
        }));
      }
    };

    const handleTyping = ({ sender }) => {
      setTypingIndicator(`${sender} is typing...`);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingIndicator("");
      }, 3000);
    };

    const handleStatusUpdated = ({ sender, receiver, status }) => {
      setMessages((prev) => prev.map(msg => 
        (msg.sender === sender && msg.receiver === receiver) ? { ...msg, status } : msg
      ));
    };

    const handleMessageDeleted = (messageId) => {
      setMessages((prev) => prev.map((msg) => msg._id === messageId ? {...msg,isDeleted: true, deletedText: "This message was deleted",text: "", img: ""}
            : msg
        ));
    };

    const handleMessageEdited = ({ messageId, newText }) => {
      setMessages((prev) => prev.map((msg) =>
        msg._id === messageId ? { ...msg, text: newText, isEdited: true } : msg
      ));
    };

    const handleOnlineUsers = (users) => {
      setActiveUsers(users);
    };


    socket.on("receive_message", handleReceiveMessage);
    socket.on("display_typing", handleTyping);
    socket.on("message_status_updated", handleStatusUpdated);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_edited", handleMessageEdited);
    socket.on("online_users", handleOnlineUsers);
    socket.on("message_deleted_for_me", (messageId) => {
    setMessages((prev) =>prev.filter((msg) => msg._id !== messageId));
  });
  socket.on("group_notification", (data) => {setMessages((prev) => [...prev,
      {_id: Date.now().toString(), sender: "System", text: data.text, isSystem: true, createdAt: new Date().toISOString()},
    ]);
  });

  socket.on("group_updated", (updatedGroup) => {setGroups((prev) => {
      const exists = prev.some((g) =>g._id === updatedGroup._id);

      if (exists) {return prev.map((g) =>g._id === updatedGroup._id ? updatedGroup: g);
      }
      if (updatedGroup.members.includes(currentUser)
      ) {return [...prev, updatedGroup];}

      return prev;
    });

    if (selectedGroup?._id === updatedGroup._id) {setSelectedGroup(updatedGroup)}
    if (groupInfo?._id === updatedGroup._id) {setGroupInfo(updatedGroup)}
    });
    
   return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("display_typing", handleTyping);
      socket.off("message_status_updated", handleStatusUpdated);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_edited", handleMessageEdited);
      socket.off("online_users", handleOnlineUsers);
      socket.off("message_deleted_for_me");
      socket.off("group_notification");
      socket.off("group_updated");
    };
  }, [currentUser]);

    useEffect(() => {
      const fetchMessages = async () => {
        try {
          if (selectedUser) {
            const res = await fetch(`https://realtime-chat-app-61zl.onrender.com/api/messages/${currentUser}/${selectedUser.username}`);
            const data = await res.json();
            setMessages(data);
            socket.emit("mark_as_read", { sender: selectedUser.username, receiver: currentUser });
            setUnreadCounts((prev) => ({ ...prev, [selectedUser.username]: 0 }));
          } else if (selectedGroup) {
            socket.emit("join_group", selectedGroup._id);

            const res = await fetch(
              `https://realtime-chat-app-61zl.onrender.com/api/messages/group/${selectedGroup._id}`
            );

            const data = await res.json();
            setMessages(data);
          }
        } catch (error) {
          console.error("Error fetching messages:", error);
        }};
      if (selectedUser || selectedGroup) {fetchMessages()}

    }, [selectedUser, selectedGroup, currentUser]);

  // ==========================================
  // 3. HELPER FUNCTIONS
  // ==========================================
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatar = (username) => {
    if (username === currentUser) return profileData.avatar || null;
    const user = users.find(u => u.username === username);
    return user?.avatar || null;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result); // This is the Base64 string!
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarChange = (e) => { 
    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {setSelectedAvatar(reader.result)};
    reader.readAsDataURL(file);
  };

  const sendMessage = () => {
    if (message.trim() === "" && !selectedImage) return; // Allow sending if there's an image OR text
    
    const newMsg = {
      sender: currentUser,
      receiver: selectedUser ? selectedUser.username : null,
      groupId: selectedGroup ? selectedGroup._id : null,
      text: message,
      img: selectedImage,
      replyTo: replyingTo ? { sender: replyingTo.sender, text: replyingTo.text } : null,
      _id: String(Date.now()), 
      createdAt: new Date().toISOString(), 
      status: "sent", 
      reactions: []
    };
    
    setMessages((prev) => [...prev, newMsg]);
    socket.emit("send_message", newMsg);
    
    setMessage("");
    setSelectedImage(null); 
    setReplyingTo(null);
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await fetch(`https://realtime-chat-app-61zl.onrender.com/api/reactions/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      if (selectedUser) {
        const res = await fetch(`https://realtime-chat-app-61zl.onrender.com/api/messages/${currentUser}/${selectedUser.username}`);
        setMessages(await res.json());
      } else if (selectedGroup) {
        const res = await fetch(`https://realtime-chat-app-61zl.onrender.com/api/messages/group/${selectedGroup._id}`);
        setMessages(await res.json());
      }
    } catch (error) {
      console.error(error);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const res = await fetch("https://realtime-chat-app-61zl.onrender.com/api/groups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({name: newGroupName, description: newGroupDescription, admin: currentUser,members: [currentUser, ...selectedMembers]})
      });
      const data = await res.json();
      setGroups([...groups, data]);
      setShowGroupModal(false);
      setNewGroupName("");
    } catch (error) {
      console.error("Error creating group:", error);
    }
  };

  const addMembers = async () => {
    try {
      const response = await fetch(
        `https://realtime-chat-app-61zl.onrender.com/api/groups/${selectedGroup._id}/add-members`,
        {
          method: "PUT", headers: {"Content-Type": "application/json"},
          body: JSON.stringify({members: membersToAdd, addedBy: currentUser}),
        });

      const data = await response.json();
      const updatedGroup = data.group;
      const systemMessage = data.systemMessage;

      socket.emit("group_updated", {group: updatedGroup,addedBy: currentUser,newMembers: membersToAdd});

      setGroups((prev) => prev.map((group) => group._id === updatedGroup._id? updatedGroup: group));

      setSelectedGroup(updatedGroup);
      setGroupInfo(updatedGroup);
      setMessages((prev) => [
        ...prev,
        systemMessage,
      ]);

      setShowAddMembersModal(false);
      setShowGroupInfoModal(true);
      setMembersToAdd([]);
    } catch (error) {console.error("Failed to add members:", error)}
  };

  const openProfile = async () => {
    try {
      const res = await fetch(
        `https://realtime-chat-app-61zl.onrender.com/api/users/profile/${currentUser}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
    });

      const data = await res.json();

      if (data && !data.error) {setProfileData({email: data.email || "", bio: data.bio || "",avatar: data.avatar || ""});
        setEditEmail(data.email || "");
        setEditBioText(data.bio || "");
        setSelectedAvatar(data.avatar || "");
      }

      setShowProfileModal(true);
    } catch (error) {console.error("Failed to load profile:", error)}
  };


  const saveProfile = async () => {
    try {
      const res = await fetch(
      `https://realtime-chat-app-61zl.onrender.com/api/users/profile/${currentUser}`,
        {
          method: "PUT", headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`},
          body: JSON.stringify({username: currentUser, email: editEmail, bio: editBioText, avatar: selectedAvatar}),
        });

      const updatedUser = await res.json();

      setProfileData({email: updatedUser.email || "", bio: updatedUser.bio || "", avatar: updatedUser.avatar || ""});
      setUsers((prev) =>prev.map((u) =>u.username === currentUser? {...u, email: updatedUser.email, bio: updatedUser.bio, avatar: updatedUser.avatar}: u)
      );

      alert("Profile updated successfully!");
      setShowProfileModal(false);
    } catch (error) {console.error("Failed to update profile:", error);
  }};

  const fetchUserProfile = async (username) => {
    try {
      console.log("Fetching:", username);

      const res = await fetch(
        `https://realtime-chat-app-61zl.onrender.com/api/users/profile/${username}`
      );

      console.log("Status:", res.status);

      const data = await res.json();

      setViewProfileData(data);
      setShowViewProfileModal(true);
    } catch (error) {console.error(error);
  }};

  const handleTypingChange = (e) => {
    setMessage(e.target.value);
    
    if (selectedUser || selectedGroup) {
      socket.emit("typing", {sender: currentUser, receiver: selectedUser ? selectedUser.username : null, groupId: selectedGroup ? selectedGroup._id : null})}
  };

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;

    return (msg.text && msg.text.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const leaveGroup = () => {
    socket.emit("leave_group", {groupId: groupInfo._id, username: currentUser});

    setSelectedGroup(null);
    setShowGroupInfoModal(false);
    setGroupInfo(null);
  };

  // ==========================================
  // 4. MAIN UI RENDER
  // ==========================================
  return (
    <div style={{display: "flex", height: "100vh", background: "#F5F0E8", color: "#4B3A2F"}}>
      
      {/* --- SIDEBAR --- */}
      <div style={{width: "300px", background: "#EFE7DB", borderRight: "1px solid #8B6F47", color: "#4B3A2F"}}>
        <h2 style={{ margin: "0 0 20px 0", fontSize: "20px" }}>Chat App</h2>
        
        <button onClick={() => setShowGroupModal(true)} style={{ background: "#10b981", color: "white", padding: "10px", border: "none", borderRadius: "6px", cursor: "pointer", marginBottom: "20px", fontWeight: "bold" }}>
          + Create Group
        </button>

        <h3 style={{ fontSize: "14px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", marginBottom: "10px" }}>GROUPS</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0" }}>
          {groups.map((group) => (
            <li key={group._id} onClick={() => { setSelectedGroup(group); setSelectedUser(null); }} style={{padding: "12px 16px", marginBottom: "8px", borderRadius: "14px", cursor: "pointer", background:selectedGroup?._id === group._id? "#D8C9B4" : "transparent", border: selectedGroup?._id === group._id? "1px solid #8B6F47": "1px solid transparent", transition: "0.2s"}}>
              👥 {group.name}
            </li>
          ))}
        </ul>

        <h3 style={{ fontSize: "14px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", marginBottom: "10px" }}>DIRECT MESSAGES</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1, overflowY: "auto" }}>
          {users.map((user) => {
            const isOnline = activeUsers.includes(user.username);

            return (
              <li 
                key={user._id} 
                onClick={() => { setSelectedUser(user); setSelectedGroup(null); }} 
                style={{ padding: "10px", background:selectedUser?.username === user.username? "#D8C9B4": "transparent", border:selectedUser?.username === user.username? "1px solid #8B6F47": "1px solid transparent", borderRadius: "14px", padding: "12px 16px", marginBottom: "8px", transition: "0.2s", cursor: "pointer", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>👤 {user.username}</span>
                  {isOnline && (
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 5px #10b981" }} title="Online"></div>
                  )}
                </div>
                {unreadCounts[user.username] > 0 && (
                  <span style={{ background: "#ef4444", color: "white", fontSize: "12px", padding: "2px 6px", borderRadius: "10px" }}>{unreadCounts[user.username]}</span>
                )}
              </li>
            );
          })}
        </ul>

        {/* My Profile Button */}
        <div style={{ marginTop: "auto", paddingTop: "20px" }}>
          <button onClick={openProfile} style={{ width: "100%", padding: "10px", background: "#E6D8C3", color: "#4B3A2F", border: "1px solid #8B6F47", borderRadius: "12px", borderRadius: "6px", cursor: "pointer" }}>
            👤 My Profile
          </button>
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#F5F0E8" }}>
        
        {/* Chat Header (SEARCH BAR & LAST SEEN) */}
        <div style={{ padding: "20px", background: "#EFE7DB", borderBottom: "1px solid #8B6F47", color: "#4B3A2F", padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          {/* LEFT SIDE: Name & Last Seen */}
          <div>
            <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              {selectedUser ? `Chat with ${selectedUser.username}` : selectedGroup ? `Group: ${selectedGroup.name}` : "Select a User or Group"}
            </h2>
            {selectedGroup ? (
            <p style={{marginTop: "6px", fontSize: "13px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px"}}>
            {selectedGroup.members.length} members •{" "}{selectedGroup.members.join(", ")}
            </p>
            ) : selectedUser ? (
            <p style={{color: activeUsers.includes(selectedUser.username) ? "#22c55e" : "#94a3b8", fontSize: "13px", marginTop: "6px"}}>
            {activeUsers.includes(selectedUser.username)? "🟢 Online" : "⚫ Offline"}  
            </p>
            ) : null}
          </div>
          
          {/* RIGHT SIDE: Search & Profile */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {(selectedUser || selectedGroup) && (
              <input 
                type="text" 
                placeholder="🔍 Search chat..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #4b5563", background: "#111827", color: "white", outline: "none", fontSize: "14px" }}
              />
            )}
            {selectedUser && (
              <button onClick={() => fetchUserProfile(selectedUser.username)} style={{ background: "#374151", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>
                ℹ️ Profile
              </button>
            )}

            {selectedGroup && (<button onClick={() => {
              setGroupInfo(selectedGroup);
              setShowGroupInfoModal(true);
            }}
            style={{background: "#374151", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer"}}>
              ℹ️ Group Info
            </button>
            )}
          </div>
        </div>

        {/* Message List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {filteredMessages.length === 0 && (selectedUser || selectedGroup) ? (
            <p style={{ textAlign: "center", color: "gray", marginTop: "20px" }}>
              {searchQuery ? "No messages match your search." : "No messages yet..."}
            </p>
          ) : (
            filteredMessages.map((msg, index) => {
             if (msg.sender === "System") {
              return (
                <div key={msg._id}
                  style={{ textAlign: "center", margin: "20px 0"}}
                >
                <span style={{ color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", fontSize: "13px", fontStyle: "italic"}}>
                  {msg.text}
                </span>
                </div>
              );
            }
              const isMe = msg.sender === currentUser;
              const avatarUrl = getAvatar(msg.sender);

              return (
                <div 
                  key={msg._id || index} 
                  onMouseEnter={() => setHoveredMsgId(msg._id)}   
                  onMouseLeave={() => setHoveredMsgId(null)}      
                  style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", marginBottom: "20px", gap: "10px" }}
                >
                  
                  {/* Avatar */}
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#4b5563", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", flexShrink: 0 }}>
                    {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : msg.sender.charAt(0).toUpperCase()}
                  </div>

                  {/* Message Body */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", maxWidth: "65%" }}>
                    {!isMe && selectedGroup && <span style={{ fontSize: "12px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", marginBottom: "4px", marginLeft: "4px" }}>{msg.sender}</span>}
                    
                    {/* Bubble */}
                    <div style={{background: isMe? "#6B7D5D": "#FFFFFF", color: isMe? "white": "#4B3A2F", border: isMe? "none": "1px solid #C8B6A6", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", padding: "12px 16px", maxWidth: "65%", borderRadius: isMe? "20px 20px 6px 20px" : "20px 20px 20px 6px", wordBreak: "break-word" }}>
                      
                      {msg.replyTo && (
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "6px", marginBottom: "8px", fontSize: "12px", borderLeft: "3px solid #10b981" }}>
                          <strong style={{ color: "#34d399", display: "block" }}>{msg.replyTo.sender}</strong>
                          {msg.replyTo.text}
                        </div>
                      )}
                      
                    {msg.isDeleted ? (<span style={{fontStyle: "italic", opacity: 0.7}}> 🚫 {msg.deletedText} </span>) : ( <>
                      {msg.img && (
                        <img
                          src={msg.img}
                          alt="Attachment"
                          style={{maxWidth: "250px", maxHeight: "250px", objectFit: "cover", cursor: "pointer", borderRadius: "8px", marginBottom: msg.text ? "8px" : "0", }}  />)}
                      </>)}

                      {editingMsgId === msg._id ? (
                        <div style={{ display: "flex", gap: "5px", marginTop: "5px" }}>
                          <input type="text" value={editMsgText} onChange={(e) => setEditMsgText(e.target.value)} style={{ padding: "4px", borderRadius: "4px", border: "none" }} />
                          <button onClick={() => { setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, text: editMsgText, isEdited: true } : m)); socket.emit("edit_message", { messageId: msg._id, newText: editMsgText }); setEditingMsgId(null); }} style={{ background: "#10b981", color: "white", border: "none", padding: "4px", borderRadius: "4px", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setEditingMsgId(null)} style={{ background: "gray", color: "white", border: "none", padding: "4px", borderRadius: "4px", cursor: "pointer" }}>X</button>
                        </div>
                      ) : (
                        <>{msg.text} {msg.isEdited && <span style={{ fontSize: "10px", opacity: 0.6 }}>(edited)</span>}</>
                      )}
                    </div>

                    {/* Timestamp & Status */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", padding: "0 4px", fontSize: "11px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px" }}>
                      <span>{msg.createdAt ? formatTime(msg.createdAt) : ""}</span>
                      {isMe && !selectedGroup && <span style={{ color: "#60a5fa" }}>{msg.status}</span>}
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div style={{ marginTop: "4px", display: "flex", gap: "4px" }}>
                        {msg.reactions.map((r, i) => <span key={i} style={{ fontSize: "12px", background: "#4b5563", borderRadius: "10px", padding: "2px 6px" }}>{r}</span>)}
                      </div>
                    )}

                    {/* Action Buttons (HIDDEN UNTIL HOVERED) */}
                    <div style={{marginTop: "6px", display: "flex", flexWrap: "wrap", justifyContent: isMe ? "flex-end" : "flex-start", gap: "6px", alignItems: "center",
                      opacity: (hoveredMsgId === msg._id || emojiPickerId === msg._id) ? 1 : 0, 
                      visibility: (hoveredMsgId === msg._id || emojiPickerId === msg._id) ? "visible" : "hidden",
                      transition: "opacity 0.2s ease-in-out", position: "relative" 
                    }}>
                      
                      <button 
                        onClick={() => setEmojiPickerId(emojiPickerId === msg._id ? null : msg._id)} 
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px" }}
                      >
                        😀 React
                      </button>

                      {emojiPickerId === msg._id && (
                        <div style={{ position: "absolute", bottom: "30px", zIndex: 50, right: isMe ? "0" : "auto", left: isMe ? "auto" : "0" }}>
                          <EmojiPicker 
                            theme="dark" 
                            width={300} 
                            height={400} 
                            onEmojiClick={(emojiObject) => {addReaction(msg._id, emojiObject.emoji);setEmojiPickerId(null); }} 
                          />
                        </div>
                      )}

                      <button onClick={() => setReplyingTo(msg)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600",fontSize: "13px" }}>↩️ Reply</button>
                      {isMe && editingMsgId !== msg._id && <button onClick={() => { setEditingMsgId(msg._id); setEditMsgText(msg.text); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "#3b82f6" }}>✏️ Edit</button>}
                      <button onClick={() => setDeleteMsg(msg)}
                        style={{ background: "none", border: "none",cursor: "pointer",fontSize: "11px",color: "#ef4444"}}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef}></div>
        </div>

            {/* INPUT AREA */}
            {(selectedUser || selectedGroup) && (
              <div style={{ borderTop: "1px solid #C8B6A6", background: "#EFE7DB", position: "relative" }}>
            
            {typingIndicator && (
              <div style={{ position: "absolute", top: "-25px", left: "20px", fontSize: "12px", color: "#10b981", fontStyle: "italic", fontWeight: "bold" }}>
                💬 {typingIndicator}
              </div>
            )}

            {replyingTo && (
              <div style={{ padding: "10px 20px", background: "#374151", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px" }}><strong style={{ color: "#34d399" }}>Replying to {replyingTo.sender}:</strong> {replyingTo.text}</span>
                <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}>✖</button>
              </div>
            )}
            
            {selectedImage && (
              <div style={{ padding: "10px 20px", background: "#374151", position: "relative" }}>
                <img src={selectedImage} alt="Preview" style={{ height: "60px", borderRadius: "8px" }} />
                <button onClick={() => setSelectedImage(null)} style={{ position: "absolute", left: "80px", top: "5px", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "20px", height: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✖</button>
              </div>
            )}

            <div style={{ display: "flex", padding: "20px", alignItems: "center" }}>
              <input type="file" id="image-upload" accept="image/*" onChange={handleImageChange} 
                style={{ display: "none" }} 
              />
              <label 
                htmlFor="image-upload" 
                style={{ display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "20px", marginRight: "10px", padding: "12px 16px", background: "#FFFFFF", border: "1px solid #C8B6A6", color: "#4B3A2F", borderRadius: "12px" }}
              >
                📎
              </label>

              <input 
                type="text" 
                value={message} 
                onChange={handleTypingChange} 
                onKeyDown={(e) => {if (e.key === "Enter") {sendMessage();}}}
                placeholder="Type a message..." 
                style={{ flex: 1, padding: "14px", background: "#FFFFFF", border: "1px solid #C8B6A6", color: "#4B3A2F", borderRadius: "12px", outline: "none" }} 
              />
              <button 
                onClick={sendMessage} 
                style={{ marginLeft: "10px", padding: "14px 24px", background: "#6B7D5D", color: "white", border: "1px solid #5B6D4D", borderRadius: "12px", fontWeight: "600", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
  
          {/* --- MODALS --- */}
          {showGroupModal && (
          <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000}}>
          <div style={{background: "#F5F0E8", padding: "30px", borderRadius: "20px", width: "420px", color: "#4B3A2F", border: "1px solid #C8B6A6"}}>
          <h3 style={{ margin: "0 0 15px 0" }}>Create Group</h3>

          <input
            type="text" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group Name"
            style={{width: "100%", padding: "10px", marginBottom: "15px", background: "#FFFFFF", border: "1px solid #C8B6A6", color: "#4B3A2F", borderRadius: "12px", boxSizing: "border-box"}}/>

          <textarea
            value={newGroupDescription} onChange={(e) => setNewGroupDescription(e.target.value)}
            placeholder="Group Description" style={{width: "100%", padding: "10px", marginBottom: "15px", background: "#FFFFFF", border: "1px solid #C8B6A6", color: "#4B3A2F", borderRadius: "12px", boxSizing: "border-box", minHeight: "70px", resize: "none"}}/>

          <h4 style={{ margin: "0 0 10px 0" }}>Select Members</h4>

          <div style={{maxHeight: "150px", overflowY: "auto", marginBottom: "20px", background: "#111827", padding: "10px", borderRadius: "8px"}}>
            {users.filter((user) => user.username !== currentUser)
              .map((user) => (
                <label key={user.username}
                  style={{display: "block", marginBottom: "10px", cursor: "pointer"}}>
                  <input type="checkbox" checked={selectedMembers.includes(user.username)}
                    onChange={(e) => {if (e.target.checked) {setSelectedMembers((prev) => [...prev, user.username]);
                    } else {setSelectedMembers((prev) => prev.filter((u) => u !== user.username))}}}/>{" "}
                  {user.username}
                </label>
              ))}
          </div>

          <div style={{display: "flex", justifyContent: "flex-end",gap: "10px"}}>
          <button onClick={() => {setShowGroupModal(false); setNewGroupName(""); setNewGroupDescription("");setSelectedMembers([])}}
            style={{padding: "8px 16px", background: "transparent", border: "none", color: "white", cursor: "pointer"}}>
              Cancel
          </button>

          <button onClick={createGroup}
            style={{padding: "8px 16px", background: "#10b981", border: "none", color: "white", borderRadius: "6px", cursor: "pointer"}}>
              Create
          </button>
          </div>
        </div>
      </div>
    )}

      {/* ========================================== */}
      {/* ORIGINAL MY PROFILE MODAL */}
      {/* ========================================== */}
      {showProfileModal && profileData && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div style={{ background: "#1f2937", padding: "30px", borderRadius: "12px", width: "350px", textAlign: "center", color: "white", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>

            <div style={{position: "relative", width: "100px", height: "100px", margin: "0 auto 20px" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#374151", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "36px", border: "3px solid #3b82f6"}}>
                {selectedAvatar ? (<img src={selectedAvatar} alt="avatar" style={{width: "100%", height: "100%", objectFit: "cover"}}/>
                ) : (currentUser.charAt(0).toUpperCase())}
              </div>
            </div>

            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{marginTop: "10px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px"}}/>

            <h2 style={{ margin: 0 }}> {currentUser} </h2>
            <p style={{color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", marginTop: "6px", marginBottom: "20px", fontSize: "14px"}}>
              @{currentUser.toLowerCase()}
            </p>

            <div style={{ background: "#111827", padding: "20px", borderRadius: "8px", marginBottom: "20px", textAlign: "left" }}>
              <p style={{ margin: "0 0 15px 0", fontSize: "14px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px" }}>
                <label style={{display: "block", marginBottom: "8px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", fontSize: "13px", fontWeight: "600"}}>📧 Email </label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)}
                  style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #374151", background: "#FFFFFF", border: "1px solid #C8B6A6", color: "#4B3A2F", borderRadius: "12px", padding: "10px 14px", outline: "none", boxSizing: "border-box", marginBottom: "20px"}}/>
              </p>

              {/* BIO SECTION */}
              <label style={{display: "block", marginBottom: "8px", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", fontSize: "13px", fontWeight: "600"}}>📝 About Me</label>
              <textarea value={editBioText} onChange={(e) => setEditBioText(e.target.value)} placeholder="Write something about yourself..."
                style={{width: "100%", minHeight: "100px", padding: "12px", borderRadius: "10px",border: "1px solid #374151", background: "#111827", color: "white", outline: "none", resize: "vertical", boxSizing: "border-box"}}/>
            
            <button onClick={saveProfile} style={{width: "100%", padding: "12px", background: "#6B7D5D", border: "1px solid #5B6D4D", borderRadius: "12px", fontWeight: "600", color: "white", border: "none", borderRadius: "10px",marginBottom: "12px", cursor: "pointer",fontWeight: "bold"}}>
              Save Changes
            </button>

            <button onClick={() => setShowProfileModal(false)} style={{width: "100%", padding: "12px", background: "#E6D8C3", color: "#4B3A2F", border: "1px solid #C8B6A6", borderRadius: "12px", fontWeight: "600", border: "none", borderRadius: "10px",cursor: "pointer"}}>
              Close
            </button>
          </div>
        </div>
      </div>
    )}  

      {/* ========================================== */}
      {/* VIEW OTHER USER PROFILE MODAL (READ ONLY) */}
      {/* ========================================== */}
      {showViewProfileModal && viewProfileData && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 100 }}>
          <div style={{ background: "#1f2937", padding: "30px", borderRadius: "12px", width: "420px", textAlign: "center", color: "white", boxShadow:"0 0 30px rgba(59,130,246,0.45)" }}>

            <div style={{height: "110px", background:"linear-gradient(135deg, #2563eb, #7c3aed)", margin: "-30px -30px 0 -30px", borderRadius: "16px 16px 0 0"}}/>
            
            <div style={{width: "100px", height: "100px", borderRadius: "50%", overflow: "hidden", background: "#374151", margin: "-50px auto 15px",display: "flex", justifyContent: "center", alignItems: "center", fontSize: "36px", border: "3px solid #3b82f6", boxShadow: "0 0 20px rgba(59,130,246,0.4)"}}>
            {viewProfileData.avatar ? (<img src={viewProfileData.avatar} alt="avatar"
            style={{width: "100%", height: "100%", objectFit: "cover"}}/>
            ) : (viewProfileData.username?.charAt(0).toUpperCase())}
          </div>

          <h2 style={{margin: 0, fontSize: "28px", fontWeight: "700"}}>{viewProfileData.username}</h2>

          <p style={{color: "#94a3b8", marginTop: "6px", marginBottom: "20px"}}>@{viewProfileData.username?.toLowerCase()}</p>

        <div style={{background: "#111827", padding: "22px", borderRadius: "16px", marginTop: "20px", textAlign: "left"}}>
          <div style={{ marginBottom: "22px" }}>
            <p style={{color: "#94a3b8", fontSize: "13px", marginBottom: "8px",fontWeight: "600"}}>📧 Email</p>
            <p style={{margin: 0, fontSize: "15px",fontWeight: "500"}}>{viewProfileData.email || "No email provided"}</p>
          </div>
        <div>
          <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "8px", fontWeight: "600"}}>📝 About Me</p>
          <p style={{margin: 0, lineHeight: "1.6", fontSize: "15px"}}>{viewProfileData.bio || "No bio yet."}</p>
        </div>
      </div>
          <button onClick={() => setShowViewProfileModal(false)} style={{ width: "100%", padding: "12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
            Close
          </button>
        </div>
      </div>
      )}

      {showGroupInfoModal && groupInfo && (
        <div style={{position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000}}>
          <div style={{background: "#1f2937", padding: "30px", borderRadius: "16px", width: "420px", color: "white"}}>
          <h2 style={{marginTop: 0, marginBottom: "8px", textAlign: "center"}}>👥 {groupInfo.name}</h2>
            <p style={{textAlign: "center", color: "#7A5C43", letterSpacing: "0.5px", fontWeight: "600", fontSize: "13px", marginBottom: "25px"}}>{groupInfo.description || "No description yet"}</p>
            <div style={{background: "#111827", padding: "20px", borderRadius: "12px", marginBottom: "20px"}}>
              <p>👑 <strong>Admin:</strong> {groupInfo.admin}</p>
              <p>👥 <strong>Members:</strong>{" "}{groupInfo.members.length}</p>
              <p>📅 <strong>Created:</strong>{" "}{new Date(groupInfo.createdAt).toLocaleDateString()}</p>
            </div>

            <h3 style={{ marginBottom: "15px" }}>Members</h3>

            <div style={{maxHeight: "180px", overflowY: "auto", background: "#111827", padding: "15px", borderRadius: "12px", marginBottom: "20px"}}>
              {groupInfo.members.map((member) => (
                <div key={member} style={{padding: "8px 0", borderBottom: "1px solid #374151"}}>
                  {member === groupInfo.admin ? `👑 ${member}`: `👤 ${member}`}
                </div>
              ))}
            </div>

            {groupInfo.admin === currentUser && (
              <button onClick={() => {setShowGroupInfoModal(false); setShowAddMembersModal(true)}}
                style={{width: "100%", padding: "12px", background: "#6B7D5D", color: "white", border: "1px solid #5B6D4D", borderRadius: "12px", fontWeight: "600", cursor: "pointer", marginBottom: "12px"}}>
                ➕ Add Members
              </button>
            )}

            <button onClick={() => {const confirmLeave = window.confirm(`Are you sure you want to leave "${groupInfo.name}"?`);
            if (confirmLeave) {leaveGroup();}}}
            style={{width: "100%", padding: "12px", background: "#8B5E3C", color: "white", border: "none", borderRadius: "12px", fontWeight: "600", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", marginBottom: "12px"}}>
              🚪 Leave Group
            </button>

            <button onClick={() => setShowGroupInfoModal(false)}
              style={{width: "100%", padding: "12px", background: "#374151", color: "white", border: "none", borderRadius: "10px", cursor: "pointer"}}>
              Close
            </button>
          </div>
        </div>
      )}

      {deleteMsg && (
        <div style={{position: "fixed",top: 0,left: 0,right: 0,bottom: 0,background: "rgba(0,0,0,0.7)",display: "flex",justifyContent: "center",alignItems: "center",zIndex: 1000,}}>
          <div style={{background: "#1f2937",padding: "20px",borderRadius: "12px",width: "300px",textAlign: "center"}}>
            <h3>Delete Message</h3>

            <button
              onClick={() => {socket.emit("delete_for_me", {messageId: deleteMsg._id,username: currentUser});setDeleteMsg(null);}}
              style={{width: "100%",padding: "10px",marginBottom: "10px",border: "none",borderRadius: "8px",cursor: "pointer"}}>
              Delete for Me
            </button>

            {deleteMsg.sender === currentUser && (
              <button onClick={() => {socket.emit("delete_message", deleteMsg) ;setDeleteMsg(null)}}
                style={{width: "100%", padding: "10px", marginBottom: "10px", border: "none", borderRadius: "8px", cursor: "pointer" }}>
                Delete for Everyone
              </button>
            )}

            <button onClick={() => setDeleteMsg(null)}
              style={{width: "100%", padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

    {showAddMembersModal && (
       <div style={{position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000}}>
        <div style={{background: "#F5F0E8", color: "#4B3A2F", border: "1px solid #C8B6A6", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)", width: "420px", padding: "30px"}}>
          <h3 style={{ textAlign: "center" }}> ➕ Add Members</h3>
            <div style={{maxHeight: "180px", overflowY: "auto", background: "#111827", padding: "15px", borderRadius: "12px", marginBottom: "20px"}}>
              {users.filter((user) =>!selectedGroup.members.includes(user.username))
                .map((user) => (
                  <label key={user.username}
                    style={{display: "block", marginBottom: "12px"}}>
                    <input type="checkbox" checked={membersToAdd.includes(user.username)} onChange={(e) => {
                        if (e.target.checked) {setMembersToAdd((prev) => [...prev, user.username]);
                        } 
                        else {setMembersToAdd((prev) => prev.filter((u) => u !== user.username));
                        }}}/>
                    {" "}{user.username}
                  </label>
                ))}
            </div>

            <button onClick={addMembers} style={{ width: "100%", padding: "12px", background: "#6B7D5D", color: "white", border: "1px solid #5B6D4D", borderRadius: "12px", fontWeight: "600", marginBottom: "12px", cursor: "pointer"}}>
              Add Selected Members
            </button>

            <button onClick={() => {setShowAddMembersModal(false); setShowGroupInfoModal(true); setMembersToAdd([])}}
              style={{width: "100%", padding: "12px", background: "#374151", color: "white", border: "none", borderRadius: "10px", cursor: "pointer"}}>
              Cancel
            </button>

          </div>
        </div>
      )}

    </div>
  );
};

export default Chat;
