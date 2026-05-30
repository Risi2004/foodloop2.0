import iconWhatsapp from '../../../assets/icons/footer/1.svg';
import iconFacebook from '../../../assets/icons/footer/2.svg';
import iconInstagram from '../../../assets/icons/footer/3.svg';
import iconTwitter from '../../../assets/icons/footer/4.svg';
import { FOOTER_SOCIAL_LINKS } from '../../../constants/socialLinks';
import './FooterSocialLinks.css';

const SOCIAL_ICONS = {
  whatsapp: iconWhatsapp,
  facebook: iconFacebook,
  instagram: iconInstagram,
  twitter: iconTwitter,
};

function FooterSocialLinks() {
  return (
    <div className="footer__s2__sub">
      <h3>Follow Us On</h3>
      {FOOTER_SOCIAL_LINKS.map(({ id, label, href }) => (
        <a
          key={id}
          href={href}
          className="footer-social-link"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit FoodLoop on ${label}`}
        >
          <img src={SOCIAL_ICONS[id]} alt="" />
        </a>
      ))}
    </div>
  );
}

export default FooterSocialLinks;
