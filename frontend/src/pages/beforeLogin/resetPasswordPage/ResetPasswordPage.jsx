import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../../services/api';
import '../loginPage/LoginPage.css';
import loginImage from '../../../assets/images/login/login.svg';
import eye from '../../../assets/icons/login/eye-icon.svg';

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Invalid or expired link.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid or expired reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
              <h1>Invalid link</h1>
              <p className="subtitle">This reset link is invalid or has expired.</p>
            </div>
            <div className="form__card" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>Please request a new password reset link.</p>
              <Link to="/forgot-password" className="login__btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Forgot password
              </Link>
            </div>
            <div className="login__footer">
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

  if (success) {
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
              <h1>Password reset</h1>
              <p className="subtitle">Password reset successfully. You can now log in.</p>
            </div>
            <div className="form__card" style={{ textAlign: 'center' }}>
              <p style={{ marginBottom: '1rem' }}>Go to the login page to sign in with your new password.</p>
              <Link to="/login" className="login__btn" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center' }}>
                Go to Login
              </Link>
            </div>
          </div>
          <div className="login__image__section">
            <img src={loginImage} alt="FoodLoop" className="side__image" />
          </div>
        </div>
      </div>
    );
  }

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
            <h1>Set new password</h1>
            <p className="subtitle">Enter your new password below.</p>
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

            <div className="input__group">
              <label htmlFor="newPassword">New password</label>
              <div className="password__input__wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <span className="toggle__password" onClick={() => setShowPassword(!showPassword)} style={{ zIndex: 10 }}>
                  {showPassword ? (
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Hide</span>
                  ) : (
                    <img src={eye} alt="Show" />
                  )}
                </span>
              </div>
            </div>
            <div className="input__group">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="password__input__wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
                <span className="toggle__password" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ zIndex: 10 }}>
                  {showConfirmPassword ? (
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Hide</span>
                  ) : (
                    <img src={eye} alt="Show" />
                  )}
                </span>
              </div>
            </div>

            <button type="submit" className="login__btn" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          <div className="login__footer">
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

export default ResetPasswordPage;
