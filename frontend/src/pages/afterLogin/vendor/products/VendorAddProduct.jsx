import React, { useState } from 'react';
import DonationMedia from '../../../../components/afterLogin/donor/myDonation/donationMedia/DonationMedia';
import VendorProductForm from '../../../../components/afterLogin/vendor/products/VendorProductForm';
import VendorSidebar from '../../../../components/afterLogin/vendor/sidebar/VendorSidebar';
import './VendorAddProduct.css';

const VendorAddProduct = () => {
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
        setAiPredictions(null);
    };

    return (
        <div className="vendor-layout">
            <VendorSidebar />
            <div className="vendor-main-content">
                <header className="vendor-header">
                    <h1>Add New Marketplace Item</h1>
                    <p>Upload a photo and set your product details to list on FreshMarket.</p>
                </header>

                <div className="add-product-page-container">
                    <main className="add-product-content">
                        <DonationMedia 
                            onImageUploaded={handleImageUploaded}
                            onAnalysisComplete={handleAnalysisComplete}
                            onError={handleError}
                        />
                        <VendorProductForm 
                            aiPredictions={aiPredictions}
                            imageUrl={imageUrl}
                            error={error}
                        />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default VendorAddProduct;
