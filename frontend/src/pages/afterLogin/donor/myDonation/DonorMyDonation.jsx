import { useState } from 'react';
import DonationMedia from '../../../../components/afterLogin/donor/myDonation/donationMedia/DonationMedia';
import DonationForm from '../../../../components/afterLogin/donor/myDonation/donationForm/DonationForm';
import DonorNavbar from "../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar";
import DonorFooter from "../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter"
import './DonorMyDonation.css';

function DonorMyDontaion() {
    const [aiPredictions, setAiPredictions] = useState(null);
    const [imageUrl, setImageUrl] = useState(null);
    const [error, setError] = useState(null);

    const handleAnalysisComplete = (predictions) => {
        setAiPredictions(predictions);
        setError(null);
    };

    const handleImageUploaded = (url) => {
        setImageUrl(url);
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        // Clear predictions on error
        setAiPredictions(null);
    };

    return (
        <>
            <DonorNavbar />
            <div className="new-donation-page">
                <div className="donation-container">
                    <main className="donation-content">
                        <DonationMedia 
                            onImageUploaded={handleImageUploaded}
                            onAnalysisComplete={handleAnalysisComplete}
                            onError={handleError}
                        />
                        <DonationForm 
                            aiPredictions={aiPredictions}
                            imageUrl={imageUrl}
                            error={error}
                        />
                    </main>
                </div>
            </div>
            <DonorFooter />
        </>
    );
}

export default DonorMyDontaion;
