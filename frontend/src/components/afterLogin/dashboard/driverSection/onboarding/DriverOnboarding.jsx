import React, { useState, useEffect } from 'react';
import './DriverOnboarding.css';

const DESKTOP_STEPS = [
    {
        target: '.sidebar, .responsive__side__navbar',
        title: '🧭 Navigation Panel',
        content: 'Use this panel to manage active deliveries, check your profile, view notifications, or inspect payout logs.',
    },
    {
        target: '.header',
        title: '📦 Claim Food Deliveries',
        content: 'Click the "Pick Orders" action button here to view and accept active surplus food rescue jobs in your area.',
    },
    {
        target: '.function__section',
        title: '⚡ Your Driver Toolbox',
        content: 'Access computer-vision freshness analysis, route optimization calculators, and digital signature logs.',
    },
    {
        target: '.donor-map',
        title: '🗺️ Live Activity Map',
        content: 'View real-time coordinates of nearby restaurants, supermarkets, and NGO food pantries.',
    }
];

function DriverOnboarding() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [browserInfo, setBrowserInfo] = useState({ isSafari: false, isChrome: false });
    const [tourMode, setTourMode] = useState('none'); // 'pwa-download' or 'desktop-tour'
    const [currentStep, setCurrentStep] = useState(0);
    const [elementRect, setElementRect] = useState(null);

    useEffect(() => {
        const completed = localStorage.getItem('driver_onboarding_completed');
        if (completed === 'true') return;

        // Platform & Standalone checks
        const mobileTest = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
        const standaloneTest = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        setIsMobile(mobileTest);
        setIsStandalone(standaloneTest);

        // Browser checks
        const ua = navigator.userAgent;
        const isSafari = /iPhone|iPad|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
        const isChrome = /Chrome/.test(ua) || /CriOS/.test(ua);
        setBrowserInfo({ isSafari, isChrome });

        if (mobileTest && !standaloneTest) {
            setTourMode('pwa-download');
        } else {
            setTourMode('desktop-tour');
        }
        setIsOpen(true);
    }, []);

    // Track element position for desktop tour spotlight
    useEffect(() => {
        if (!isOpen || tourMode !== 'desktop-tour') return;

        const step = DESKTOP_STEPS[currentStep];
        if (!step) return;

        const selectors = step.target.split(',');
        let el = null;
        for (const selector of selectors) {
            el = document.querySelector(selector.trim());
            if (el && el.getBoundingClientRect().width > 0) break;
        }

        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            const updatePosition = () => {
                const rect = el.getBoundingClientRect();
                setElementRect({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
            };

            // Calculate after scroll finishes
            const timer = setTimeout(updatePosition, 400);
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updatePosition);
                window.removeEventListener('scroll', updatePosition);
            };
        } else {
            setElementRect(null);
        }
    }, [isOpen, tourMode, currentStep]);

    const handleNext = () => {
        if (currentStep < DESKTOP_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('driver_onboarding_completed', 'true');
        setIsOpen(false);
    };

    const getTooltipStyle = () => {
        if (!elementRect) return { display: 'none' };

        const viewportWidth = window.innerWidth;
        const tooltipWidth = 320;
        let left = elementRect.left + (elementRect.width / 2) - (tooltipWidth / 2);
        let top = elementRect.top + elementRect.height + 15;

        // Shift above the element if it's too close to the bottom
        if (top + 160 > document.documentElement.scrollHeight) {
            top = elementRect.top - 180;
        }

        if (left < 10) left = 10;
        if (left + tooltipWidth > viewportWidth - 10) {
            left = viewportWidth - tooltipWidth - 10;
        }

        return {
            left: `${left}px`,
            top: `${top}px`,
            width: `${tooltipWidth}px`
        };
    };

    if (!isOpen) return null;

    return (
        <div className="onboarding-overlay">
            {tourMode === 'pwa-download' && (
                <div className="onboarding-modal">
                    <div className="onboarding-modal__header">
                        <h2>📱 Download FoodLoop Driver App</h2>
                    </div>
                    <div className="onboarding-modal__body">
                        <p>We highly recommend downloading our app to your phone for real-time navigation alerts and mobile camera scanning features!</p>
                        
                        {browserInfo.isSafari ? (
                            <div className="browser-guide safari-guide">
                                <h3>Installing on iOS Safari:</h3>
                                <ol>
                                    <li>Tap the <strong>Share</strong> button (box with upward arrow) at the bottom of Safari.</li>
                                    <li>Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.</li>
                                    <li>Tap <strong>Add</strong> in the top-right corner to complete.</li>
                                </ol>
                            </div>
                        ) : browserInfo.isChrome ? (
                            <div className="browser-guide chrome-guide">
                                <h3>Installing on Android Chrome:</h3>
                                <ol>
                                    <li>Tap the <strong>three dots</strong> menu icon in Chrome's top-right corner.</li>
                                    <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
                                    <li>Confirm the installation in the prompt window.</li>
                                </ol>
                            </div>
                        ) : (
                            <div className="browser-guide generic-guide">
                                <h3>How to Install:</h3>
                                <p>Open your browser menu settings and select <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
                            </div>
                        )}
                    </div>
                    <div className="onboarding-modal__footer">
                        <button className="onboarding-btn primary" onClick={handleComplete}>
                            Continue to Website
                        </button>
                    </div>
                </div>
            )}

            {tourMode === 'desktop-tour' && (
                <>
                    <div className="onboarding-backdrop" onClick={handleComplete} />
                    {elementRect && (
                        <div 
                            className="onboarding-spotlight"
                            style={{
                                top: `${elementRect.top}px`,
                                left: `${elementRect.left}px`,
                                width: `${elementRect.width}px`,
                                height: `${elementRect.height}px`
                            }}
                        />
                    )}
                    <div className="onboarding-tooltip" style={getTooltipStyle()}>
                        <div className="tooltip-header">
                            <h3>{DESKTOP_STEPS[currentStep].title}</h3>
                            <button className="close-tour" onClick={handleComplete}>×</button>
                        </div>
                        <div className="tooltip-body">
                            <p>{DESKTOP_STEPS[currentStep].content}</p>
                        </div>
                        <div className="tooltip-footer">
                            <span className="step-indicator">
                                {currentStep + 1} / {DESKTOP_STEPS.length}
                            </span>
                            <div className="tooltip-actions">
                                {currentStep > 0 && (
                                    <button className="onboarding-btn secondary" onClick={handleBack}>
                                        Back
                                    </button>
                                )}
                                <button className="onboarding-btn primary" onClick={handleNext}>
                                    {currentStep === DESKTOP_STEPS.length - 1 ? 'Finish' : 'Next'}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default DriverOnboarding;
