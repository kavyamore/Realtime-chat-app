import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  
  const navigate = useNavigate(); 
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      if (isLogin) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username);
        navigate("/chat");
      } else {
        setIsLogin(true);
        alert("Registration successful! Please log in.");
      }
    } catch (err) {setError(err.message)}
  };
  

  return (
    <div style={{display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "linear-gradient(180deg, #F5F0E8 0%, #EFE7DB 100%)", fontFamily: "'Poppins', sans-serif", padding: "20px"}}>
      <div style={{background: "#F5F0E8", padding: "45px", borderRadius: "24px", width: "100%", maxWidth: "430px", border: "1px solid #C8B6A6", boxShadow: "0 15px 35px rgba(0,0,0,0.12)"}}>
        <div style={{textAlign: "center", marginBottom: "30px"}}>
          <div style={{fontSize: "40px", marginBottom: "12px"}}>
            🌿
          </div>

          <h2 style={{margin: 0, color: "#4B3A2F", fontSize: "34px", fontWeight: "700"}}>{isLogin ? "Welcome Back" : "Create Account"}</h2>

          <p style={{marginTop: "10px", color: "#7A6A58", fontSize: "14px"}}>
            {isLogin? "Continue your conversations." : "Create an account to start chatting."}
          </p>
        </div>

        {error && (
          <div style={{background: "#E8D5C4", color: "#7A3E2E", padding: "12px", borderRadius: "14px", border: "1px solid #C8B6A6", marginBottom: "20px", textAlign: "center", fontSize: "14px"}}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}
          style={{display: "flex", flexDirection: "column", gap: "18px"}}>
          <input type="text" placeholder="Username" value={formData.username}
            onChange={(e) => setFormData({...formData, username: e.target.value})}
            required style={{padding: "15px 18px", borderRadius: "14px", border: "1px solid #C8B6A6", background: "#FFFFFF", color: "#4B3A2F", outline: "none", fontSize: "15px"}}/>

          {!isLogin && (
            <input type="email" placeholder="Email Address" value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required style={{ padding: "15px 18px", borderRadius: "14px", border: "1px solid #C8B6A6", background: "#FFFFFF", color: "#4B3A2F", outline: "none", fontSize: "15px"}}/>
          )}

          <input type="password" placeholder="Password" value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required style={{padding: "15px 18px", borderRadius: "14px", border: "1px solid #C8B6A6", background: "#FFFFFF", color: "#4B3A2F", outline: "none", fontSize: "15px"}}/>

          <button type="submit" style={{padding: "15px", background: "#6B7D5D", color: "white", border: "none", borderRadius: "14px", cursor: "pointer", fontWeight: "600", fontSize: "16px", marginTop: "10px", boxShadow: "0 6px 16px rgba(107,125,93,0.25)"}}>
            {isLogin ? "Log In" : "Register"}
          </button>
        </form>

        <div style={{textAlign: "center", marginTop: "28px", fontSize: "14px", color: "#7A6A58"}}>
          {isLogin ? "Don't have an account? ": "Already have an account? "}

          <span onClick={() => {setIsLogin(!isLogin); setError("")}}
            style={{color: "#6B7D5D", cursor: "pointer", fontWeight: "600"}}>
            {isLogin ? "Sign up" : "Log in"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Auth;