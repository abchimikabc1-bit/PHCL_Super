// app/security/page.tsx
"use client";

import { useState } from "react";
import "./security.css";

export default function SecurityPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [names, setNames] = useState(["", ""]); // at least two names, third optional
  const [errors, setErrors] = useState<string[]>([]);

  const validate = () => {
    const errs: string[] = [];
    // Email validation
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      errs.push("Invalid email address.");
    }
    // Password: minimum 8 characters, contains at least one digit and one symbol
    if (password.length < 8) {
      errs.push("Password must be at least 8 characters.");
    }
    if (!/[0-9]/.test(password)) {
      errs.push("Password must contain at least one digit.");
    }
    if (!/[!@#$%^&*]/.test(password)) {
      errs.push("Password must contain at least one special symbol.");
    }
    // Names validation (2-3 non-empty)
    const filled = names.filter(n => n.trim() !== "");
    if (filled.length < 2) {
      errs.push("Please provide at least two names.");
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      console.log({ email, password, names });
      alert("Security details saved successfully!");
    }
  };

  const updateName = (index: number, value: string) => {
    const newNames = [...names];
    newNames[index] = value;
    if (index === 1 && newNames[2] === undefined) {
      newNames.push("");
    }
    setNames(newNames);
  };

  return (
    <main className="security-page">
      <section className="card">
        <h1 className="title">Security Settings</h1>
        <form onSubmit={handleSubmit} className="form">
          <label htmlFor="email" className="label">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input"
            required
          />

          <label htmlFor="password" className="label">Strong Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input"
            placeholder="At least 8 characters, digit & symbol"
            required
          />

          {/* Name fields – two required, third optional */}
          {names.map((n, i) => (
            <div key={i} className="name-group">
              <label htmlFor={`name-${i}`} className="label">
                {i === 0 ? "First Name" : i === 1 ? "Last Name" : "Middle/Other Name"}
              </label>
              <input
                type="text"
                id={`name-${i}`}
                value={n}
                onChange={e => updateName(i, e.target.value)}
                className="input"
                required={i < 2}
              />
            </div>
          ))}

          {/* Biometric placeholders */}
          <div className="biometric-section">
            <button type="button" className="bio-btn" onClick={() => alert('Fingerprint registration placeholder')}>Register Fingerprint</button>
            <button type="button" className="bio-btn" onClick={() => alert('Facial recognition placeholder')}>Register Face ID</button>
          </div>

          {errors.length > 0 && (
            <ul className="error-list">
              {errors.map((e, idx) => (
                <li key={idx} className="error-item">{e}</li>
              ))}
            </ul>
          )}

          <button type="submit" className="submit-btn">Save Security Settings</button>
        </form>
      </section>
    </main>
  );
}
