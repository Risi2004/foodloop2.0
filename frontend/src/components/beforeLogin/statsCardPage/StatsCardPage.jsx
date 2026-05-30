import { useState, useEffect } from "react";
import StatsCard from "../statsCard/StatsCard";
import icon1 from "../../../assets/icons/stats/1.svg"
import icon2 from "../../../assets/icons/stats/2.svg"
import icon3 from "../../../assets/icons/stats/3.svg"
import icon4 from "../../../assets/icons/stats/4.svg"
import icon5 from "../../../assets/icons/stats/5.svg"
import icon6 from "../../../assets/icons/stats/6.svg"
import { getPublicStats } from "../../../services/statsApi";
import "./StatsCardPage.css"

function formatNumber(n) {
    if (n == null || !Number.isFinite(n)) return "0";
    return n >= 1000 ? n.toLocaleString() : String(n);
}

function buildStatsCards(stats) {
    const s = stats || {};
    return [
        { id: 1, icon: icon1, count: formatNumber(s.suppliers ?? s.donors), title: "Active Suppliers" },
        { id: 2, icon: icon3, count: formatNumber(s.receivers), title: "Active Receivers" },
        { id: 3, icon: icon5, count: formatNumber(s.mealsRescued ?? s.peopleFed), title: "Meals Rescued" },
        { id: 4, icon: icon4, count: `${formatNumber(s.kgDiverted ?? s.foodSavedKg)} Kg`, title: "Kg Diverted" },
        { id: 5, icon: icon2, count: `${formatNumber(s.co2OffsetKg)} Kg`, title: "CO₂ Offset (est.)" },
        { id: 6, icon: icon6, count: `${formatNumber(Math.round(Number(s.methaneSavedKg) || 0))} Kg`, title: "Methane Saved (est.)" },
    ];
}

const LOADING_STATS = buildStatsCards({
    suppliers: null,
    receivers: null,
    mealsRescued: null,
    kgDiverted: null,
    co2OffsetKg: null,
    methaneSavedKg: null,
}).map((card) => ({
    ...card,
    count: "—",
}));

function StatsCardPage() {
    const [statsData, setStatsData] = useState(LOADING_STATS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        getPublicStats()
            .then((res) => {
                if (cancelled || !res?.stats) return;
                setStatsData(buildStatsCards(res.stats));
            })
            .catch(() => {
                if (!cancelled) {
                    setStatsData(buildStatsCards({
                        suppliers: 0,
                        receivers: 0,
                        mealsRescued: 0,
                        kgDiverted: 0,
                        co2OffsetKg: 0,
                        methaneSavedKg: 0,
                    }));
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    return (
        <div className="stats__card__page" aria-busy={loading}>
            {statsData.map((stat) => (
                <StatsCard
                    key={stat.id}
                    icon={stat.icon}
                    count={stat.count}
                    title={stat.title}
                />
            ))}
        </div>
    )
}

export default StatsCardPage;
