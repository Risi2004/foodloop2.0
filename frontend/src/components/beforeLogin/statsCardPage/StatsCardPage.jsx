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

const defaultStats = [
    { id: 1, icon: icon1, count: "12,540", title: "Donors Registered" },
    { id: 2, icon: icon2, count: "3,280", title: "Volunteer Drivers Registered" },
    { id: 3, icon: icon3, count: "1,120", title: "NGOs Registered" },
    { id: 4, icon: icon4, count: "45600 Kg", title: "Food Saved" },
    { id: 5, icon: icon5, count: "182,000", title: "People Fed" },
    { id: 6, icon: icon6, count: "9300 Kg", title: "Methane Saved" },
];

function formatNumber(n) {
    if (n == null || !Number.isFinite(n)) return "0";
    return n >= 1000 ? n.toLocaleString() : String(n);
}

function StatsCardPage() {
    const [statsData, setStatsData] = useState(defaultStats);

    useEffect(() => {
        let cancelled = false;
        getPublicStats()
            .then((res) => {
                if (cancelled || !res?.stats) return;
                const s = res.stats;
                setStatsData([
                    { id: 1, icon: icon1, count: formatNumber(s.donors), title: "Donors Registered" },
                    { id: 2, icon: icon2, count: formatNumber(s.drivers), title: "Volunteer Drivers Registered" },
                    { id: 3, icon: icon3, count: formatNumber(s.receivers), title: "NGOs Registered" },
                    { id: 4, icon: icon4, count: `${formatNumber(s.foodSavedKg)} Kg`, title: "Food Saved" },
                    { id: 5, icon: icon5, count: formatNumber(s.peopleFed), title: "People Fed" },
                    { id: 6, icon: icon6, count: `${formatNumber(Math.round(Number(s.methaneSavedKg)))} Kg`, title: "Methane Saved" },
                ]);
            })
            .catch(() => { /* keep default on error */ });
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="stats__card__page">
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