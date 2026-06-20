import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Note: If you saved the file I gave you earlier as "Auth.jsx", import that!
// If you want to keep them separate, import Login and Register instead.
import Auth from "./pages/Auth"; 
import Chat from "./pages/Chat";

// 🛡️ THE SECURITY BOUNCER
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  
  // If there is no token, kick them back to the login page
  if (!token) {
    return <Navigate to="/" />;
  }
  
  // If they have the token, let them render the Chat
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Auth />} />
        
        {/* Protected Routes */}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;