import React, { useState } from 'react'
import '../../cssPages/client/clientLogin.css'
import { FaUserAstronaut } from "react-icons/fa";
import { AiTwotoneMail } from "react-icons/ai";
import { RiLockPasswordLine } from "react-icons/ri";

const ClientLogin = () => {

    const [action, setAction] = useState("login");

  return (
    <div className='container'>
        <div className='login-box'>
            <div className="header">
                <div className="text">
                    Sign Up
                </div>
                <div className="underline"></div>

            </div>
            <div className="inputs">
                <div className="input">
                    <FaUserAstronaut className="icon" />
                    <input type="text" placeholder='Name'/>
                </div>
            </div>
            <div className="inputs">
                <div className="input">
                    <AiTwotoneMail className="icon" />
                    <input type="email" placeholder='Email'/>
                </div>
            </div>
            <div className="inputs">
                <div className="input">
                    <RiLockPasswordLine className="icon" />
                    <input type="password" placeholder='Password'/>
                </div>
            </div>
            <div className="forgot-password">
                Lost Password? <span>Click Here!</span>
            </div>
            <div className='submit-container'>
                <button className="submit-button">Sign Up</button>
                <button className="submit-button">Login</button>
            </div>
        </div>
    </div>
  )
}

export default ClientLogin