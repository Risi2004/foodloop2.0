import React, { useState, useRef } from 'react';
import { changePassword } from '../../../../../services/api';
import lockIcon from '../../../../../assets/icons/afterLogin/driver/Lock.svg';
import cameraIcon from '../../../../../assets/icons/afterLogin/driver/camera.svg';
import './EditSidebar.css';

function formatMemberSince(createdAt) {
    if (!createdAt) return '';
    const d = new Date(createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function EditSidebar({
    user,
    subtitle = "Manage your business identity, branch locations, and security settings.",
    type = "Active Donor",
    avatarPreviewUrl,
    onProfileImageSelected
}) {
    const fileInputRef = useRef(null);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const role = (user?.role || '').toLowerCase();
    const isBusinessRole = ['restaurant', 'supermarket', 'business', 'donor'].includes(role);
    const displayName = role === 'receiver'
        ? (user?.receiverName || user?.email || 'Receiver')
        : isBusinessRole
            ? (user?.businessName || user?.email || 'Supplier')
            : (user?.username || user?.email || 'Supplier');
    const memberSince = formatMemberSince(user?.createdAt);

    const openPasswordModal = () => {
        setPasswordModalOpen(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
    };

    const closePasswordModal = () => {
        setPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
    };

    const handleChangePasswordSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        setPasswordError('');
        if (!currentPassword.trim()) {
            setPasswordError('Current password is required.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('New password and confirm password do not match.');
            return;
        }
        setChangingPassword(true);
        try {
            const response = await changePassword(currentPassword, newPassword);
            if (response?.success) {
                closePasswordModal();
                alert('Password changed successfully. A confirmation email has been sent.');
            } else {
                setPasswordError(response?.message || 'Failed to change password.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to change password.';
            setPasswordError(msg);
        } finally {
            setChangingPassword(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (e.g. JPEG, PNG).');
            return;
        }
        onProfileImageSelected?.(file);
    };

    const avatarDisplayUrl = avatarPreviewUrl ?? user?.profileImageUrl;

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                aria-hidden="true"
            />
            <div className="edit-sidebar-card">
                <h1 className="edit-title">Edit Profile</h1>
                <p className="edit-subtitle">{subtitle}</p>

                <div className="avatar-section">
                    <div className="avatar-circle-wrapper">
                        <div className="avatar-circle">
                            {avatarDisplayUrl ? (
                                <img src={avatarDisplayUrl} alt="Profile" className="avatar-img" />
                            ) : (
                                <svg className="avatar-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                            )}
                        </div>
                        <button type="button" className="camera-btn" onClick={handleAvatarClick} title="Change profile picture">
                            <img src={cameraIcon} alt="Change photo" className="camera-btn-icon" />
                        </button>
                    </div>
                </div>

                <div className="active-donor-badge">{type}</div>
                <h2 className="business-name">{displayName}</h2>
                <p className="member-since">{memberSince ? `Member Since ${memberSince}` : ''}</p>

                <button type="button" className="change-password-btn" onClick={openPasswordModal}>
                    <img src={lockIcon} alt="" className="lock-icon-img" /> Change Password
                </button>
            </div>

            {passwordModalOpen && (
                <div className="edit-sidebar-password-overlay" onClick={closePasswordModal}>
                    <div className="edit-sidebar-password-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="edit-sidebar-password-modal__title">Change Password</h3>
                        <p className="edit-sidebar-password-modal__hint">
                            Enter your current password and choose a new one. A confirmation email will be sent to your email.
                        </p>
                        <form onSubmit={handleChangePasswordSubmit} noValidate>
                            <div className="edit-sidebar-password-modal__field">
                                <label htmlFor="edit-sidebar-currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="edit-sidebar-currentPassword"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="edit-sidebar-password-modal__field">
                                <label htmlFor="edit-sidebar-newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="edit-sidebar-newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="edit-sidebar-password-modal__field">
                                <label htmlFor="edit-sidebar-confirmPassword">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="edit-sidebar-confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                />
                            </div>
                            {passwordError && (
                                <p className="edit-sidebar-password-modal__error">{passwordError}</p>
                            )}
                            <div className="edit-sidebar-password-modal__actions">
                                <button type="button" className="edit-sidebar-password-modal__cancel" onClick={closePasswordModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="edit-sidebar-password-modal__save" disabled={changingPassword}>
                                    {changingPassword ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default EditSidebar;
