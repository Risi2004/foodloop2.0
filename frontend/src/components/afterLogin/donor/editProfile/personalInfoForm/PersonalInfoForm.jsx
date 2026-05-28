import React, { useState, useEffect } from 'react';
import './PersonalInfoForm.css';

function PersonalInfoForm({ user, onSave, onCancel, saving = false, showStartupFields = false }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [address, setAddress] = useState('');
    const [nicNumber, setNicNumber] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [startupDetails, setStartupDetails] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username ?? '');
            setEmail(user.email ?? '');
            setContactNo(user.contactNo ?? '');
            setAddress(user.address ?? '');
            setNicNumber(user.nicNumber ?? '');
            setBusinessName(user.businessName ?? '');
            setStartupDetails(user.startupDetails ?? '');
        }
    }, [user]);

    const handleSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (saving) return;
        const payload = {
            username: username.trim() || undefined,
            email: email.trim() || undefined,
            contactNo: contactNo.trim() || undefined,
            address: address.trim() || undefined,
        };
        if (showStartupFields) {
            payload.nicNumber = nicNumber.trim() || undefined;
            payload.businessName = businessName.trim() || undefined;
            payload.startupDetails = startupDetails.trim() || undefined;
        }
        onSave?.(payload);
    };

    const handleCancel = () => {
        onCancel?.();
    };

    return (
        <div className="personal-info-card">
            <div className="personal-info-header">
                <span className="icon">👤</span>
                <h3>Personal Information</h3>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                <div className="personal-form-grid">
                    <div className="form-group">
                        <label htmlFor="personal-username">Username</label>
                        <input
                            id="personal-username"
                            type="text"
                            placeholder="Eg:- jjhon"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="personal-email">Email</label>
                        <input
                            id="personal-email"
                            type="email"
                            placeholder="Eg:- jjhon@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group full-width">
                        <label htmlFor="personal-contactNo">Contact number</label>
                        <input
                            id="personal-contactNo"
                            type="text"
                            placeholder="Eg:- 0758261526"
                            value={contactNo}
                            onChange={(e) => setContactNo(e.target.value)}
                        />
                    </div>
                    <div className="form-group full-width">
                        <label htmlFor="personal-address">Pickup Address</label>
                        <textarea
                            id="personal-address"
                            placeholder="Eg:- 123 Main Street, City"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    {showStartupFields && (
                        <>
                            <div className="form-group">
                                <label htmlFor="personal-nicNumber">NIC number</label>
                                <input
                                    id="personal-nicNumber"
                                    type="text"
                                    placeholder="Eg:- 123456789V"
                                    value={nicNumber}
                                    onChange={(e) => setNicNumber(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="personal-businessName">Startup / business name</label>
                                <input
                                    id="personal-businessName"
                                    type="text"
                                    placeholder="Eg:- John Bites"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                />
                            </div>
                            <div className="form-group full-width">
                                <label htmlFor="personal-startupDetails">Startup details</label>
                                <textarea
                                    id="personal-startupDetails"
                                    placeholder="Describe your home startup"
                                    value={startupDetails}
                                    onChange={(e) => setStartupDetails(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </>
                    )}
                </div>

                <div className="form-actions-bottom">
                    <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    );
}

export default PersonalInfoForm;
