import React, { useState, useCallback } from "react";
import { logout } from "./firebase/auth";
import MenuScreen from "./screens/MenuScreen";
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import GameScreen from "./screens/GameScreen";
import Ranking from "./components/Ranking";

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [user, setUser] = useState(null);
  const [gameKey, setGameKey] = useState(0);

  const handleLogin = (u) => { setUser(u); setScreen("menu"); };
  const handleRegister = (u) => { setUser(u); setScreen("menu"); };
  const handleLogout = async () => { await logout(); setUser(null); setScreen("menu"); };

  const startGame = useCallback(() => {
    setGameKey((k) => k + 1);
    setScreen("game");
  }, []);

  return (
    <>
      {screen === "menu" && (
        <MenuScreen
          user={user}
          onPlay={startGame}
          onRanking={() => setScreen("ranking")}
          onLogin={() => setScreen("login")}
          onRegister={() => setScreen("register")}
          onLogout={handleLogout}
        />
      )}
      {screen === "login" && (
        <LoginScreen onSuccess={handleLogin} onBack={() => setScreen("menu")} />
      )}
      {screen === "register" && (
        <RegisterScreen onSuccess={handleRegister} onBack={() => setScreen("menu")} />
      )}
      {screen === "ranking" && (
        <Ranking onBack={() => setScreen("menu")} />
      )}
      {screen === "game" && (
        <GameScreen
          key={gameKey}
          user={user}
          onMenu={() => setScreen("menu")}
          onRetry={startGame}
        />
      )}
    </>
  );
}
