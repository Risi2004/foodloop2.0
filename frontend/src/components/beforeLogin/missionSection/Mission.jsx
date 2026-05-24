import { Link } from 'react-router-dom';
import icon2 from '../../../assets/icons/about/2.svg'
import icon4 from '../../../assets/icons/about/4.svg'
import icon5 from '../../../assets/icons/about/5.svg'
import './Mission.css';

function Mission() {
    return (
        <div className='mission'>
            <div className='mission__s1'>
                <div className='mission__s1__sub1'>
                    <img src={icon2} alt="mission-icon" />
                    <h1>02</h1>
                </div>
                <div className='mission__s1__sub2'>
                    <h1>Our Mission</h1>
                    <div className='mission__s1__sub2__sub2__sub'>
                        <img src={icon5} alt="point-icon" />
                        <div className='mission__s1__sub2__sub2__sub__text'>
                            <h3>Reduce</h3>
                            <p>Food waste at the source through better management.</p>
                        </div>
                    </div>
                    <div className='mission__s1__sub2__sub2__sub'>
                        <img src={icon5} alt="point-icon" />
                        <div className='mission__s1__sub2__sub2__sub__text'>
                            <h3>Redistribute</h3>
                            <p>Surplus efficiently using real-time tracking.</p>
                        </div>
                    </div>
                    <div className='mission__s1__sub2__sub2__sub'>
                        <img src={icon5} alt="point-icon" />
                        <div className='mission__s1__sub2__sub2__sub__text'>
                            <h3>Support</h3>
                            <p>NGOs with reliable data and resources.</p>
                        </div>
                    </div>
                    <div className='mission__s1__sub2__sub2__sub'>
                        <img src={icon5} alt="point-icon" />
                        <div className='mission__s1__sub2__sub2__sub__text'>
                            <h3>Promote</h3>
                            <p>A culture of sharing and sustainability.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div className='join__us'>
                <span><h1>Join us in turning</h1></span>
                <h1>surplus into support.</h1>
                <p>Together, we can close the gap.</p>
                <div className='join__us__btn'>
                    <Link to="/signup" className='join__us__btn1'>
                        Join as Volunteer
                        <img src={icon4} alt="join-as-volunteer" />
                    </Link>
                    <Link to="/signup" className='join__us__btn2'>Donate Food</Link>
                </div>
            </div>
        </div>
    )
}

export default Mission;
