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
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [manualEntryMode, setManualEntryMode] = useState(false);

    const handleAnalysisComplete = (predictions, options = {}) => {
        setAiPredictions(predictions);
        setManualEntryMode(Boolean(options.manualEntryMode));
        if (!options.manualEntryMode) {
            setError(null);
        }
    };

    const handleImageUploaded = (url) => {
        setImageUrl(url || null);
        if (!url) {
            setAiPredictions(null);
            setManualEntryMode(false);
        }
    };

    const handleError = (errorMessage) => {
        setError(errorMessage);
        if (errorMessage && !String(errorMessage).includes('temporarily unavailable')) {
            setAiPredictions(null);
        }
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
                            onAnalysisLoadingChange={setIsAnalyzing}
                        />
                        <DonationForm
                            aiPredictions={aiPredictions}
                            imageUrl={imageUrl}
                            error={error}
                            isAnalyzing={isAnalyzing}
                            manualEntryMode={manualEntryMode}
                        />
                    </main>
                </div>
            </div>
            <DonorFooter />
        </>
    );
}

export default DonorMyDontaion;
