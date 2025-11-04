import React from 'react'
import '../../cssPages/admin/adminLogin.css'
import { FaUserAstronaut } from "react-icons/fa";
import { AiTwotoneMail } from "react-icons/ai";
import { RiLockPasswordLine } from "react-icons/ri";

const adminLogin = () => {
  return (
    <div className='container'>
            <div className="header">
                <div className="text">
                    Sign Up
                </div>
                <div className="underline"></div>
    
            </div>
            <div className="inputs">
                <div className="input">
                    <FaUserAstronaut className="icon" />
                </div>
            </div>
            <div className="header">
                <div className="text">
                    Email
                </div>
                <div className="underline"></div>
    
            </div>
            <div className="inputs">
                <div className="input">
                    <AiTwotoneMail className="icon" />
                </div>
            </div>
            <div className="header">
                <div className="text">
                    Password
                </div>
                <div className="underline"></div>
    
            </div>
            <div className="inputs">
                <div className="input">
                    <RiLockPasswordLine className="icon" />
                </div>
            </div>
        </div>
    )

}

export default adminLogin