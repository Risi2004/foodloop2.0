import Mission from '../missionSection/Mission';
import Vision from '../visionSection/Vision'
import './About.css'

function About() {
    return (
        <div id="about" className='about__us'>
            <div className='about__us__s1'>
                <h1>Connecting Surplus To <span>Sustenance</span></h1>
                <p>We are building a world where food waste is a story of the past. By creating a transparent, traceable loop, we ensure every edible item finds its way to someone in need.</p>
            </div>
            <div className='about__us__s2'>
                <Vision />
                <Mission />
            </div>
        </div>
    )
}

export default About;