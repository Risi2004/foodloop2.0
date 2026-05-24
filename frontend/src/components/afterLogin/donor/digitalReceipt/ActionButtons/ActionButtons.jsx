import { getDonorReceiptPDF } from '../../../../../services/donationApi';
import downloadIcon from '../../../../../assets/impact-receipt/Download From Cloud.svg';
import './ActionButtons.css';

const ActionButtons = ({ donationId, receipt }) => {
    const handleDownloadPDF = async () => {
        if (!receipt) {
            alert('Impact receipt is not yet available. The receiver will submit it after delivery.');
            return;
        }
        try {
            const blob = await getDonorReceiptPDF(donationId);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `impact-receipt-${donationId}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            alert(err.message || 'Failed to download PDF');
        }
    };

    return (
        <div className="action-buttons-container">
            <button
                type="button"
                className="btn-secondary"
                onClick={handleDownloadPDF}
                disabled={!receipt}
            >
                <img src={downloadIcon} alt="" className="action-btn-icon" /> PDF
            </button>
        </div>
    );
};

export default ActionButtons;
