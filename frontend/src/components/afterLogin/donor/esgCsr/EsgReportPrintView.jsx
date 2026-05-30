function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-LK', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
}

function EsgReportPrintView({ report }) {
  if (!report) return null;

  const { environmental: e, social: s, governance: g, summary } = report;

  return (
    <div className="esg-print-root" id="esg-print-report">
      <header className="esg-print-header">
        <img src="/logo.png" alt="FoodLoop" className="esg-print-logo" />
        <div>
          <h1>ESG &amp; CSR Impact Report</h1>
          <p className="esg-print-company">{report.company}</p>
          <p className="esg-print-meta">
            {report.periodLabel} · Generated {formatDate(report.generatedAt)}
          </p>
        </div>
      </header>

      {summary?.executiveSummary && (
        <section className="esg-print-section">
          <h2>Executive summary</h2>
          <p>{summary.executiveSummary}</p>
        </section>
      )}

      <section className="esg-print-section">
        <h2>Environmental</h2>
        <table className="esg-print-table">
          <tbody>
            <tr>
              <td>Meals shared</td>
              <td>{e.mealsShared}</td>
            </tr>
            <tr>
              <td>Food saved (kg)</td>
              <td>{e.foodSavedKg}</td>
            </tr>
            <tr>
              <td>CO₂ offset (kg)</td>
              <td>{e.co2OffsetKg}</td>
            </tr>
            <tr>
              <td>Waste diverted (kg)</td>
              <td>{e.wasteDivertedKg}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="esg-print-section">
        <h2>Social</h2>
        <table className="esg-print-table">
          <tbody>
            <tr>
              <td>People fed (portions)</td>
              <td>{s.peopleFed}</td>
            </tr>
            <tr>
              <td>Unique receivers</td>
              <td>{s.uniqueReceivers}</td>
            </tr>
            <tr>
              <td>Donated quantity</td>
              <td>{s.donateQuantity}</td>
            </tr>
            <tr>
              <td>Sold quantity</td>
              <td>{s.sellQuantity}</td>
            </tr>
            <tr>
              <td>Listings published</td>
              <td>{s.listingsPublished}</td>
            </tr>
          </tbody>
        </table>
        {s.topCategories?.length > 0 && (
          <>
            <h3>Top categories</h3>
            <ul>
              {s.topCategories.map((c) => (
                <li key={c.category}>
                  {c.category}: {c.quantity}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="esg-print-section">
        <h2>Governance</h2>
        <table className="esg-print-table">
          <tbody>
            <tr>
              <td>Fulfillment rate</td>
              <td>{g.fulfillmentRate != null ? `${g.fulfillmentRate}%` : '—'}</td>
            </tr>
            <tr>
              <td>Deliveries completed</td>
              <td>{g.deliveriesCompleted}</td>
            </tr>
            <tr>
              <td>Compliance</td>
              <td>{g.foodLoopCompliance}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {summary?.recommendations?.length > 0 && (
        <section className="esg-print-section">
          <h2>Recommendations</h2>
          <ol>
            {summary.recommendations.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ol>
        </section>
      )}

      <footer className="esg-print-footer">
        <p>{report.methodology?.note}</p>
        <p>
          Food factors: {report.methodology?.foodKgPerMeal} kg/meal · CO₂ factor:{' '}
          {report.methodology?.co2KgPerFoodKg} kg CO₂ per kg food saved.
        </p>
        <p>© FoodLoop — Zero Waste. Infinite Impact.</p>
      </footer>
    </div>
  );
}

export default EsgReportPrintView;
