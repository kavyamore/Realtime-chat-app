import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        "https://realtime-chat-app-61zl.onrender.com/api/auth/login",
        {
          username,
          password,
        }
      );


      localStorage.setItem(
        "token",
        response.data.token
      );
      localStorage.setItem(
        "username",
        response.data.user.username
      );

      alert(response.data.message);

      // Go to chat page
      navigate("/chat");

    } catch (error) {
      alert(error.response.data.message);
    }
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1>Login</h1>

      <form onSubmit={handleSubmit}>
        <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) =>
            setUsername(e.target.value)
        }
        />

        <br />
        <br />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <br />
        <br />

        <button type="submit">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;