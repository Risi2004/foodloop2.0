
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../../services/api';
import { setToken, setUser, getDashboardPath } from '../../../utils/auth';
import './LoginPage.css';
import loginImage from '../../../assets/images/login/login.svg';
import eye from "../../../assets/icons/login/eye-icon.svg"
import receive from "../../../assets/icons/login/receive.svg"

const DEACTIVATED_MESSAGE = 'Your account has been deactivated. Contact an administrator to reactivate.';

const PENDING_APPROVAL_TITLE = 'Account pending administrator approval';
const PENDING_APPROVAL_BODY =
    'Your email is verified, but you cannot sign in yet. A FoodLoop administrator must review and approve your registration first. Please check back after approval, or contact support if you have been waiting more than a few business days.';

function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [generalError, setGeneralError] = useState('');
    const [showPendingApproval, setShowPendingApproval] = useState(
        () =>
            location.state?.pendingApproval === true ||
            new URLSearchParams(location.search).get('pendingApproval') === '1'
    );

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setGeneralError('');
        setShowPendingApproval(false);

        // Basic validation
        if (!email.trim()) {
            setErrors({ email: 'Email/username is required' });
            return;
        }
        if (!password) {
            setErrors({ password: 'Password is required' });
            return;
        }

        setLoading(true);

        try {
            const response = await login(email.trim(), password);

            if (response.success) {
                // Store token and user data
                setToken(response.token);
                setUser(response.user);

                navigate(getDashboardPath(response.user.role));
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle API errors
            if (error.response && error.response.data) {
                const errorData = error.response.data;

                if (errorData.code === 'PENDING_ADMIN_APPROVAL') {
                    setShowPendingApproval(true);
                    setGeneralError('');
                } else if (errorData.message) {
                    setGeneralError(errorData.details || errorData.message);
                }
                
                // Handle field-specific errors
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    const fieldErrors = {};
                    errorData.errors.forEach(err => {
                        fieldErrors[err.field] = err.message;
                    });
                    setErrors(fieldErrors);
                }
            } else {
                setGeneralError(error.message || 'An error occurred. Please try again.');
            }
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
                        <h1>Welcome Back</h1>
                        <p className="subtitle">Connect to minimize waste and maximize impact.</p>
                    </div>

                    <form className="form__card" onSubmit={handleSubmit}>
                        {/* Deactivation message (from redirect state or query) */}
                        {(location.state?.message === DEACTIVATED_MESSAGE || new URLSearchParams(location.search).get('deactivated') === '1') && (
                            <div className="error-message" style={{
                                color: '#ff6b6b',
                                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                padding: '12px',
                                borderRadius: '8px',
                                marginBottom: '1rem',
                                textAlign: 'center',
                                fontSize: '0.9rem',
                                fontWeight: '600'
                            }}>
                                {DEACTIVATED_MESSAGE}
                            </div>
                        )}
                        {showPendingApproval && (
                            <div className="login__pending-approval" role="alert">
                                <p className="login__pending-approval__title">{PENDING_APPROVAL_TITLE}</p>
                                <p className="login__pending-approval__body">{PENDING_APPROVAL_BODY}</p>
                            </div>
                        )}

                        {generalError && !showPendingApproval && (
                            <div className="login__error-banner" role="alert">
                                {generalError}
                            </div>
                        )}

                        <div className="input__group">
                            <label htmlFor="email">Email or Username</label>
                            <input
                                type="text"
                                id="email"
                                placeholder="Eg:-john or johndoe@gmail.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                            {errors.email && (
                                <span className="error-message" style={{ 
                                    color: '#ff6b6b', 
                                    fontSize: '0.85rem', 
                                    marginTop: '0.25rem',
                                    display: 'block'
                                }}>
                                    {errors.email}
                                </span>
                            )}
                        </div>
                        <div className="input__group">
                            <label htmlFor="password">Password</label>
                            <div className="password__input__wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="**************"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                                <span className="toggle__password" onClick={togglePasswordVisibility} style={{ zIndex: 10 }}>
                                    {showPassword ? (
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Hide</span>
                                    ) : (
                                        <img src={eye} alt="Show Password" />
                                    )}
                                </span>
                            </div>
                            {errors.password && (
                                <span className="error-message" style={{ 
                                    color: '#ff6b6b', 
                                    fontSize: '0.85rem', 
                                    marginTop: '0.25rem',
                                    display: 'block'
                                }}>
                                    {errors.password}
                                </span>
                            )}
                        </div>

                        <div className="form__actions">
                            <Link to="/forgot-password" className="forgot__password">Forgot Password?</Link>
                        </div>

                        <Link to="/" className="login__home__link">← Back to Home</Link>

                        <button 
                            type="submit" 
                            className="login__btn" 
                            disabled={loading}
                        >
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>

                    <div className="login__footer">
                        <p>Don't have an account?</p>
                        <Link to="/signup">Sign up as a Supplier, Volunteer or NGO</Link>
                    </div>
                </div>

                <div className="login__image__section">
                    <img src={loginImage} alt="Volunteers distributing food" className="side__image" />
                    <div className="image__overlay">
                        <div className="quote__box">
                            <div className="quote__icon">
                                <img src={receive} alt="Impact Icon" />
                            </div>
                            <div className="quote__text">
                                <p className='quote__text__quote'>"Last year alone, we rescued over 50 tons of food and served 20,000 meals to those in need."</p>
                                <p className='quote__text__told'>- The Food Loop Impact Report</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>  
    );
}

export default LoginPage;
