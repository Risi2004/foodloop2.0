import './AddBranchesForm.css';

function AddBranchesForm() {
    return (
        <div className="add-branches-card">
            <div className="branch-section-header">
                <span className="icon">🏢</span>
                <h3>Add Branches</h3>
            </div>

            <div className="existing-branches">
                <div className="branch-item">
                    <div className="branch-details">
                        <h4>Upper West Side</h4>
                        <p>BRANCH CODE -001</p>
                    </div>
                    <button className="remove-branch-btn">−</button>
                </div>
            </div>

            <div className="form-grid">
                <div className="form-group">
                    <label>Branch Name</label>
                    <input type="text" placeholder="Eg:-jjhon." />
                </div>
                <div className="form-group">
                    <label>Branch CODE</label>
                    <input type="text" placeholder="#3111" />
                </div>
                <div className="form-group full-width">
                    <label>Branch Address</label>
                    <textarea placeholder="Eg:-Downtown Financial District, NY 10004."></textarea>
                </div>
            </div>

            <div className="file-upload-section">
                <label>Address Proof</label>
                <div className="file-drop-zone">
                    <span className="upload-text">Import or Darg File</span>
                    <button className="add-file-label">Add File</button>
                </div>
            </div>

            <div className="form-actions">
                <button className="cancel-btn">Cancel</button>
                <button className="save-btn">Add</button>
            </div>
        </div>
    );
}

export default AddBranchesForm;
