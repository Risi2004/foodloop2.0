/**
 * Preloads all images used on Signup and Login pages.
 * Import the same assets so Vite resolves the same URLs; then preload by setting Image src.
 * Call this after the landing page initial load finishes so signup/login load instantly.
 */

// Signup page assets (same imports as Signup.jsx)
import donorImg from '../assets/images/sign-up/donor.svg';
import donorBusinessImg from '../assets/images/sign-up/donor-business.svg';
import receiverImg from '../assets/images/sign-up/receiver.svg';
import driverImg from '../assets/images/sign-up/driver.svg';
import scooterIcon from '../assets/icons/signup/scooter.svg';
import bikeIcon from '../assets/icons/signup/motorcycle.svg';
import carIcon from '../assets/icons/signup/car.svg';
import truckIcon from '../assets/icons/signup/truck.svg';
import defaultProfileIcon from '../assets/icons/afterLogin/navbar/profile.svg';

// Login page assets (same imports as LoginPage.jsx)
import loginImage from '../assets/images/login/login.svg';
import eyeIcon from '../assets/icons/login/eye-icon.svg';
import receiveIcon from '../assets/icons/login/receive.svg';

const SIGNUP_LOGIN_IMAGE_URLS = [
  donorImg,
  donorBusinessImg,
  receiverImg,
  driverImg,
  scooterIcon,
  bikeIcon,
  carIcon,
  truckIcon,
  defaultProfileIcon,
  loginImage,
  eyeIcon,
  receiveIcon,
];

/**
 * Preload signup and login images. Call once after landing page is visible.
 * Public assets (e.g. /logo.png) are loaded by absolute URL.
 */
export function preloadSignupLoginImages() {
  const urls = [...SIGNUP_LOGIN_IMAGE_URLS];
  const base = typeof window !== 'undefined' ? window.location.origin : '';
  if (base) urls.push(`${base}/logo.png`);

  urls.forEach((url) => {
    if (!url) return;
    const img = new Image();
    img.src = url;
  });
}
