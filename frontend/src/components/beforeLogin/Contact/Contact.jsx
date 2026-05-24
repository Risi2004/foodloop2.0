import { useState, useEffect } from 'react';
import icon1 from '../../../assets/icons/contact/1.svg';
import icon2 from '../../../assets/icons/contact/2.svg';
import icon3 from '../../../assets/icons/contact/3.svg';
import './Contact.css';
import { getUser, isAuthenticated } from '../../../utils/auth';
import { submitContactMessage } from '../../../services/contactApi';

function getDisplayName(user) {
  if (!user) return '';
  if (user.role === 'Donor') {
    return user.donorType === 'Business' ? (user.businessName || user.email) : (user.username || user.email);
  }
  if (user.role === 'Receiver') return user.receiverName || user.email;
  if (user.role === 'Driver') return user.driverName || user.email;
  return user.email || '';
}

function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill name, email, contact no only for registered (logged-in) users; guests see empty fields
  useEffect(() => {
    if (!isAuthenticated()) return;
    const user = getUser();
    if (user) {
      setName(getDisplayName(user) || '');
      setEmail(user.email || '');
      setContactNo(user.contactNo || '');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!name || !name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email || !email.trim()) {
      setError('Email is required');
      return;
    }
    if (!message || !message.trim()) {
      setError('Message is required');
      return;
    }
    setSubmitting(true);
    try {
      await submitContactMessage({ name, email, contactNo, subject, message });
      setSuccess(true);
      setMessage('');
      setSubject('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  const handleContactClick = () => {
    window.open("https://mail.google.com/mail/?view=cm&fs=1&to=foodloop.official27@gmail.com", "_blank");
  };

  return (
    <div id="contact" className='contact'>
      <div className='contact__s1'>
        <div className='contact__s1__sub1' onClick={handleContactClick}>
          <img src={icon3} alt="mail-icon" />
          <h5>Get In Touch</h5>
        </div>
        <h1>We'd Love To Hear From You</h1>
        <p style={{ marginBottom: "40px" }}>Have a question about the transparency loop? Want to partner with us? or just want to say hi? Drop us a message.</p>
        <div className='contact__s1__sub2'>
          <div className='contact__s1__sub2__sub'>
            <img src={icon1} alt="email-icon" />
            <div className='contact__s1__sub2__sub__sub'>
              <h3>Email Us</h3>
              <p>Our friendly team is here to help.</p>
              <h5 style={{ color: "#1F4E36" }}>foodloop.official27@gmail.com</h5>
            </div>
          </div>
          <div className='contact__s1__sub2__sub'>
            <img src={icon2} alt="location-icon" />
            <div className='contact__s1__sub2__sub__sub'>
              <h3>Visit Us</h3>
              <p>Come say hello at our office HQ.</p>
              <h5>381 Nawala Road</h5>
              <h5>Colombo, Sri Lanka</h5>
            </div>
          </div>
        </div>
      </div>
      <div className='contact__s2'>
        <form onSubmit={handleSubmit}>
          <div className='contact__s2__sub1'>
            <div className='contact__s2__sub__sub'>
              <label htmlFor="name">Name</label>
              <input type="text" id='name' placeholder='John Doe' value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className='contact__s2__sub__sub'>
              <label htmlFor="email">Email</label>
              <input type="email" id='email' placeholder='johndoe@gmail.com' value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className='contact__s2__sub__sub'>
              <label htmlFor="contactNo">Contact No</label>
              <input type="text" id='contactNo' placeholder='e.g. 0771234567' value={contactNo} onChange={(e) => setContactNo(e.target.value)} />
            </div>
          </div>
          <div className='contact__s2__sub2'>
            <label htmlFor="subject">Subject</label> <br />
            <input type="text" id='subject' placeholder='General Inquiry' value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className='contact__s2__sub2'>
            <label htmlFor="message">Message</label> <br />
            <textarea id='message' placeholder='How can we help you?' value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          {error && <p style={{ color: '#f87171', marginBottom: '12px' }}>{error}</p>}
          {success && <p style={{ color: '#86efac', marginBottom: '12px' }}>Message sent. You will receive a confirmation email.</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send Message'}</button>
        </form>
      </div>
    </div>
  );
}

export default Contact;
