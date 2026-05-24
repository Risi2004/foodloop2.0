import icon1 from '../../../assets/icons/about/1.svg'
import icon3 from '../../../assets/icons/about/3.svg'
import './Vision.css'

function Vision() {
    return (
        <div className="vision">
            <div className='vision__s1'>
                <div className='vision__s1__sub1'>
                    <img src={icon1} alt="vision-icon" />
                    <h1>01</h1>
                </div>
                <div className='vision__s1__sub2'>
                    <h1>Our Vision</h1>
                    <p>To create a seamless, technology-driven ecosystem where no food goes to waste and hunger is eradicated through community collaboration and verified action. We envision a future of abundance shared equitably.</p>
                </div>
            </div>
            <div className='foodloop__matters'>
                <img src={icon3} alt="foodloop-matters-icon" />
                <h1>Why FoodLoop Matters</h1>
                <p>Transparency isn't just a feature; it's the foundation of trust. Donors know where their contribution goes, and recipients receive safe, verified aid.</p>
            </div>
        </div>
    )
}

export default Vision; 