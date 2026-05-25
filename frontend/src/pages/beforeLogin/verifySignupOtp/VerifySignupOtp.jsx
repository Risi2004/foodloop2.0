import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { verifySignupOtp, resendSignupOtp } from '../../../services/api';
import './VerifySignupOtp.css';

const RESEND_COOLDOWN_SEC = 60;

function VerifySignupOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!email || typeof email !== 'string' || !email.trim()) {
      navigate('/signup', { replace: true });
    }
  }, [email, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(value);
    setError('');
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!email) return;
    const trimmedOtp = otp.trim();
    if (trimmedOtp.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifySignupOtp(email, trimmedOtp);
      setSuccessMessage(data.message || 'Account verified! Redirecting to login...');
      setTimeout(
        () =>
          navigate('/login', {
            state: { pendingApproval: !!data.requiresAdminApproval },
          }),
        2000
      );
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await resendSignupOtp(email);
      setResendCooldown(RESEND_COOLDOWN_SEC);
      setSuccessMessage('A new verification code has been sent to your email.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return null;
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  return (
    <div className="verify-otp__page">
      <div className="verify-otp__container">
        <div className="verify-otp__card">
          <h1 className="verify-otp__title">Verify your email</h1>
          <p className="verify-otp__subtitle">
            We sent a 6-digit code to <strong>{maskedEmail}</strong>. Enter it below.
          </p>

          <form onSubmit={handleVerify} className="verify-otp__form">
            <div className="verify-otp__input-group">
              <label htmlFor="otp">Verification code</label>
              <input
                id="otp"
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
              className="verify-otp__btn verify-otp__btn--primary"
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>

            <div className="verify-otp__resend">
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

          <div className="verify-otp__footer">
            <p>
              Wrong email? <Link to="/signup">Back to signup</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifySignupOtp;
