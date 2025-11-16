import React, { useState } from 'react'
import './userLogin.css'
import { FaUserAstronaut } from "react-icons/fa";
import { FaRegUserCircle } from "react-icons/fa";
import { AiTwotoneMail } from "react-icons/ai";
import { RiLockPasswordLine } from "react-icons/ri";
import { FaMale, FaFemale, FaCalendar, FaGraduationCap, FaPhone } from 'react-icons/fa';

const UserLogin = () => {
    const [action, setAction] = useState("Login");
    const [formData, setFormData] = useState({
        // Student table fields
        first_name: '',
        last_name: '',
        gender: '',
        birthdate: '',
        program: '',
        year_level: '',
        contact_number: '',
        email_address: '',
        // User account fields
        username: '',
        password: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleGenderSelect = (selectedGender) => {
        setFormData({
            ...formData,
            gender: selectedGender
        });
    };

    const handleSignUp = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    // Student data (all fields from your table)
                    first_name: formData.first_name,
                    last_name: formData.last_name,
                    gender: formData.gender,
                    birthdate: formData.birthdate,
                    program: formData.program,
                    year_level: formData.year_level,
                    contact_number: formData.contact_number,
                    email_address: formData.email_address,
                    // User account data
                    username: formData.username,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registration successful! You can now login.');
                setAction("Login");
                // Clear form
                setFormData({
                    first_name: '',
                    last_name: '',
                    gender: '',
                    birthdate: '',
                    program: '',
                    year_level: '',
                    contact_number: '',
                    email_address: '',
                    username: '',
                    password: ''
                });
            } else {
                alert(data.message || 'Registration failed!');
            }
            
        } catch (error) {
            console.error('Sign up error:', error);
            alert('Registration failed! Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: formData.username,
                    password: formData.password
                })
            });

            const data = await response.json();

            if (response.ok) {
            const { token, user } = data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));

            alert('Login successful!');

            if (user?.role === 'Admin') {
                window.location.href = '/admin-dashboard';
            } else {
                window.location.href = '/student-dashboard';
            }
}
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed! Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (action === "Sign Up") {
            // Validate all required fields for signup
            if (!formData.first_name || !formData.last_name || !formData.username || 
                !formData.email_address || !formData.password || !formData.program || 
                !formData.year_level || !formData.contact_number) {
                alert('Please fill all required fields!');
                return;
            }
            handleSignUp();
        } else {
            // Validate login fields
            if (!formData.username || !formData.password) {
                alert('Please enter username and password!');
                return;
            }
            handleLogin();
        }
    };

    const switchMode = (mode) => {
        setAction(mode);
        setFormData({
            first_name: '',
            last_name: '',
            gender: '',
            birthdate: '',
            program: '',
            year_level: '',
            contact_number: '',
            email_address: '',
            username: '',
            password: ''
        });
    };

    // Program options
    const programOptions = [
        'Computer Science',
        'Information Technology',
        'Computer Engineering',
    ];

    // Year level options
    const yearLevelOptions = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

    return (
    <div className='container'>
        <div className='login-box'>
            <div className="header">
                <div className="text">{action}</div>
                <div className="underline"></div>
            </div>
            
            <form onSubmit={handleSubmit}>
                <div className="inputs">
                    {action === "Sign Up" && (
                        <>
                            {/* Personal Information */}
                            <div className="input">
                                <FaUserAstronaut className="icon" />
                                <input 
                                    type="text" 
                                    name="first_name"
                                    placeholder='First Name *'
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="input">
                                <FaUserAstronaut className="icon" />
                                <input 
                                    type="text" 
                                    name="last_name"
                                    placeholder='Last Name *'
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Academic Information */}
                            <div className="input">
                                <FaGraduationCap className="icon" />
                                <select 
                                    name="program"
                                    value={formData.program}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Program *</option>
                                    {programOptions.map(program => (
                                        <option key={program} value={program}>
                                            {program}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="input">
                                <FaGraduationCap className="icon" />
                                <select 
                                    name="year_level"
                                    value={formData.year_level}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Select Year Level *</option>
                                    {yearLevelOptions.map(year => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Contact Information */}
                            <div className="input">
                                <AiTwotoneMail className="icon" />
                                <input 
                                    type="email" 
                                    name="email_address"
                                    placeholder='Email Address *'
                                    value={formData.email_address}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="input">
                                <FaPhone className="icon" />
                                <input 
                                    type="tel" 
                                    name="contact_number"
                                    placeholder='Contact Number *'
                                    value={formData.contact_number}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            {/* Personal Details */}
                            <div className="input">
                                <FaCalendar className="icon" />
                                <input 
                                    type="date" 
                                    name="birthdate"
                                    placeholder='Birthdate'
                                    value={formData.birthdate}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="gender-selection">
                                <label>Gender</label>
                                <div className="gender-buttons">
                                    <button 
                                        type="button" 
                                        className={`gender-btn ${formData.gender === 'male' ? 'active' : ''}`}
                                        onClick={() => handleGenderSelect('male')}
                                    >
                                        <FaMale className="icon" />
                                        Male
                                    </button>
                                    <button 
                                        type="button" 
                                        className={`gender-btn ${formData.gender === 'female' ? 'active' : ''}`}
                                        onClick={() => handleGenderSelect('female')}
                                    >
                                        <FaFemale className="icon" />
                                        Female
                                    </button>
                                </div>
                            </div>

                            {/* Username for login */}
                            <div className="input">
                                <FaRegUserCircle className="icon" />
                                <input 
                                    type="text" 
                                    name="username"
                                    placeholder='Username *'
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="input">
                                <RiLockPasswordLine className="icon" />
                                <input 
                                    type="password" 
                                    name="password"
                                    placeholder='Password *'
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    minLength="6"
                                />
                            </div>
                        </>
                    )}

                    {/* Login fields */}
                    {action === "Login" && (
                        <>
                            <div className="input">
                                <FaRegUserCircle className="icon" />
                                <input 
                                    type="text" 
                                    name="username"
                                    placeholder='Username *'
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    required
                                />
                                
                            </div>
                            <div className="input">
                                <RiLockPasswordLine className="icon" />
                                <input 
                                    type="password" 
                                    name="password"
                                    placeholder='Password *'
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    required
                                    minLength="6"
                                />
                            </div>
                        </>
                    )}
                </div>
                
                {action === "Login" && (
                    <div className="forgot-password">
                        Lost Password? <span>Click Here!</span>
                    </div>
                )}
                
                {/* Submit Button - Centered */}
                <div className="submit-main-container">
                    <button 
                        type="submit" 
                        className="submit-main-button" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : (action === "Login" ? "Login" : "Create Account")}
                    </button>
                </div>

                {/* Switch Mode */}
                <div className="switch-mode">
                    {action === "Login" ? (
                        <p>
                            Don't have an account? 
                            <span onClick={() => switchMode("Sign Up")}> Sign up</span>
                        </p>
                    ) : (
                        <p>
                            Already have an account? 
                            <span onClick={() => switchMode("Login")}> Login</span>
                        </p>
                    )}
                </div>
            </form>
        </div>
    </div>
)
}

export default UserLogin;