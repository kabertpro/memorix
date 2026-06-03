import React, { useState } from "react";
import { login } from "../firebase/auth";

export default function LoginScreen({ onSuccess, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError("");
    try {
      const user = await login(username, password);
      onSuccess(user);
    } catch (e) {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen auth-screen">
      <div className="logo-small">🎵 MEMORIX</div>
      <h2 className="auth-title">Iniciar Sesión</h2>

      <div className="auth-form">
        <div className="field-group">
          <label>Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Ej: LuisMi"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <div className="field-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Entrando..." : "Entrar →"}
        </button>
        <button className="btn-outline" onClick={onBack}>← Volver</button>
      </div>
    </div>
  );
}
