import React, { useState, useEffect } from 'react';
import './DriverOnboarding.css';

function DriverOnboarding() {
    const [isOpen, setIsOpen] = useState(false);
    const [browserInfo, setBrowserInfo] = useState({
        isIosSafari: false,
        isMobileChrome: false,
        isDesktopChromium: false,
    });

    useEffect(() => {
        const completed = localStorage.getItem('driver_onboarding_completed');
        if (completed === 'true') return;

        // Platform & Standalone checks
        const mobileTest = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        const standaloneTest = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        // If already running as a standalone app, don't show the onboarding guide
        if (standaloneTest) return;

        // Browser checks
        const ua = navigator.userAgent;
        const isIosSafari = mobileTest && /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
        const isMobileChrome = mobileTest && (/Chrome/.test(ua) || /CriOS/.test(ua));
        const isDesktopChromium = !mobileTest && (/Chrome/.test(ua) || /Edg\//.test(ua));

        setBrowserInfo({ isIosSafari, isMobileChrome, isDesktopChromium });
        setIsOpen(true);
    }, []);

    const handleComplete = () => {
        localStorage.setItem('driver_onboarding_completed', 'true');
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-backdrop" onClick={handleComplete} />
            <div className="onboarding-modal">
                <div className="onboarding-modal__header">
                    <h2>📱 Download FoodLoop App</h2>
                </div>
                <div className="onboarding-modal__body">
                    <p>We recommend installing the FoodLoop web app on your device for quick access, real-time alerts, and a native application experience.</p>
                    
                    {browserInfo.isIosSafari ? (
                        <div className="browser-guide safari-guide">
                            <h3>Installing on iOS Safari:</h3>
                            <ol>
                                <li>Tap the <strong>Share</strong> button (box with upward arrow) in the Safari toolbar.</li>
                                <li>Scroll down the options and tap <strong>Add to Home Screen</strong>.</li>
                                <li>Tap <strong>Add</strong> in the top-right corner to complete.</li>
                            </ol>
                        </div>
                    ) : browserInfo.isMobileChrome ? (
                        <div className="browser-guide chrome-guide">
                            <h3>Installing on Mobile Chrome:</h3>
                            <ol>
                                <li>Tap the <strong>three dots</strong> menu icon in Chrome's top-right corner.</li>
                                <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                                <li>Confirm the installation in the prompt window.</li>
                            </ol>
                        </div>
                    ) : browserInfo.isDesktopChromium ? (
                        <div className="browser-guide desktop-guide">
                            <h3>Installing on Desktop (Chrome/Edge):</h3>
                            <ol>
                                <li>Look at the right side of your browser's address bar at the top.</li>
                                <li>Click the <strong>Install</strong> icon (displays as a monitor with an arrow, or overlapping squares).</li>
                                <li>Alternatively, open the browser's <strong>three dots</strong> menu, select <strong>Save and share</strong>, and click <strong>Install page</strong>.</li>
                            </ol>
                        </div>
                    ) : (
                        <div className="browser-guide generic-guide">
                            <h3>How to Install:</h3>
                            <ol>
                                <li>Open your browser's settings or menu button.</li>
                                <li>Select <strong>Install app</strong>, <strong>Add to Home Screen</strong>, or <strong>Install FoodLoop</strong>.</li>
                                <li>Confirm the prompt.</li>
                            </ol>
                        </div>
                    )}
                </div>
                <div className="onboarding-modal__footer">
                    <button className="onboarding-btn primary" onClick={handleComplete}>
                        Continue to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DriverOnboarding;
