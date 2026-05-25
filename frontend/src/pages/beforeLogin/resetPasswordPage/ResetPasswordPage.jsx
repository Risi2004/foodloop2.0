import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { verifyResetOtp, resendResetOtp, resetPassword } from '../../../services/api';
import { isValidPassword, PASSWORD_INVALID_MSG } from '../../../utils/signupValidation';
import '../loginPage/LoginPage.css';
import '../verifySignupOtp/VerifySignupOtp.css';
import loginImage from '../../../assets/images/login/login.svg';
import eye from '../../../assets/icons/login/eye-icon.svg';

const RESEND_COOLDOWN_SEC = 60;

function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [step, setStep] = useState('otp');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!email || typeof email !== 'string' || !email.trim()) {
      navigate('/forgot-password', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOtpChange = (e) => {
    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      await verifyResetOtp(email, otp);
      setStep('password');
      setSuccessMessage('');
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Invalid or expired code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await resendResetOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setSuccessMessage('A new code has been sent to your email.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!isValidPassword(newPassword)) {
      setError(PASSWORD_INVALID_MSG);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email, newPassword, confirmPassword);
      setDone(true);
    } catch (err) {
      setError(
        err.response?.data?.errors?.[0]?.message ||
          err.response?.data?.message ||
          err.message ||
          'Failed to reset password.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  if (done) {
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
              <p className="subtitle">Your password has been updated. You can sign in now.</p>
            </div>
            <div className="form__card" style={{ textAlign: 'center' }}>
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
            <h1>{step === 'otp' ? 'Enter reset code' : 'Set new password'}</h1>
            <p className="subtitle">
              {step === 'otp' ? (
                <>
                  We sent a 6-digit code to <strong>{maskedEmail}</strong>
                </>
              ) : (
                'Choose a strong new password for your account.'
              )}
            </p>
          </div>

          {step === 'otp' ? (
            <form className="form__card verify-otp__form" onSubmit={handleVerifyOtp}>
              <div className="verify-otp__input-group">
                <label htmlFor="reset-otp">Reset code</label>
                <input
                  id="reset-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={otp}
                  onChange={handleOtpChange}
                  maxLength={6}
                  className="verify-otp__input"
                  disabled={loading}
                />
              </div>

              {error && <div className="verify-otp__error">{error}</div>}
              {successMessage && <div className="verify-otp__success">{successMessage}</div>}

              <button
                type="submit"
                className="login__btn"
                disabled={loading || otp.length !== 6}
                style={{ marginTop: '1rem' }}
              >
                {loading ? 'Verifying...' : 'Verify code'}
              </button>

              <div className="verify-otp__resend" style={{ marginTop: '1rem' }}>
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  className="verify-otp__btn verify-otp__btn--link"
                  onClick={handleResend}
                  disabled={loading || resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          ) : (
            <form className="form__card" onSubmit={handleResetPassword}>
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
                    placeholder="Letters, numbers & symbols (8+)"
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
                {loading ? 'Saving...' : 'Reset password'}
              </button>
            </form>
          )}

          <div className="login__footer">
            <Link to="/forgot-password">Use a different email</Link>
            <span style={{ margin: '0 8px' }}>|</span>
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
