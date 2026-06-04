import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { signup, checkEmailExists, checkContactNoExists } from '../../../services/api';
import {
    validateSignupField,
    EMAIL_DUPLICATE_MSG,
    CONTACT_DUPLICATE_MSG,
    isValidEmail,
    isValidContactNo,
    isValidNicNumber,
    normalizeEmail,
    getContactDigits,
    buildContactNo,
} from '../../../utils/signupValidation';
import { VENUE_TYPE_OPTIONS, VENUE_TYPE_REQUIRED_MSG } from '../../../constants/venueTypes';
import './Signup.css';

const DUPLICATE_CHECK_DEBOUNCE_MS = 400;

import donorImg from '../../../assets/images/sign-up/donor.svg';
import donorBusinessImg from '../../../assets/images/sign-up/donor-business.svg';
import receiverImg from '../../../assets/images/sign-up/receiver.svg';
import driverImg from '../../../assets/images/sign-up/driver.svg';

import scooterIcon from '../../../assets/icons/signup/scooter.svg';
import bikeIcon from '../../../assets/icons/signup/motorcycle.svg';
import carIcon from '../../../assets/icons/signup/car.svg';
import truckIcon from '../../../assets/icons/signup/truck.svg';
import defaultProfileIcon from '../../../assets/icons/afterLogin/navbar/profile.svg';
import eye from '../../../assets/icons/login/eye-icon.svg';

const ALLOWED_ROLE_TYPES = ['receiver', 'driver', 'restaurant', 'supermarket', 'individual', 'customer'];

function SignupPage() {
    const navigate = useNavigate();
    const { roleType } = useParams();

    const [vehicleType, setVehicleType] = useState('Scooter'); 
    const [profileImage, setProfileImage] = useState(null);
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showRetypePassword, setShowRetypePassword] = useState(false);

    const [customerIncomeLevel, setCustomerIncomeLevel] = useState('');
    const [receiverIncomeLevel, setReceiverIncomeLevel] = useState('normal');

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
        nicNumber: '',
        nicFile: null,
        licenseFile: null,
        gramaNiladhariLetter: null,
        startupDetails: '',
        venueType: '',
    });

    const isBusiness = ['restaurant', 'supermarket'].includes(roleType);

    const showNicDocumentUpload = (nic) => {
        if (isValidNicNumber(nic)) return true;
        return String(nic || '').replace(/\s/g, '').length >= 9;
    };

    const needsAdminApprovalNotice =
        ['receiver', 'driver', 'restaurant', 'supermarket', 'individual'].includes(roleType) ||
        (roleType === 'customer' && customerIncomeLevel === 'low');

    useEffect(() => {
        if (!ALLOWED_ROLE_TYPES.includes(roleType)) {
            navigate('/signup', { replace: true });
        }
    }, [navigate, roleType]);

    const emailDebounceRef = useRef(null);
    const contactDebounceRef = useRef(null);
    const emailCheckIdRef = useRef(0);
    const contactCheckIdRef = useRef(0);

    const validationContext = useCallback(
        () => ({ roleType, password: formData.password }),
        [roleType, formData.password]
    );

    const validateField = (fieldId, value) =>
        validateSignupField(fieldId, value, validationContext());

    const runDuplicateCheck = async (fieldId, value, checkIdRef) => {
        const checkId = ++checkIdRef.current;
        try {
            if (fieldId === 'email') {
                const email = normalizeEmail(value);
                const { exists } = await checkEmailExists(email);
                if (checkId !== checkIdRef.current) return;
                setErrors((prev) => {
                    if (exists) return { ...prev, email: EMAIL_DUPLICATE_MSG };
                    if (prev.email === EMAIL_DUPLICATE_MSG) {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                    }
                    return prev;
                });
            } else if (fieldId === 'contactNo') {
                const { exists } = await checkContactNoExists(value.replace(/\s/g, ''));
                if (checkId !== checkIdRef.current) return;
                setErrors((prev) => {
                    if (exists) return { ...prev, contactNo: CONTACT_DUPLICATE_MSG };
                    if (prev.contactNo === CONTACT_DUPLICATE_MSG) {
                        const next = { ...prev };
                        delete next.contactNo;
                        return next;
                    }
                    return prev;
                });
            }
        } catch {
            if (checkId !== checkIdRef.current) return;
        }
    };

    const scheduleDuplicateCheck = (fieldId, value) => {
        if (fieldId === 'email') {
            clearTimeout(emailDebounceRef.current);
            if (!isValidEmail(value)) return;
            emailDebounceRef.current = setTimeout(
                () => runDuplicateCheck('email', value, emailCheckIdRef),
                DUPLICATE_CHECK_DEBOUNCE_MS
            );
        } else if (fieldId === 'contactNo') {
            clearTimeout(contactDebounceRef.current);
            const contact = value.replace(/\s/g, '');
            if (!isValidContactNo(contact)) return;
            contactDebounceRef.current = setTimeout(
                () => runDuplicateCheck('contactNo', contact, contactCheckIdRef),
                DUPLICATE_CHECK_DEBOUNCE_MS
            );
        }
    };

    const handleContactChange = (e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
        const fullContact = buildContactNo(digits);

        setFormData((prev) => ({ ...prev, contactNo: fullContact }));

        const error = validateSignupField('contactNo', fullContact, validationContext());
        setErrors((errPrev) => ({ ...errPrev, contactNo: error || undefined }));

        contactCheckIdRef.current += 1;
        scheduleDuplicateCheck('contactNo', fullContact);
    };

    const handleContactBlur = async () => {
        const fullContact = buildContactNo(getContactDigits(formData.contactNo));
        const error = validateField('contactNo', fullContact);
        setErrors((prev) => ({ ...prev, contactNo: error || undefined }));

        if (!error && isValidContactNo(fullContact)) {
            await runDuplicateCheck('contactNo', fullContact, contactCheckIdRef);
        }
    };

    const renderContactNoField = () => (
        <div className="input__group">
            <label htmlFor="contactNoDigits">Contact No</label>
            <div className="contact-input-row">
                <span className="contact-prefix" aria-hidden="true">
                    +94
                </span>
                <input
                    type="tel"
                    id="contactNoDigits"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="771234567"
                    maxLength={9}
                    value={getContactDigits(formData.contactNo)}
                    onChange={handleContactChange}
                    onBlur={handleContactBlur}
                />
            </div>
            {errors.contactNo && <span className="error-message">{errors.contactNo}</span>}
        </div>
    );

    const LIVE_VALIDATE_FIELDS = new Set([
        'email',
        'password',
        'retypePassword',
        'username',
        'receiverName',
        'driverName',
        'businessName',
        'vehicleNumber',
    ]);

    const handleInputChange = (e) => {
        const { id, value, type, checked } = e.target;
        const nextValue = type === 'checkbox' ? checked : value;

        setFormData((prev) => {
            const next = { ...prev, [id]: nextValue };
            if (LIVE_VALIDATE_FIELDS.has(id)) {
                const error = validateSignupField(id, nextValue, {
                    roleType,
                    password: id === 'retypePassword' ? prev.password : next.password,
                });
                setErrors((errPrev) => ({ ...errPrev, [id]: error || undefined }));
            }
            if (id === 'password' && prev.retypePassword) {
                const retypeErr = validateSignupField('retypePassword', prev.retypePassword, {
                    roleType,
                    password: nextValue,
                });
                setErrors((errPrev) => ({ ...errPrev, retypePassword: retypeErr || undefined }));
            }
            return next;
        });

        if (id === 'email') {
            emailCheckIdRef.current += 1;
            scheduleDuplicateCheck('email', nextValue);
        }
    };

    const handleBlur = async (e) => {
        const fieldId = e.target.id;
        const value = e.target.value;
        const error = validateField(fieldId, value);

        setErrors((prev) => ({ ...prev, [fieldId]: error || undefined }));

        if (!error && value?.trim()) {
            if (fieldId === 'email' && isValidEmail(value)) {
                await runDuplicateCheck('email', value, emailCheckIdRef);
            }
        }
    };

    useEffect(() => {
        return () => {
            clearTimeout(emailDebounceRef.current);
            clearTimeout(contactDebounceRef.current);
        };
    }, []);

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

        if (roleType === 'customer') {
            if (!customerIncomeLevel) {
                newErrors.customerIncomeLevel = 'Please select your income level';
            }
            if (customerIncomeLevel === 'low' && !formData.gramaNiladhariLetter) {
                newErrors.gramaNiladhariLetter = 'Grama Niladhari letter is required for low income registration';
            }
        }

        if (roleType === 'individual' || roleType === 'customer') {
            const usernameErr = validateField('username', formData.username);
            if (usernameErr) newErrors.username = usernameErr;
            if (roleType === 'individual') {
                const nicErr = validateField('nicNumber', formData.nicNumber);
                if (nicErr) newErrors.nicNumber = nicErr;
                const bizErr = validateField('businessName', formData.businessName);
                if (bizErr) newErrors.businessName = bizErr;
                if (!formData.startupDetails?.trim()) {
                    newErrors.startupDetails = 'Startup details are required';
                }
                if (!formData.nicFile) newErrors.nicFile = 'NIC document (PDF) is required';
            }
        } else if (isBusiness) {
            if (roleType === 'restaurant' && !formData.venueType) {
                newErrors.venueType = VENUE_TYPE_REQUIRED_MSG;
            }
            const bizErr = validateField('businessName', formData.businessName);
            if (bizErr) newErrors.businessName = bizErr;
            if (!formData.businessRegFile) newErrors.businessRegFile = 'Business registration file is required';
            if (!formData.addressProofFile) newErrors.addressProofFile = 'Address proof file is required';
        } else if (roleType === 'receiver') {
            const recErr = validateField('receiverName', formData.receiverName);
            if (recErr) newErrors.receiverName = recErr;
            if (!formData.receiverType) newErrors.receiverType = 'Receiver type is required';
            if (!receiverIncomeLevel) {
                newErrors.receiverIncomeLevel = 'Please select an income level';
            }
            if (receiverIncomeLevel === 'low' && !formData.gramaNiladhariLetter) {
                newErrors.gramaNiladhariLetter = 'Grama Niladhari letter is required for low income receivers';
            }
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

    const getSubmitBlockers = () => {
        const blockers = { ...getValidationErrors() };
        Object.entries(errors).forEach(([key, message]) => {
            if (message) blockers[key] = blockers[key] || message;
        });
        return blockers;
    };

    const submitBlockers = getSubmitBlockers();
    const submitDisabled = loading || Object.keys(submitBlockers).length > 0;
    const submitDisabledReason = loading
        ? 'Please wait while your account is being created.'
        : Object.values(submitBlockers).join(' • ');

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

            if (roleType === 'customer') {
                submitFormData.append('customerIncomeLevel', customerIncomeLevel);
                if (customerIncomeLevel === 'low' && formData.gramaNiladhariLetter) {
                    submitFormData.append('gramaNiladhariLetter', formData.gramaNiladhariLetter);
                }
            }

            if (roleType === 'individual' || roleType === 'customer') {
                submitFormData.append('username', formData.username);
                if (roleType === 'individual') {
                    submitFormData.append('nicNumber', formData.nicNumber.replace(/\s/g, '').toUpperCase());
                    submitFormData.append('businessName', formData.businessName);
                    submitFormData.append('startupDetails', formData.startupDetails);
                    if (formData.nicFile) submitFormData.append('nicFile', formData.nicFile);
                }
            } else if (isBusiness) {
                submitFormData.append('businessName', formData.businessName);
                if (roleType === 'restaurant') {
                    submitFormData.append('venueType', formData.venueType);
                }
                if (formData.businessRegFile) submitFormData.append('businessRegFile', formData.businessRegFile);
                if (formData.addressProofFile) submitFormData.append('addressProofFile', formData.addressProofFile);
            } else if (roleType === 'receiver') {
                submitFormData.append('receiverName', formData.receiverName);
                submitFormData.append('receiverType', formData.receiverType);
                submitFormData.append('receiverIncomeLevel', receiverIncomeLevel);
                if (receiverIncomeLevel === 'low' && formData.gramaNiladhariLetter) {
                    submitFormData.append('gramaNiladhariLetter', formData.gramaNiladhariLetter);
                }
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

                    {needsAdminApprovalNotice && (
                        <p className="signup__approval-notice">
                            <strong>Administrator review required.</strong> After you verify your email, a FoodLoop admin must approve your account, after that you can sign in.
                        </p>
                    )}

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
                        
                        {roleType === 'customer' && (
                            <div className="income__tier__section">
                                <label className="income__tier__label">Income level</label>
                                <p className="income__tier__hint">Choose the option that applies to you. Low-income customers must upload a Grama Niladhari certificate.</p>
                                <div className="income__tier__options">
                                    <button
                                        type="button"
                                        className={`income__tier__card ${customerIncomeLevel === 'normal' ? 'active' : ''}`}
                                        onClick={() => {
                                            setCustomerIncomeLevel('normal');
                                            setErrors((prev) => ({ ...prev, customerIncomeLevel: undefined, gramaNiladhariLetter: undefined }));
                                            setFormData((prev) => ({ ...prev, gramaNiladhariLetter: null }));
                                        }}
                                    >
                                        <strong>Normal income</strong>
                                        <span>Standard marketplace access</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`income__tier__card ${customerIncomeLevel === 'low' ? 'active' : ''}`}
                                        onClick={() => {
                                            setCustomerIncomeLevel('low');
                                            setErrors((prev) => ({ ...prev, customerIncomeLevel: undefined }));
                                        }}
                                    >
                                        <strong>Low income</strong>
                                        <span>Subsidized access — GN letter required</span>
                                    </button>
                                </div>
                                {errors.customerIncomeLevel && (
                                    <span className="error-message">{errors.customerIncomeLevel}</span>
                                )}
                                {customerIncomeLevel === 'low' && (
                                    <div className="input__group border__group">
                                        <label>Grama Niladhari letter</label>
                                        <span className="file__hint">Upload PDF only (max 10 MB)</span>
                                        <div className="file__drop" onClick={() => triggerFileUpload('gn-letter-file')}>
                                            <span>{formData.gramaNiladhariLetter ? formData.gramaNiladhariLetter.name : 'Import or Drag File'}</span>
                                            <button className="add__file__btn" type="button">Add File</button>
                                        </div>
                                        <input type="file" id="gn-letter-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'gramaNiladhariLetter')} />
                                        {errors.gramaNiladhariLetter && <span className="error-message">{errors.gramaNiladhariLetter}</span>}
                                    </div>
                                )}
                            </div>
                        )}

                        {(roleType === 'individual' || roleType === 'customer') && (
                            <>
                                <div className="input__group">
                                    <label htmlFor="username">Name</label>
                                    <input type="text" id="username" placeholder="Eg: John" value={formData.username} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.username && <span className="error-message">{errors.username}</span>}
                                </div>
                                {roleType === 'individual' && (
                                    <>
                                        <div className="input__group">
                                            <label htmlFor="nicNumber">NIC number</label>
                                            <input
                                                type="text"
                                                id="nicNumber"
                                                placeholder="Eg: 123456789V or 200012345678"
                                                value={formData.nicNumber}
                                                onChange={handleInputChange}
                                                onBlur={handleBlur}
                                                autoComplete="off"
                                            />
                                            {errors.nicNumber && <span className="error-message">{errors.nicNumber}</span>}
                                            {!showNicDocumentUpload(formData.nicNumber) && formData.nicNumber.trim() && (
                                                <span className="file__hint" style={{ marginTop: '6px' }}>
                                                    Enter at least 9 digits (or full NIC) to upload your document.
                                                </span>
                                            )}
                                        </div>
                                        {showNicDocumentUpload(formData.nicNumber) && (
                                            <div className="input__group border__group">
                                                <label>NIC document (front &amp; back)</label>
                                                <span className="file__hint">Upload PDF only (max 10 MB)</span>
                                                <div className="file__drop" onClick={() => triggerFileUpload('individual-nic-file')}>
                                                    <span>{formData.nicFile ? formData.nicFile.name : 'Import or Drag File'}</span>
                                                    <button className="add__file__btn" type="button">Add File</button>
                                                </div>
                                                <input type="file" id="individual-nic-file" accept="application/pdf" hidden onChange={(e) => handleFileChange(e, 'nicFile')} />
                                                {errors.nicFile && <span className="error-message">{errors.nicFile}</span>}
                                            </div>
                                        )}
                                        <div className="input__group">
                                            <label htmlFor="businessName">Startup / business name</label>
                                            <input type="text" id="businessName" placeholder="Eg: John Bites" value={formData.businessName} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                            {errors.businessName && <span className="error-message">{errors.businessName}</span>}
                                        </div>
                                        <div className="input__group">
                                            <label htmlFor="startupDetails">Startup details</label>
                                            <textarea id="startupDetails" placeholder="Describe your home startup (what you sell, hours, etc.)" value={formData.startupDetails} onChange={handleInputChange} onBlur={handleBlur} style={{ padding: '12px', borderRadius: '10px', border: '1px solid #ccc', outline: 'none', resize: 'vertical' }} rows="3" />
                                            {errors.startupDetails && <span className="error-message">{errors.startupDetails}</span>}
                                        </div>
                                    </>
                                )}
                                <div className="input__group">
                                    <label htmlFor="email">Email</label>
                                    <input type="email" id="email" placeholder="Eg: JohnDoe@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    {renderContactNoField()}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                            </>
                        )}

                        {isBusiness && (
                            <>
                                {roleType === 'restaurant' && (
                                    <div className="venue__type__section">
                                        <label className="venue__type__label">Restaurant / Wedding Hall</label>
                                        <p className="venue__type__hint">Select the type that best describes your business.</p>
                                        <div className="venue__type__options">
                                            {VENUE_TYPE_OPTIONS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={`venue__type__card ${formData.venueType === option.value ? 'active' : ''}`}
                                                    onClick={() => {
                                                        setFormData((prev) => ({ ...prev, venueType: option.value }));
                                                        setErrors((prev) => ({ ...prev, venueType: undefined }));
                                                    }}
                                                >
                                                    <strong>{option.label}</strong>
                                                </button>
                                            ))}
                                        </div>
                                        {errors.venueType && (
                                            <span className="error-message">{errors.venueType}</span>
                                        )}
                                    </div>
                                )}
                                <div className="input__group">
                                    <label htmlFor="businessName">Business Name</label>
                                    <input type="text" id="businessName" placeholder="Eg: Green Veggies" value={formData.businessName} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
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
                                    <input type="email" id="email" placeholder="Eg: business@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    {renderContactNoField()}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                            </>
                        )}

                        {roleType === 'receiver' && (
                            <>
                                <div className="row">
                                    <div className="input__group half">
                                        <label htmlFor="receiverName">Receiver Name</label>
                                        <input type="text" id="receiverName" placeholder="Eg: Hope Shelter" value={formData.receiverName} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
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
                                    <input type="email" id="email" placeholder="Eg: receiver@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    {renderContactNoField()}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
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
                                        <input type="text" id="driverName" placeholder="Eg: Alex" value={formData.driverName} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                        {errors.driverName && <span className="error-message">{errors.driverName}</span>}
                                    </div>
                                    <div className="input__group half">
                                        <label htmlFor="vehicleNumber">Vehicle number</label>
                                        <input type="text" id="vehicleNumber" placeholder="Eg: BYD 2344" value={formData.vehicleNumber} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
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
                                    <input type="email" id="email" placeholder="Eg: driver@gmail.com" value={formData.email} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.email && <span className="error-message">{errors.email}</span>}
                                </div>
                                <div className="input__group">
                                    {renderContactNoField()}
                                </div>
                                <div className="input__group">
                                    <label htmlFor="address">Address</label>
                                    <input type="text" id="address" placeholder="Eg: Colombo" value={formData.address} onChange={handleInputChange} onBlur={handleBlur} autoComplete="off" />
                                    {errors.address && <span className="error-message">{errors.address}</span>}
                                </div>
                            </>
                        )}

                        {/* Dummy inputs to capture browser autofill and protect the real Address & Password fields */}
                        <input
                            type="text"
                            name="prevent_autofill_username"
                            autoComplete="username"
                            style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                            tabIndex={-1}
                            readOnly
                            aria-hidden="true"
                        />
                        <input
                            type="password"
                            name="prevent_autofill_password"
                            autoComplete="new-password"
                            style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                            tabIndex={-1}
                            readOnly
                            aria-hidden="true"
                        />

                        <div className="row">
                            <div className="input__group half">
                                <label htmlFor="password">Password</label>
                                <div className="password__input__wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        id="password"
                                        placeholder="Letters, numbers & symbols (8+)"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        autoComplete="new-password"
                                    />
                                    <span
                                        className="toggle__password"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword(!showPassword)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setShowPassword(!showPassword);
                                            }
                                        }}
                                        style={{ zIndex: 10 }}
                                    >
                                        {showPassword ? (
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Hide</span>
                                        ) : (
                                            <img src={eye} alt="Show Password" />
                                        )}
                                    </span>
                                </div>
                                {errors.password && <span className="error-message">{errors.password}</span>}
                            </div>
                            <div className="input__group half">
                                <label htmlFor="retypePassword">Retype Password</label>
                                <div className="password__input__wrapper">
                                    <input
                                        type={showRetypePassword ? 'text' : 'password'}
                                        id="retypePassword"
                                        placeholder="******"
                                        value={formData.retypePassword}
                                        onChange={handleInputChange}
                                        onBlur={handleBlur}
                                        autoComplete="new-password"
                                    />
                                    <span
                                        className="toggle__password"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={showRetypePassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowRetypePassword(!showRetypePassword)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setShowRetypePassword(!showRetypePassword);
                                            }
                                        }}
                                        style={{ zIndex: 10 }}
                                    >
                                        {showRetypePassword ? (
                                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#555' }}>Hide</span>
                                        ) : (
                                            <img src={eye} alt="Show Password" />
                                        )}
                                    </span>
                                </div>
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

                    <div
                        className={`create-account-btn-wrap${submitDisabled ? ' is-disabled' : ''}`}
                        title={submitDisabled && submitDisabledReason ? submitDisabledReason : undefined}
                    >
                        <button
                            type="button"
                            className="create__account__btn"
                            onClick={handleSubmit}
                            disabled={submitDisabled}
                            aria-disabled={submitDisabled}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </div>

                    <div className="signup__footer">
                        <p>Already have an account? <Link to="/login">Sign In</Link></p>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default SignupPage;
