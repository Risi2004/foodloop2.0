import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EditSidebar from '../../../../components/afterLogin/donor/editProfile/editSidebar/EditSidebar';
import ReceiverInfoForm from '../../../../components/afterLogin/receiver/editProfile/ReceiverInfoForm';
import ReceiverNavbar from '../../../../components/afterLogin/dashboard/ReceiverSection/navbar/ReceiverNavbar';
import ReceiverFooter from '../../../../components/afterLogin/dashboard/ReceiverSection/footer/ReceiverFooter';
import { getCurrentUser, updateReceiverProfile, uploadProfileImage } from '../../../../services/api';
import { setUser } from '../../../../utils/auth';
import './ReceiverEditProfile.css';

function ReceiverEditProfile() {
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
            const res = await updateReceiverProfile(formData);
            if (res?.success && res?.user) {
                setUser(res.user);
                setUserState(res.user);
                alert('Profile updated successfully.');
                navigate('/receiver/profile');
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
        navigate('/receiver/profile');
    };

    if (loading) {
        return (
            <>
                <ReceiverNavbar />
                <div className="receiver-edit-profile-page">
                    <div className="receiver-edit-container receiver-edit-loading">
                        <p>Loading...</p>
                    </div>
                </div>
                <ReceiverFooter />
            </>
        );
    }

    if (error) {
        return (
            <>
                <ReceiverNavbar />
                <div className="receiver-edit-profile-page">
                    <div className="receiver-edit-container receiver-edit-error">
                        <p>{error}</p>
                    </div>
                </div>
                <ReceiverFooter />
            </>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <>
            <ReceiverNavbar />
            <div className="receiver-edit-profile-page">
                <div className="receiver-edit-container">
                    <aside className="receiver-edit-sidebar-section">
                        <EditSidebar
                            user={user}
                            subtitle="Manage your organization profile and security settings."
                            type="Active Receiver"
                            avatarPreviewUrl={avatarPreviewUrl}
                            onProfileImageSelected={handleProfileImageSelected}
                        />
                    </aside>
                    <main className="receiver-edit-forms-section">
                        <ReceiverInfoForm
                            user={user}
                            onSave={handleSaveProfile}
                            onCancel={handleCancelProfile}
                            saving={saving}
                        />
                    </main>
                </div>
            </div>
            <ReceiverFooter />
        </>
    );
}

export default ReceiverEditProfile;
