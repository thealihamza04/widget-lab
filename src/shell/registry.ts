import { lazy, type ComponentType, type LazyExoticComponent } from "react"

/**
 * Every widget, described once. Components are lazy: a widget's code is only downloaded
 * (and its timers/animations only run) when its page is opened.
 */
export type WidgetEntry = {
  id: string
  name: string
  category: Category
  description: string
  isNew?: boolean
  load: () => Promise<{ default: ComponentType }>
  Component: LazyExoticComponent<ComponentType>
}

export const CATEGORIES = ["Finance", "Health & Fitness", "Productivity", "Media", "Profiles", "Jobs", "Commerce & Mobility"] as const
export type Category = (typeof CATEGORIES)[number]

const entry = (e: Omit<WidgetEntry, "Component">): WidgetEntry => ({ ...e, Component: lazy(e.load) })

export const WIDGETS: WidgetEntry[] = [
  // Finance
  entry({ id: "wallet", name: "Wallet", category: "Finance", isNew: true, description: "Balance, contacts and send/receive flows with an inline transaction history.", load: () => import("@/components/widgets/wallet/WalletWidget") }),
  entry({ id: "currency-exchange", name: "Currency Exchange", category: "Finance", description: "Convert between currencies with live fees and a swap action.", load: () => import("@/components/widgets/currency-exchange/CurrencyExchangeWidget") }),
  entry({ id: "my-cards", name: "My Cards", category: "Finance", description: "Swipeable payment cards with spending limits by period.", load: () => import("@/components/widgets/my-cards/MyCardsWidget") }),
  entry({ id: "growth", name: "Growth", category: "Finance", description: "Dot-matrix bar chart of portfolio growth across 1M / 6M / 1Y.", load: () => import("@/components/widgets/growth/GrowthWidget") }),
  entry({ id: "stacks-card", name: "Stacks", category: "Finance", description: "Editorial card for the Bitcoin economy with an expanding graphic.", load: () => import("@/components/widgets/stacks-card/StacksCardWidget") }),

  // Health & Fitness
  entry({ id: "heart-rate", name: "Heart Rate", category: "Health & Fitness", description: "BPM with peak/min markers and a daily range chart.", load: () => import("@/components/widgets/heart-rate/HeartRateWidget") }),
  entry({ id: "pai-rings", name: "PAI Rings", category: "Health & Fitness", description: "Activity rings with sleep, strength and VO₂ max.", load: () => import("@/components/widgets/pai-rings/PaiRingsWidget") }),
  entry({ id: "athletic-score", name: "Athletic Score", category: "Health & Fitness", description: "Training readiness score with recovery telemetry.", load: () => import("@/components/widgets/athletic-score/AthleticScoreWidget") }),

  // Productivity
  entry({ id: "standby-timer", name: "StandBy Timer", category: "Productivity", isNew: true, description: "Countdown with a progress ring, presets and pause / resume.", load: () => import("@/components/widgets/standby-timer/StandbyTimerWidget") }),
  entry({ id: "system-monitor", name: "System Monitor", category: "Productivity", isNew: true, description: "D3 CPU sparkline, memory/GPU meters, network chart and keep-awake.", load: () => import("@/components/widgets/system-monitor/SystemMonitorWidget") }),
  entry({ id: "recorder", name: "Recorder", category: "Productivity", isNew: true, description: "Field recorder with waveform timeline, takes, seek and options.", load: () => import("@/components/widgets/recorder/RecorderWidget") }),
  entry({ id: "scans-mail", name: "Scans Mail", category: "Productivity", isNew: true, description: "Envelope that opens into a swipeable viewer of 36 scans.", load: () => import("@/components/widgets/scans-mail/ScansMailWidget") }),

  // Media
  entry({ id: "story-carousel", name: "Story Carousel", category: "Media", isNew: true, description: "Auto-advancing weekly recap with play / pause / replay pagination.", load: () => import("@/components/widgets/story-carousel/StoryCarouselWidget") }),
  entry({ id: "photo-card", name: "Photo Card", category: "Media", isNew: true, description: "Photo viewer with album grid, edit sliders, favourite, share and delete.", load: () => import("@/components/widgets/photo-card/PhotoCardWidget") }),

  // Profiles
  entry({ id: "mini-portfolio", name: "Mini Portfolio", category: "Profiles", description: "Developer profile with work carousel, stack and journey tabs.", load: () => import("@/components/widgets/mini-portfolio/MiniPortfolioWidget") }),
  entry({ id: "designer-profile", name: "Designer Profile", category: "Profiles", description: "Product designer card with availability and quick actions.", load: () => import("@/components/widgets/designer-profile/DesignerProfileWidget") }),
  entry({ id: "birthday-card", name: "Birthday Card", category: "Profiles", description: "Celebration card with a candle to blow out and quick wishes.", load: () => import("@/components/widgets/birthday-card/BirthdayCardWidget") }),

  // Jobs
  entry({ id: "job-post", name: "Job Post", category: "Jobs", description: "Marketing role with a deadline calendar and inline application.", load: () => import("@/components/widgets/job-post/JobPostWidget") }),
  entry({ id: "variant-job", name: "Web Designer Job", category: "Jobs", isNew: true, description: "Dark job card with save, hourly/monthly pay and apply flow.", load: () => import("@/components/widgets/variant-job/VariantJobWidget") }),

  // Commerce & Mobility
  entry({ id: "banana-item", name: "Grocery Item", category: "Commerce & Mobility", description: "Product row with a quantity stepper that opens bulk options.", load: () => import("@/components/widgets/banana-item/BananaItemWidget") }),
  entry({ id: "upgrade-pro", name: "Upgrade to Pro", category: "Commerce & Mobility", description: "Upsell card with activate and dismiss / undo.", load: () => import("@/components/widgets/upgrade-pro/UpgradeProWidget") }),
  entry({ id: "bike-tracker", name: "E-Bike Tracker", category: "Commerce & Mobility", isNew: true, description: "Battery range, trip stats and a finder compass that rings the bike.", load: () => import("@/components/widgets/bike-tracker/BikeTrackerWidget") }),
]

export const byId = (id: string | null) => WIDGETS.find((w) => w.id === id) ?? null
