import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SignupSelection.css';

function SignupSelection() {
    const navigate = useNavigate();

    const roles = [
        { id: 'receiver', title: 'Receiver', description: 'NGOs, Food Banks & Organizations' },
        { id: 'driver', title: 'Driver', description: 'Volunteer & Paid Drivers' },
        { id: 'restaurant', title: 'Restaurant / Hotel', description: 'Donate or sell food items' },
        { id: 'supermarket', title: 'Supermarket / Groceries', description: 'Donate or sell groceries' },
        { id: 'business', title: 'Other Business', description: 'Any other business entity' },
        { id: 'individual', title: 'Individual / Startup', description: 'Households or home startups' },
        { id: 'customer', title: 'Customer', description: 'General public login' },
    ];

    const handleRoleSelect = (id) => {
        navigate(`/signup/${id}`);
    };

    return (
        <div className="signup__selection__page">
            <div className="selection__container">
                <h1 className="selection__title">Choose Your Account Type</h1>
                <p className="selection__subtitle">Select the category that best describes you or your business.</p>

                <div className="role__grid">
                    {roles.map((role) => (
                        <div key={role.id} className="role__card" onClick={() => handleRoleSelect(role.id)}>
                            <h3>{role.title}</h3>
                            <p>{role.description}</p>
                        </div>
                    ))}
                </div>

                <div className="selection__footer">
                    <p>Already have an account? <Link to="/login">Sign In</Link></p>
                </div>
            </div>
        </div>
    );
}

export default SignupSelection;
