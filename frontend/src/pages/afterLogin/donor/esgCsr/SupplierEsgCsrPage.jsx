import { useCallback, useEffect, useState } from 'react';
import DonorNavbar from '../../../../components/afterLogin/dashboard/donorSection/navbar/DonorNavbar';
import DonorFooter from '../../../../components/afterLogin/dashboard/donorSection/footer/DonorFooter';
import { getUser, getSupplierDisplayName } from '../../../../utils/auth';
import EsgPaywallHero from '../../../../components/afterLogin/donor/esgCsr/EsgPaywallHero';
import EsgDashboard from '../../../../components/afterLogin/donor/esgCsr/EsgDashboard';
import ClaimPaymentModal from '../../../../components/afterLogin/receiver/findFood/claimPayment/ClaimPaymentModal';
import {
  getEsgStatus,
  getEsgReport,
  startEsgSubscriptionCheckout,
  confirmEsgSubscriptionPayment,
  cancelEsgAutoRenew,
} from '../../../../services/supplierEsgApi';
import { downloadEsgReportPdf } from '../../../../utils/downloadEsgReportPdf';
import './SupplierEsgCsrPage.css';

function SupplierEsgCsrPage() {
  const user = getUser();
  const companyName = getSupplierDisplayName(user);

  const [status, setStatus] = useState(null);
  const [report, setReport] = useState(null);
  const [period, setPeriod] = useState('this_month');
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkout, setCheckout] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancellingRenew, setCancellingRenew] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const s = await getEsgStatus();
      setStatus(s);
      return s;
    } catch (err) {
      setError(err.message || 'Could not load subscription status.');
      return null;
    }
  }, []);

  const loadReport = useCallback(
    async (p = period) => {
      setReportLoading(true);
      setError(null);
      try {
        const data = await getEsgReport(p);
        setReport(data.report);
        if (data.status) setStatus(data.status);
      } catch (err) {
        if (err.code === 'ESG_SUBSCRIPTION_REQUIRED') {
          setReport(null);
          await loadStatus();
        } else {
          setError(err.message || 'Failed to load report.');
        }
      } finally {
        setReportLoading(false);
      }
    },
    [period, loadStatus]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const s = await loadStatus();
      if (s?.unlocked) {
        await loadReport(period);
      }
      setLoading(false);
    })();
  }, []);

  const handlePeriodChange = async (next) => {
    setPeriod(next);
    await loadReport(next);
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await startEsgSubscriptionCheckout();
      if (res.alreadySubscribed) {
        if (res.status) setStatus(res.status);
        await loadReport(period);
        return;
      }
      setCheckout(res.checkout);
      setShowPayModal(true);
    } catch (err) {
      setError(err.message || 'Checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPayModal(false);
    setCheckout(null);
    await loadStatus();
    await loadReport(period);
  };

  const handleCancelAutoRenew = async () => {
    const until = status?.expiresAt
      ? new Date(status.expiresAt).toLocaleDateString('en-LK', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'period end';
    const confirmed = window.confirm(
      `Cancel ESG subscription renewal?\n\n` +
        `• No refund for this month\n` +
        `• Dashboard access continues until ${until}\n` +
        `• You will not be charged again after this period`
    );
    if (!confirmed) return;

    setCancellingRenew(true);
    setError(null);
    try {
      const res = await cancelEsgAutoRenew();
      if (res.status) setStatus(res.status);
      setError(null);
      alert(
        res.message || `Cancelled. Access continues until ${until}. No refund for the current month.`
      );
    } catch (err) {
      setError(err.message || 'Could not cancel subscription.');
    } finally {
      setCancellingRenew(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!report || downloading) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadEsgReportPdf('esg-print-report', {
        company: report.company || companyName,
        periodLabel: report.periodLabel || period,
      });
    } catch (err) {
      setError(err.message || 'Could not generate PDF. Try Print / Save PDF instead.');
    } finally {
      setDownloading(false);
    }
  };

  const amountLkr = status?.subscriptionAmountLkr ?? 5000;
  const unlocked = status?.unlocked;

  return (
    <div className="esg-page">
      <DonorNavbar />
      <main className="esg-page__main">
        <header className="esg-page__hero">
          <h1>ESG &amp; CSR Impact</h1>
          <p>
            Environmental, social, and governance reporting from your FoodLoop surplus food
            activity — built for boards, auditors, and sustainability teams.
          </p>
          {companyName && <span className="esg-page__company">{companyName}</span>}
        </header>

        {error && (
          <div className="esg-page__error" role="alert">
            {error}
          </div>
        )}

        {loading && <p className="esg-page__loading">Loading your impact dashboard…</p>}

        {!loading && !unlocked && (
          <EsgPaywallHero
            amountLkr={amountLkr}
            onSubscribe={handleSubscribe}
            loading={checkoutLoading}
          />
        )}

        {!loading && unlocked && (
          <EsgDashboard
            report={report}
            status={status}
            period={period}
            onPeriodChange={handlePeriodChange}
            onRefresh={() => loadReport(period)}
            loading={reportLoading}
            onPrint={handlePrint}
            onDownload={handleDownload}
            downloading={downloading}
            onCancelAutoRenew={handleCancelAutoRenew}
            cancellingRenew={cancellingRenew}
          />
        )}
      </main>
      <DonorFooter />

      <ClaimPaymentModal
        isOpen={showPayModal}
        onClose={() => !checkoutLoading && setShowPayModal(false)}
        checkout={
          checkout
            ? {
                ...checkout,
                itemName: checkout.itemName || 'ESG & CSR Impact Dashboard',
                summaryLines: [
                  {
                    label: 'ESG & CSR dashboard + PDF reports (1 month)',
                    amount: checkout.amount,
                  },
                ],
              }
            : null
        }
        confirmPayment={confirmEsgSubscriptionPayment}
        showAutoRenewOption
        submitLabel="Pay & unlock"
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

export default SupplierEsgCsrPage;
