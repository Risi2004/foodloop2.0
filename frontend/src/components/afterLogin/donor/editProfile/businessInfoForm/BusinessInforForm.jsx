import { useState, useEffect } from 'react';
import './BusinessInfoForm.css';

function BusinessInfoForm({ user, onSave, onCancel, saving = false }) {
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [sustainabilityName, setSustainabilityName] = useState('');
    const [contactNo, setContactNo] = useState('');
    const [address, setAddress] = useState('');
    const [businessType, setBusinessType] = useState('');

    useEffect(() => {
        if (user) {
            setBusinessName(user.businessName ?? '');
            setEmail(user.email ?? '');
            setSustainabilityName(user.businessName ?? '');
            setContactNo(user.contactNo ?? '');
            setAddress(user.address ?? '');
            setBusinessType(user.businessType ?? '');
        }
    }, [user]);

    const handleSubmit = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (saving) return;
        onSave?.({
            businessName: businessName.trim() || undefined,
            email: email.trim() || undefined,
            contactNo: contactNo.trim() || undefined,
            address: address.trim() || undefined,
            businessType: businessType || undefined,
        });
    };

    const handleCancel = () => {
        onCancel?.();
    };

    return (
        <div className="business-info-card">
            <div className="section-header">
                <span className="icon">👤</span>
                <h3>Business Information</h3>
            </div>

            <form onSubmit={handleSubmit} noValidate>
                <div className="form-grid">
                    <div className="form-group">
                        <label htmlFor="businessName">Business name</label>
                        <input
                            id="businessName"
                            type="text"
                            placeholder="Eg:- GreenGrocer Co."
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Sustainability Contact Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="Eg:- contact@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="sustainabilityName">Sustainability name</label>
                        <input
                            id="sustainabilityName"
                            type="text"
                            placeholder="Eg:- Contact person"
                            value={sustainabilityName}
                            onChange={(e) => setSustainabilityName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="contactNo">Contact number</label>
                        <input
                            id="contactNo"
                            type="text"
                            placeholder="Eg:- +94 77 123 4567"
                            value={contactNo}
                            onChange={(e) => setContactNo(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="businessType">Business type</label>
                        <select
                            id="businessType"
                            value={businessType}
                            onChange={(e) => setBusinessType(e.target.value)}
                        >
                            <option value="">Select type</option>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Supermarket">Supermarket</option>
                            <option value="Wedding Hall">Wedding Hall</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Registration No.</label>
                        <input type="text" placeholder="—" disabled className="disabled-input" />
                    </div>
                    <div className="form-group full-width">
                        <label htmlFor="address">Pickup Address</label>
                        <textarea
                            id="address"
                            placeholder="Eg:- Downtown Financial District, NY 10004."
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="cancel-btn" onClick={handleCancel}>Cancel</button>
                    <button type="submit" className="save-btn" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    );
}

export default BusinessInfoForm;
