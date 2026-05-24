import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DriverNavbar from "../../../../components/afterLogin/dashboard/driverSection/navbar/DriverNavbar";
import DriverFooter from "../../../../components/afterLogin/dashboard/driverSection/footer/DriverFooter";
import profileIcon from "../../../../assets/icons/afterLogin/driver/account.svg";
import changeIcon from "../../../../assets/icons/afterLogin/driver/camera.svg";
import lockIcon from "../../../../assets/icons/afterLogin/driver/Lock.svg";
import memberIcon from "../../../../assets/icons/afterLogin/driver/Customer.svg";
import { getUser, setUser } from '../../../../utils/auth';
import { updateDriverProfile, changePassword, uploadProfileImage } from '../../../../services/api';
import './EditProfile.css';

function EditProfile() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [profileImageUrl, setProfileImageUrl] = useState('');
    const [pendingProfileImageFile, setPendingProfileImageFile] = useState(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
    const [driverName, setDriverName] = useState('');
    const [email, setEmail] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [address, setAddress] = useState('');
    const [vehicleType, setVehicleType] = useState('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [memberSince, setMemberSince] = useState('');
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        const user = getUser();
        if (user) {
            setProfileImageUrl(user.profileImageUrl ?? '');
            setDriverName(user.driverName ?? '');
            setEmail(user.email ?? '');
            setContactNo(user.contactNo ?? '');
            setAddress(user.address ?? '');
            setVehicleType(user.vehicleType ?? '');
            setVehicleNumber(user.vehicleNumber ?? '');
            setMemberSince(user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                : '');
        }
    }, []);

    useEffect(() => {
        return () => {
            if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        };
    }, [avatarPreviewUrl]);

    const handleSave = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            if (pendingProfileImageFile) {
                const imgRes = await uploadProfileImage(pendingProfileImageFile);
                if (imgRes?.success && imgRes?.user) {
                    setUser(imgRes.user);
                    setProfileImageUrl(imgRes.user.profileImageUrl ?? '');
                } else {
                    alert(imgRes?.message || 'Failed to upload profile picture.');
                    setSaving(false);
                    return;
                }
                if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                setAvatarPreviewUrl(null);
                setPendingProfileImageFile(null);
            }
            const payload = {
                driverName: driverName.trim() || undefined,
                email: email.trim() || undefined,
                contactNo: contactNo.trim() || undefined,
                address: address.trim() || undefined,
                vehicleType: vehicleType || undefined,
                vehicleNumber: vehicleNumber.trim() || undefined,
            };
            const response = await updateDriverProfile(payload);
            if (response.success && response.user) {
                setUser(response.user);
                alert('Profile updated successfully.');
                navigate('/driver/profile');
            } else {
                alert(response.message || 'Failed to update profile');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to update profile';
            alert(message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/driver/profile');
    };

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
            if (response.success) {
                closePasswordModal();
                alert('Password changed successfully.');
            } else {
                setPasswordError(response.message || 'Failed to change password.');
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to change password.';
            setPasswordError(message);
        } finally {
            setChangingPassword(false);
        }
    };

    const handleProfileImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleProfileImageChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (e.g. JPEG, PNG).');
            return;
        }
        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(URL.createObjectURL(file));
        setPendingProfileImageFile(file);
    };

    const displayProfileImageUrl = avatarPreviewUrl ?? profileImageUrl;

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleProfileImageChange}
                style={{ display: 'none' }}
                aria-hidden="true"
            />
            <DriverNavbar />
            <div className='edit__profile'>
                <h1>Edit Profile</h1>
                <p>Manage your public profile and personal preferences.</p>
                <div className="edit__profile__s1">
                    <div className='edit__profile__s1__sub1'>
                        <div className="edit__profile__s1__sub1__sub">
                            <img
                                className="profile"
                                src={displayProfileImageUrl || profileIcon}
                                alt="Profile"
                            />
                            <button
                                type="button"
                                className="edit__profile__change-photo"
                                onClick={handleProfileImageClick}
                                title="Change profile picture"
                                aria-label="Change profile picture"
                            >
                                <img src={changeIcon} alt="Change" />
                            </button>
                        </div>
                        <h5>Driver</h5>
                        <h3>{driverName || email || 'Driver'}</h3>
                        <p>{memberSince ? `Member Since ${memberSince}` : ''}</p>
                        <button type="button" onClick={openPasswordModal}>
                            <img src={lockIcon} alt="Lock" />
                            <h4>Change Password</h4>
                        </button>
                    </div>
                    <form className="edit__profile__s1__sub2" onSubmit={handleSave} noValidate>
                        <div className="edit__profile__s1__sub2__sub1">
                            <img src={memberIcon} alt="Personal-Information" />
                            <h2>Personal Information</h2>
                        </div>
                        <div className="edit__profile__s1__sub2__sub2">
                            <div className="edit__profile__s1__sub2__sub2__sub">
                                <label htmlFor="name">Name</label>
                                <input type="text" name="name" id="name" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                            </div>
                            <div className="edit__profile__s1__sub2__sub2__sub">
                                <label htmlFor="email">Email</label>
                                <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                        </div>
                        <div className="edit__profile__s1__sub2__sub3">
                            <label htmlFor="contact">Contact Number</label>
                            <input type="tel" name="contact" id="contact" value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
                        </div>
                        <div className="edit__profile__s1__sub2__sub4">
                            <label htmlFor="address">Address</label>
                            <input type="text" name="address" id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div className="edit__profile__s1__sub2__sub3">
                            <label htmlFor="vehicleType">Vehicle Type</label>
                            <select id="vehicleType" name="vehicleType" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                                <option value="">Select vehicle</option>
                                <option value="Scooter">Scooter</option>
                                <option value="Bike">Bike</option>
                                <option value="Car">Car</option>
                                <option value="Truck">Truck</option>
                            </select>
                        </div>
                        <div className="edit__profile__s1__sub2__sub4">
                            <label htmlFor="vehicleNumber">Vehicle Number</label>
                            <input type="text" name="vehicleNumber" id="vehicleNumber" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
                        </div>
                        <button type="button" className="cancel" onClick={handleCancel}>Cancel</button>
                        <button type="submit" className="save" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                    </form>
                </div>

            </div>

            {passwordModalOpen && (
                <div className="edit__profile__password-overlay" onClick={closePasswordModal}>
                    <div className="edit__profile__password-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="edit__profile__password-modal__title">Change Password</h3>
                        <p className="edit__profile__password-modal__hint">Enter your current password and choose a new one. A confirmation email will be sent to your email.</p>
                        <form onSubmit={handleChangePasswordSubmit} noValidate>
                            <div className="edit__profile__password-modal__field">
                                <label htmlFor="currentPassword">Current Password</label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Enter current password"
                                    autoComplete="current-password"
                                />
                            </div>
                            <div className="edit__profile__password-modal__field">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="edit__profile__password-modal__field">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                />
                            </div>
                            {passwordError && (
                                <p className="edit__profile__password-modal__error">{passwordError}</p>
                            )}
                            <div className="edit__profile__password-modal__actions">
                                <button type="button" className="edit__profile__password-modal__cancel" onClick={closePasswordModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="edit__profile__password-modal__save" disabled={changingPassword}>
                                    {changingPassword ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <DriverFooter />
        </>
    )
}

export default EditProfile;