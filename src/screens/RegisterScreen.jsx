import React, { useState } from "react";
import { register } from "../firebase/auth";

export default function RegisterScreen({ onSuccess, onBack }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!username.trim()) return setError("Escribe tu nombre de usuario.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    try {
      const user = await register(username, password);
      onSuccess(user);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") {
        setError("Ese nombre de usuario ya existe.");
      } else {
        setError("Error al registrarse. Intenta de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen auth-screen">
      <div className="logo-small">🎵 MEMORIX</div>
      <h2 className="auth-title">Crear Cuenta</h2>

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
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div className="field-group">
          <label>Confirmar contraseña</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "Registrando..." : "Registrarse ✨"}
        </button>
        <button className="btn-outline" onClick={onBack}>← Volver</button>
      </div>
    </div>
  );
}
