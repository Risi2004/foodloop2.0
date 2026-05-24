import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signup, checkEmailExists, checkContactNoExists } from '../../../services/api';
import './Signup.css';

import donorImg from '../../../assets/images/sign-up/donor.svg';
import donorBusinessImg from '../../../assets/images/sign-up/donor-business.svg';
import receiverImg from '../../../assets/images/sign-up/receiver.svg';
import driverImg from '../../../assets/images/sign-up/driver.svg';

import scooterIcon from '../../../assets/icons/signup/scooter.svg';
import bikeIcon from '../../../assets/icons/signup/motorcycle.svg';
import carIcon from '../../../assets/icons/signup/car.svg';
import truckIcon from '../../../assets/icons/signup/truck.svg';
import defaultProfileIcon from '../../../assets/icons/afterLogin/navbar/profile.svg';

function SignupPage() {
    const navigate = useNavigate();
    const { roleType } = useParams();

    const [vehicleType, setVehicleType] = useState('Scooter'); 
    const [profileImage, setProfileImage] = useState(null);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        businessName: '',
        email: '',
        contactNo: '',
        address: '',
        password: '',
        retypePassword: '',
        vehicleNumber: '',
        receiverName: '',
        receiverType: '',
        driverName: '',
        
        businessRegFile: null,
        addressProofFile: null,
        nicFile: null,
        licenseFile: null,
        isStartup: false,
        startupDetails: '',
    });

    const isBusiness = ['restaurant', 'supermarket', 'business'].includes(roleType);

    // Validation patterns
    const NAME_REGEX = /^[a-zA-Z\s]+$/;
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const CONTACT_REGEX = /^\d{10}$/;
    const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_+=])[A-Za-z\d@$!%*?&#^()\-_+=]{8,}$/;
    const VEHICLE_NUMBER_REGEX = /^[a-zA-Z0-9\s]+$/;

    const validateField = (fieldId, value) => {
        const trimmed = typeof value === 'string' ? value.trim() : '';
        switch (fieldId) {
            case 'username':
            case 'receiverName':
            case 'driverName':
            case 'businessName':
                if (!trimmed) return 'Name is required';
                if (!NAME_REGEX.test(trimmed)) return 'Name must contain only letters and spaces';
                return null;
            case 'email':
                if (!trimmed) return 'Email is required';
                if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address';
                return null;
            case 'contactNo':
                if (!trimmed) return 'Contact number is required';
                if (!CONTACT_REGEX.test(trimmed.replace(/\s/g, ''))) return 'Contact number must be exactly 10 digits';
                return null;
            case 'vehicleNumber':
                if (!trimmed) return 'Vehicle number is required';
                if (!VEHICLE_NUMBER_REGEX.test(trimmed)) return 'Vehicle number can contain only letters, numbers and spaces';
                return null;
            case 'password':
                if (!value) return 'Password is required';
                if (roleType === 'individual' || roleType === 'customer') {
                    if (!PASSWORD_REGEX.test(value)) return 'Password must be at least 8 chars with uppercase, lowercase, numbers, symbols';
                } else {
                    if (value.length < 6) return 'Password must be at least 6 characters';
                }
                return null;
            case 'retypePassword':
                if (!value) return 'Retype password is required';
                if (formData.password !== value) return 'Passwords do not match';
                return null;
            default:
                return null;
        }
    };

    const handleInputChange = (e) => {
        const { id, value, type, checked } = e.target;
        setFormData({ ...formData, [id]: type === 'checkbox' ? checked : value });
    };

    const handleBlur = async (e) => {
        const fieldId = e.target.id;
        const value = e.target.value;
        const error = validateField(fieldId, value);
        
        setErrors((prev) => ({ ...prev, [fieldId]: error || undefined }));
        
        if (!error && value?.trim()) {
            if (fieldId === 'email') {
                const { exists } = await checkEmailExists(value);
                if (exists) setErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
            }
            if (fieldId === 'contactNo') {
                const { exists } = await checkContactNoExists(value);
                if (exists) setErrors((prev) => ({ ...prev, contactNo: 'This contact number is already registered.' }));
            }
        }
    };

    const handleFileChange = (e, key) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setErrors((prev) => ({ ...prev, [key]: 'Only PDF files are allowed.' }));
            setFormData((prev) => ({ ...prev, [key]: null }));
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrors((prev) => ({ ...prev, [key]: 'File must be 10 MB or smaller.' }));
            setFormData((prev) => ({ ...prev, [key]: null }));
            e.target.value = '';
            return;
        }
        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setFormData((prev) => ({ ...prev, [key]: file }));
    };

    const triggerFileUpload = (id) => document.getElementById(id).click();

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setErrors((prev) => ({ ...prev, profileImage: undefined }));
        if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
            setErrors((prev) => ({ ...prev, profileImage: 'Profile picture must be JPEG/JPG/PNG.' }));
            setProfileImage(null);
            setProfileImageFile(null);
            e.target.value = '';
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setErrors((prev) => ({ ...prev, profileImage: 'Profile picture must be 10 MB or smaller.' }));
            setProfileImage(null);
            setProfileImageFile(null);
            e.target.value = '';
            return;
        }
        setProfileImage(URL.createObjectURL(file));
        setProfileImageFile(file);
    };

    const getTitle = () => {
        switch (roleType) {
            case 'receiver': return 'Create Receiver Account';
            case 'driver': return 'Create Volunteer Driver Account';
            case 'restaurant': return 'Create Restaurant Account';
            case 'supermarket': return 'Create Supermarket Account';
            case 'business': return 'Create Business Account';
            case 'individual': return 'Create Individual Account';
            case 'customer': return 'Create Customer Account';
            default: return 'Create Account';
        }
    };

    const getCurrentImage = () => {
        if (isBusiness) return donorBusinessImg;
        if (roleType === 'receiver') return receiverImg;
        if (roleType === 'driver') return driverImg;
        return donorImg;
    };

    const getValidationErrors = () => {
        const newErrors = {};

        const emailErr = validateField('email', formData.email);
        if (emailErr) newErrors.email = emailErr;
        const contactErr = validateField('contactNo', formData.contactNo);
        if (contactErr) newErrors.contactNo = contactErr;
        const passErr = validateField('password', formData.password);
        if (passErr) newErrors.password = passErr;
        const retypeErr = validateField('retypePassword', formData.retypePassword);
        if (retypeErr) newErrors.retypePassword = retypeErr;
        if (!formData.address?.trim()) newErrors.address = 'Address is required';

        if (roleType === 'individual' || roleType === 'customer') {
            const usernameErr = validateField('username', formData.username);
            if (usernameErr) newErrors.username = usernameErr;
            if (roleType === 'individual' && formData.isStartup) {
                const bizErr = validateField('businessName', formData.businessName);
                if (bizErr) newErrors.businessName = bizErr;
                if (!formData.startupDetails?.trim()) newErrors.startupDetails = 'Startup details are required';
            }
        } else if (isBusiness) {
            const bizErr = validateField('businessName', formData.businessName);
            if (bizErr) newErrors.businessName = bizErr;
            if (!formData.businessRegFile) newErrors.businessRegFile = 'Business registration file is required';
            if (!formData.addressProofFile) newErrors.addressProofFile = 'Address proof file is required';
        } else if (roleType === 'receiver') {
            const recErr = validateField('receiverName', formData.receiverName);
            if (recErr) newErrors.receiverName = recErr;
            if (!formData.receiverType) newErrors.receiverType = 'Receiver type is required';
            if (!formData.businessRegFile) newErrors.businessRegFile = 'Business registration file is required';
            if (!formData.addressProofFile) newErrors.addressProofFile = 'Address proof file is required';
        } else if (roleType === 'driver') {
            const drvErr = validateField('driverName', formData.driverName);
            if (drvErr) newErrors.driverName = drvErr;
            const vehErr = validateField('vehicleNumber', formData.vehicleNumber);
            if (vehErr) newErrors.vehicleNumber = vehErr;
            if (!formData.nicFile) newErrors.nicFile = 'NIC file is required';
            if (!formData.licenseFile) newErrors.licenseFile = 'Driving license file is required';
        }

        return newErrors;
    };

    const validationErrors = getValidationErrors();
    const isFormValid = Object.keys(validationErrors).length === 0 && !errors.profileImage;
    const hasDisplayErrors = Object.values(errors).some(Boolean);
    const submitDisabled = loading || !isFormValid || hasDisplayErrors;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccessMessage('');

        const newErrors = getValidationErrors();
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);

        try {
            const submitFormData = new FormData();
            
            // Send exact roleType to API (e.g. "restaurant", "customer")
            submitFormData.append('role', roleType);
            submitFormData.append('email', formData.email);
            submitFormData.append('password', formData.password);
            submitFormData.append('retypePassword', formData.retypePassword);
            submitFormData.append('contactNo', formData.contactNo);
            submitFormData.append('address', formData.address);

            if (profileImageFile) {
                submitFormData.append('profileImage', profileImageFile);
            }

            if (roleType === 'individual' || roleType === 'customer') {
                submitFormData.append('username', formData.username);
                if (roleType === 'individual' && formData.isStartup) {
                    submitFormData.append('isStartup', 'true');
                    submitFormData.append('businessName', formData.businessName);
                    submitFormData.append('startupDetails', formData.startupDetails);
                }
            } else if (isBusiness) {
                submitFormData.append('businessName', formData.businessName);
                if (formData.businessRegFile) submitFormData.append('businessRegFile', formData.businessRegFile);
                if (formData.addressProofFile) submitFormData.append('addressProofFile', formData.addressProofFile);
            } else if (roleType === 'receiver') {
                submitFormData.append('receiverName', formData.receiverName);
                submitFormData.append('receiverType', formData.receiverType);
                if (formData.businessRegFile) submitFormData.append('businessRegFile', formData.businessRegFile);
                if (formData.addressProofFile) submitFormData.append('addressProofFile', formData.addressProofFile);
            } else if (roleType === 'driver') {
                submitFormData.append('driverName', formData.driverName);
                submitFormData.append('vehicleNumber', formData.vehicleNumber);
                submitFormData.append('vehicleType', vehicleType);
                if (formData.nicFile) submitFormData.append('nicFile', formData.nicFile);
                if (formData.licenseFile) submitFormData.append('licenseFile', formData.licenseFile);
            }

            const response = await signup(submitFormData);
            if (response.success) {
                setSuccessMessage('Check your email for the verification code.');
                navigate('/signup/verify-otp', { state: { email: formData.email } });
            }
        } catch (error) {
            console.error('Signup error:', error);
            if (error.response && error.response.data && error.response.data.errors) {
                const apiErrors = {};
                error.response.data.errors.forEach(err => {
                    apiErrors[err.field] = err.message;
                });
                setErrors(apiErrors);
            } else {
                setErrors({ submit: error.message || 'An error occurred. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="signup__page">
            <div className="signup__container">
                <div className="signup__image__section">
                    <img src={getCurrentImage()} alt="Signup Illustration" className="side__image" />
                    <div className="image__overlay">
                        <div className="quote__box">
                            {(roleType === 'driver' || roleType === 'receiver') ? (
                                <>
                                    <h1 className="image__quote__title">Partner with us to end hunger</h1>
                                    <p className="image__quote__subtitle">Join the transparency loop. Connect with donors and volunteers to distribute surplus food efficiently to those in need.</p>
                                </>
                            ) : (
                                <>
                                    <h1 className="image__quote__title">Turn Surplus into Sustenance</h1>
                                    <p className="image__quote__subtitle">Join our community of donors and ensure no food goes to waste. Your contributions feed families, not landfills.</p>
                                </>
                            )}
                            <div className="active__donors">
                                <div className="avatars">
                                    <div className="avatar">🍕</div>
                                    <div className="avatar">🍎</div>
                                    <div className="avatar">🍞</div>
                                </div>
                                <p>Active members <br /> worldwide</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="signup__form__section">
                    
                    <div style={{width: '100%', marginBottom: '1rem', textAlign: 'left'}}>
                        <Link to="/signup" style={{color: '#4CAF50', textDecoration: 'none', fontWeight: 'bold'}}>&larr; Back to Role Selection</Link>
                    </div>

                    <h1 className="signup__title">{getTitle()}</h1>

                    <div className="profile__upload">
                        <label htmlFor="profile-upload" className="profile__circle">
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" />
                            ) : (
                                <img src={defaultProfileIcon} alt="Profile" className="default__icon" />
                            )}
                        </label>
                        <input type="file" id="profile-upload" accept="image/jpeg,image/jpg,image/png" hidden onChange={handleImageUpload} />
                        {errors.profileImage && <span className="error-message" style={{ textAlign: 'center' }}>{errors.profileImage}</span>}
                    </div>

                    {roleType === 'driver' && (
                        <div className="sub__toggle__container" style={{marginBottom: "20px"}}>
                            <span className="sub__toggle__label">Vehicle types</span>
                            <div className="vehicle__toggle">
                                <button className={`veh__btn ${vehicleType === 'Scooter' ? 'active' : ''}`} onClick={() => setVehicleType('Scooter')}>
                                    <img src={scooterIcon} alt="Scooter" />
                                </button>
                                <button className={`veh__btn ${vehicleType === 'Bike' ? 'active' : ''}`} onClick={() => setVehicleType('Bike')}>
                                    <img src={bikeIcon} alt="Bike" />
                                </button>
                                <button className={`veh__btn ${vehicleType === 'Car' ? 'active' : ''}`} onClick={() => setVehicleType('Car')}>
                                    <img src={carIcon} alt="Car" />
                                </button>
                                <button className={`veh__btn ${vehicleType === 'Truck' ? 'active' : ''}`} onClick={() => setVehicleType('Truck')}>
                                    <img src={truckIcon} alt="Truck" />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="form__fields">
                        
                        {(roleType === 'individual' || roleType === 'customer') && (
                            <>
                                <div className="input__group">
                                    <label htmlFor="username">Name</label>
                                    <input type="text" id="username" placeholder="Eg: John" value={formData.username} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.username && <span className="error-message">{errors.username}</span>}
                                </div>
                                {roleType === 'individual' && (
                                    <div className="input__group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                        <input type="checkbox" id="isStartup" checked={formData.isStartup} onChange={handleInputChange} style={{ width: 'auto' }} />
                                        <label htmlFor="isStartup" style={{ margin: 0, fontWeight: 'normal' }}>I am a startup business</label>
                                    </div>
                                )}
                                {roleType === 'individual' && formData.isStartup && (
                                    <>
                                        <div className="input__group">
                                            <label htmlFor="businessName">Startup/Business Name</label>
                                            <input type="text" id="businessName" placeholder="Eg: John Bites" value={formData.businessName} onChange={handleInputChange} onBlur={handleBlur} />
                                            {errors.businessName && <span className="error-message">{errors.businessName}</span>}
                                        </div>
                                        <div className="input__group">
                                            <label htmlFor="startupDetails">Startup Details</label>
                                            <textarea id="startupDetails" placeholder="Tell us about your startup..." value={formData.startupDetails} onChange={handleInputChange} onBlur={handleBlur} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc', outline: 'none', resize: 'vertical' }} rows="3" />
                                            {errors.startupDetails && <span className="error-message">{errors.startupDetails}</span>}
                                        </div>
                                    </>
                                )}
                                <div className="input__group">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" placeholder="Eg: JohnDoe@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="contactNo">Contact No</label>
                                    <input type="text" id="contactNo" placeholder="Eg: 0771234567" value={formData.contactNo} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.contactNo && <span className="error-message">{errors.contactNo}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                            </>
                        )}

                        {isBusiness && (
                            <>
                                <div className="input__group">
                                    <label htmlFor="businessName">Business Name</label>
                                    <input type="text" id="businessName" placeholder="Eg: Green Veggies" value={formData.businessName} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.businessName && <span className="error-message">{errors.businessName}</span>}
                                </div>
                                <div className="input__group border__group">
                                    <label>Business Registration Cards</label>
                                    <span className="file__hint">Upload PDF only</span>
                                    <div className="file__drop" onClick={() => triggerFileUpload('biz-reg-file')}>
                                        <span>{formData.businessRegFile ? formData.businessRegFile.name : 'Import or Drag File'}</span>
                                        <button className="add__file__btn" type="button">Add File</button>
                                    </div>
                                    <input type="file" id="biz-reg-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'businessRegFile')} />
                                    {errors.businessRegFile && <span className="error-message">{errors.businessRegFile}</span>}
                                </div>
                                <div className="input__group border__group">
                                    <label>Address Proof</label>
                                    <span className="file__hint">Upload PDF only</span>
                                    <div className="file__drop" onClick={() => triggerFileUpload('addr-proof-file')}>
                                        <span>{formData.addressProofFile ? formData.addressProofFile.name : 'Import or Drag File'}</span>
                                        <button className="add__file__btn" type="button">Add File</button>
                                    </div>
                                    <input type="file" id="addr-proof-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'addressProofFile')} />
                                    {errors.addressProofFile && <span className="error-message">{errors.addressProofFile}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" placeholder="Eg: business@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="contactNo">Contact No</label>
                                    <input type="text" id="contactNo" placeholder="Eg: 0771234567" value={formData.contactNo} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.contactNo && <span className="error-message">{errors.contactNo}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                            </>
                        )}

                        {roleType === 'receiver' && (
                            <>
                                <div className="row">
                                    <div className="input__group half">
                                        <label htmlFor="receiverName">Receiver Name</label>
                                        <input type="text" id="receiverName" placeholder="Eg: Hope Shelter" value={formData.receiverName} onChange={handleInputChange} onBlur={handleBlur} />
                                        {errors.receiverName && <span className="error-message">{errors.receiverName}</span>}
                                    </div>
                                    <div className="input__group half">
                                        <label htmlFor="receiverType">Receiver Type</label>
                                        <select id="receiverType" value={formData.receiverType} onChange={handleInputChange}>
                                            <option value="">Select</option>
                                            <option value="NGO">NGO</option>
                                            <option value="Food Banks">Food Banks</option>
                                            <option value="Service Organization">Service Organization</option>
                                        </select>
                                        {errors.receiverType && <span className="error-message">{errors.receiverType}</span>}
                                    </div>
                                </div>
                                <div className="input__group border__group">
                                    <label>Business Registration Cards</label>
                                    <span className="file__hint">Upload PDF only</span>
                                    <div className="file__drop" onClick={() => triggerFileUpload('rec-biz-reg-file')}>
                                        <span>{formData.businessRegFile ? formData.businessRegFile.name : 'Import or Drag File'}</span>
                                        <button className="add__file__btn" type="button">Add File</button>
                                    </div>
                                    <input type="file" id="rec-biz-reg-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'businessRegFile')} />
                                    {errors.businessRegFile && <span className="error-message">{errors.businessRegFile}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" placeholder="Eg: receiver@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="contactNo">Contact No</label>
                                    <input type="text" id="contactNo" placeholder="Eg: 0771234567" value={formData.contactNo} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.contactNo && <span className="error-message">{errors.contactNo}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                                <div className="input__group border__group">
                                    <label>Address Proof</label>
                                    <span className="file__hint">Upload PDF only</span>
                                    <div className="file__drop" onClick={() => triggerFileUpload('rec-addr-proof-file')}>
                                        <span>{formData.addressProofFile ? formData.addressProofFile.name : 'Import or Drag File'}</span>
                                        <button className="add__file__btn" type="button">Add File</button>
                                    </div>
                                    <input type="file" id="rec-addr-proof-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'addressProofFile')} />
                                    {errors.addressProofFile && <span className="error-message">{errors.addressProofFile}</span>}
                                </div>
                            </>
                        )}

                        {roleType === 'driver' && (
                            <>
                                <div className="row">
                                    <div className="input__group half">
                                        <label htmlFor="driverName">Driver Name</label>
                                        <input type="text" id="driverName" placeholder="Eg: Alex" value={formData.driverName} onChange={handleInputChange} onBlur={handleBlur} />
                                        {errors.driverName && <span className="error-message">{errors.driverName}</span>}
                                    </div>
                                    <div className="input__group half">
                                        <label htmlFor="vehicleNumber">Vehicle number</label>
                                        <input type="text" id="vehicleNumber" placeholder="Eg: BYD 2344" value={formData.vehicleNumber} onChange={handleInputChange} onBlur={handleBlur} />
                                        {errors.vehicleNumber && <span className="error-message">{errors.vehicleNumber}</span>}
                                    </div>
                                </div>
                                <div className="input__group border__group">
                                    <label>NIC (Front & Back view)</label>
                                    <span className="file__hint">Upload PDF only</span>
                                    <div className="file__drop" onClick={() => triggerFileUpload('nic-file')}>
                                        <span>{formData.nicFile ? formData.nicFile.name : 'Import or Drag File'}</span>
                                        <button className="add__file__btn" type="button">Add File</button>
                                    </div>
                                    <input type="file" id="nic-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'nicFile')} />
                                    {errors.nicFile && <span className="error-message">{errors.nicFile}</span>}
                                </div>
                                <div className="input__group border__group">
                                    <label>Driving License (Front & Back view)</label>
                                    <span className="file__hint">Upload PDF only</span>
                                    <div className="file__drop" onClick={() => triggerFileUpload('license-file')}>
                                        <span>{formData.licenseFile ? formData.licenseFile.name : 'Import or Drag File'}</span>
                                        <button className="add__file__btn" type="button">Add File</button>
                                    </div>
                                    <input type="file" id="license-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'licenseFile')} />
                                    {errors.licenseFile && <span className="error-message">{errors.licenseFile}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" placeholder="Eg: driver@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="contactNo">Contact No</label>
                                    <input type="text" id="contactNo" placeholder="Eg: 0771234567" value={formData.contactNo} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.contactNo && <span className="error-message">{errors.contactNo}</span>}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                            </>
                        )}

                        <div className="row">
                            <div className="input__group half">
                                <label htmlFor="password">Password</label>
                                <input type="password" id="password" placeholder="*******" value={formData.password} onChange={handleInputChange} onBlur={handleBlur} />
                                {errors.password && <span className="error-message">{errors.password}</span>}
                            </div>
                            <div className="input__group half">
                                <label htmlFor="retypePassword">Retype Password</label>
                                <input type="password" id="retypePassword" placeholder="******" value={formData.retypePassword} onChange={handleInputChange} onBlur={handleBlur} />
                                {errors.retypePassword && <span className="error-message">{errors.retypePassword}</span>}
                            </div>
                        </div>

                    </div>

                    {errors.submit && (
                        <div className="error-message" style={{ marginBottom: '10px', textAlign: 'center' }}>
                            {errors.submit}
                        </div>
                    )}
                    {successMessage && (
                        <div className="success-message" style={{ color: 'green', marginBottom: '10px', textAlign: 'center' }}>
                            {successMessage}
                        </div>
                    )}

                    <button 
                        className="create__account__btn" 
                        onClick={handleSubmit}
                        disabled={submitDisabled}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>

                    <div className="signup__footer">
                        <p>Already have an account? <Link to="/login">Sign In</Link></p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default SignupPage;
