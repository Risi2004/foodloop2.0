import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../../services/api';
import '../loginPage/LoginPage.css';
import loginImage from '../../../assets/images/login/login.svg';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login__page">
      <div className="login__container">
        <div className="login__form__section">
          <div className="login__header">
            <div className="brand__logo">
              <img src="/logo.png" alt="FoodLoop Logo" />
              <div className="brand__text">
                <h2><span className="brand__green">Food</span><span className="brand__leaf">Loop</span></h2>
                <p>Zero Waste. Infinite Impact</p>
              </div>
            </div>
            <h1>Forgot Password</h1>
            <p className="subtitle">Enter your email to receive a reset link.</p>
          </div>

          <form className="form__card" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message" style={{
                color: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}>
                {error}
              </div>
            )}
            {success && (
              <div style={{
                color: '#86efac',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '1rem',
                textAlign: 'center',
                fontSize: '0.9rem',
                fontWeight: '600',
              }}>
                If an account exists for this email, you will receive a password reset link. Check your inbox and spam.
              </div>
            )}

            <div className="input__group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                placeholder="e.g. you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <button type="submit" className="login__btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="login__footer">
            <p>Remember your password?</p>
            <Link to="/login">Back to Login</Link>
          </div>
        </div>

        <div className="login__image__section">
          <img src={loginImage} alt="FoodLoop" className="side__image" />
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
