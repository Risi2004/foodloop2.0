import { useEffect, useRef, useState } from "react"
import { useLocation } from "react-router-dom"
import Navbar from "../../../components/beforeLogin/navbar/Navbar"
import HeaderImage from "../../../components/beforeLogin/headerImage/HeaderImage"
import StatsCardPage from "../../../components/beforeLogin/statsCardPage/StatsCardPage"
import About from "../../../components/beforeLogin/aboutSection/About"
import TransparencyLoopCardSection from "../../../components/beforeLogin/transparencyLoopCardSection/TransparencyLoopCardSection"
import Map from "../../../components/beforeLogin/map/Map"
import ReviewSection from "../../../components/beforeLogin/review/ReviewSection"
import Contact from "../../../components/beforeLogin/Contact/Contact"
import Chatbot from "../../../components/chatbot/Chatbot"
import Footer from "../../../components/beforeLogin/footer/Footer"
import PageLoader from "../../../components/common/PageLoader/PageLoader"
import { preloadSignupLoginImages } from "../../../utils/preloadSignupLoginImages"
import "./LandingPage.css"

const MIN_LOADER_MS = 800
const MAX_WAIT_MS = 8000

function LandingPage() {
    const location = useLocation()
    const containerRef = useRef(null)
    const [loaderHidden, setLoaderHidden] = useState(false)
    const [resourcesReady, setResourcesReady] = useState(false)

    useEffect(() => {
        const hash = location.hash?.slice(1)
        if (hash) {
            const el = document.getElementById(hash)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [location.pathname, location.hash])

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        let cancelled = false
        let allImagesLoaded = false
        let minTimeReached = false

        const finish = () => {
            if (cancelled) return
            setLoaderHidden(true)
            setTimeout(() => {
                if (!cancelled) setResourcesReady(true)
            }, 400)
        }

        const tryFinish = () => {
            if (cancelled) return
            if (allImagesLoaded && minTimeReached) finish()
        }

        const run = () => {
            if (cancelled) return
            const imgs = container.querySelectorAll("img")
            if (imgs.length === 0) {
                allImagesLoaded = true
                const minTimer = setTimeout(() => {
                    minTimeReached = true
                    tryFinish()
                }, MIN_LOADER_MS)
                return () => {
                    cancelled = true
                    clearTimeout(minTimer)
                }
            }

            let loaded = 0
            const onLoad = () => {
                loaded += 1
                if (loaded >= imgs.length) {
                    allImagesLoaded = true
                    tryFinish()
                }
            }

            imgs.forEach((img) => {
                if (img.complete) onLoad()
                else img.addEventListener("load", onLoad)
            })

            const minTimer = setTimeout(() => {
                minTimeReached = true
                tryFinish()
            }, MIN_LOADER_MS)
            const maxTimer = setTimeout(finish, MAX_WAIT_MS)

            return () => {
                cancelled = true
                clearTimeout(minTimer)
                clearTimeout(maxTimer)
                imgs.forEach((img) => img.removeEventListener("load", onLoad))
            }
        }

        let cleanup = null
        const rafId = requestAnimationFrame(() => {
            cleanup = run()
        })
        return () => {
            cancelled = true
            cancelAnimationFrame(rafId)
            if (typeof cleanup === "function") cleanup()
        }
    }, [])

    // When landing page is visible, preload signup and login images so those pages load instantly
    useEffect(() => {
        if (!resourcesReady) return
        preloadSignupLoginImages()
    }, [resourcesReady])

    return (
        <div className="landing__page" ref={containerRef}>
            {!resourcesReady && (
                <PageLoader
                    message="Loading..."
                    className={loaderHidden ? "page-loader--hidden" : ""}
                />
            )}
            <Navbar />
            <Chatbot />
            <HeaderImage />
            <StatsCardPage />
            <About />
            <TransparencyLoopCardSection />
            <Map />
            <ReviewSection />
            <Contact />
            <Footer />
        </div>
    )
}

export default LandingPage