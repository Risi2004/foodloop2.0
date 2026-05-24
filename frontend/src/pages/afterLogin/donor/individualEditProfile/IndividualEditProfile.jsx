import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EditSidebar from '../../../../components/afterLogin/donor/editProfile/editSidebar/EditSidebar';
import PersonalInfoForm from '../../../../components/afterLogin/donor/editProfile/personalInfoForm/PersonalInfoForm';
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter";
import { getCurrentUser, updateDonorProfile, uploadProfileImage } from '../../../../services/api';
import { setUser } from '../../../../utils/auth';
import './IndividualEditProfile.css';

function IndividualEditProfile() {
    const navigate = useNavigate();
    const [user, setUserState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [pendingProfileImageFile, setPendingProfileImageFile] = useState(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);

    useEffect(() => {
        let cancelled = false;
        async function fetchUser() {
            try {
                setLoading(true);
                setError(null);
                const res = await getCurrentUser();
                if (cancelled) return;
                if (res?.user) setUserState(res.user);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load profile');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchUser();
        return () => { cancelled = true; };
    }, []);

    useEffect(() => {
        if (!user) return;
        if (user.donorType === 'Business') {
            navigate('/donor/edit-profile', { replace: true });
        }
    }, [user, navigate]);

    useEffect(() => {
        return () => {
            if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        };
    }, [avatarPreviewUrl]);

    const handleProfileImageSelected = (file) => {
        if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
        setAvatarPreviewUrl(URL.createObjectURL(file));
        setPendingProfileImageFile(file);
    };

    const handleSaveProfile = async (formData) => {
        if (saving) return;
        setSaving(true);
        try {
            if (pendingProfileImageFile) {
                const res = await uploadProfileImage(pendingProfileImageFile);
                if (res?.success && res?.user) {
                    setUser(res.user);
                    setUserState(res.user);
                } else {
                    alert(res?.message || 'Failed to upload profile picture.');
                    setSaving(false);
                    return;
                }
                if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
                setAvatarPreviewUrl(null);
                setPendingProfileImageFile(null);
            }
            const res = await updateDonorProfile(formData);
            if (res?.success && res?.user) {
                setUser(res.user);
                setUserState(res.user);
                alert('Profile updated successfully.');
                navigate('/donor/profile');
            } else {
                alert(res?.message || 'Failed to update profile');
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Failed to update profile';
            alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleCancelProfile = () => {
        navigate('/donor/profile');
    };

    if (loading) {
        return (
            <>
                <DonorNavbar />
                <div className="individual-edit-profile-page">
                    <div className="individual-edit-container individual-edit-loading">
                        <p>Loading...</p>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    if (error) {
        return (
            <>
                <DonorNavbar />
                <div className="individual-edit-profile-page">
                    <div className="individual-edit-container individual-edit-error">
                        <p>{error}</p>
                    </div>
                </div>
                <DonorFooter />
            </>
        );
    }

    if (!user || user.donorType === 'Business') {
        return null;
    }

    return (
        <>
            <DonorNavbar />
            <div className="individual-edit-profile-page">
                <div className="individual-edit-container">
                    <aside className="individual-sidebar-section">
                        <EditSidebar
                            user={user}
                            subtitle="Manage your public profile and personal preferences."
                            avatarPreviewUrl={avatarPreviewUrl}
                            onProfileImageSelected={handleProfileImageSelected}
                        />
                    </aside>
                    <main className="individual-forms-section">
                        <PersonalInfoForm
                            user={user}
                            onSave={handleSaveProfile}
                            onCancel={handleCancelProfile}
                            saving={saving}
                        />
                    </main>
                </div>
            </div>
            <DonorFooter />
        </>
    );
}

export default IndividualEditProfile;
