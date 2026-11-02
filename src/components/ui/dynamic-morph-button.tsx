import { useState } from "react"
import { motion } from "motion/react"
import { Plus, CreditCard, Sparkles, Shield, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface CardPresetOption {
  name: string
  network: "mastercard" | "visa"
  badgeColor: string
  defaultLimit: number
}

interface DynamicMorphButtonProps {
  onAddCard: (card: {
    name: string
    network: "mastercard" | "visa"
    badgeColor: string
    limit: number
  }) => void
  className?: string
}

const TABS = [
  { label: "Presets", slug: "presets", width: 330, height: 215 },
  { label: "Limit", slug: "limit", width: 330, height: 190 },
  { label: "Network", slug: "network", width: 330, height: 180 },
] as const

type TabSlug = (typeof TABS)[number]["slug"]

const PRESET_OPTIONS: CardPresetOption[] = [
  {
    name: "Virtual Stash",
    network: "mastercard",
    badgeColor: "from-blue-600 via-blue-500 to-indigo-500",
    defaultLimit: 1500,
  },
  {
    name: "Global Travel",
    network: "visa",
    badgeColor: "from-sky-500 via-indigo-600 to-blue-700",
    defaultLimit: 4500,
  },
  {
    name: "Crypto Rewards",
    network: "mastercard",
    badgeColor: "from-purple-600 via-violet-500 to-indigo-600",
    defaultLimit: 2500,
  },
]

export function DynamicMorphButton({
  onAddCard,
  className,
}: DynamicMorphButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabSlug>("presets")

  // Selected card configuration
  const [selectedPreset, setSelectedPreset] = useState<CardPresetOption>(
    PRESET_OPTIONS[0]
  )
  const [selectedLimit, setSelectedLimit] = useState<number>(1500)
  const [selectedNetwork, setSelectedNetwork] = useState<"mastercard" | "visa">(
    "mastercard"
  )

  const currentTabConfig = TABS.find((t) => t.slug === activeTab) || TABS[0]

  const handleApply = () => {
    onAddCard({
      name: selectedPreset.name,
      network: selectedNetwork,
      badgeColor: selectedPreset.badgeColor,
      limit: selectedLimit,
    })

    setIsOpen(false)
    toast.success("Card Added", {
      description: `${selectedPreset.name} has been added to your wallet.`,
    })
  }

  return (
    <motion.div
      layout
      animate={{
        width: isOpen ? currentTabConfig.width : 106,
        height: isOpen ? currentTabConfig.height : 34,
        borderRadius: isOpen ? 18 : 12,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 24,
      }}
      onClick={() => {
        if (!isOpen) setIsOpen(true)
      }}
      className={cn(
        "overflow-hidden border border-gray-200/90 bg-white text-gray-900 shadow-2xs select-none p-0",
        isOpen
          ? "shadow-lg cursor-default"
          : "hover:bg-gray-50 active:scale-95 cursor-pointer transition-colors",
        className
      )}
    >
      {!isOpen ? (
        /* ========================================================
           COMPACT STATE: Clean, single-line "+ Add Card" pill
           ======================================================== */
        <div className="flex h-full w-full items-center justify-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-gray-700 px-3">
          <Plus className="w-3.5 h-3.5 text-gray-600 stroke-[2.2] shrink-0" />
          <span className="whitespace-nowrap leading-none select-none">Add Card</span>
        </div>
      ) : (
        /* ========================================================
           EXPANDED STATE: Tabbed morphing modal with options
           ======================================================== */
        <div className="flex h-full w-full flex-col justify-between p-3">
          {/* Header Row: Tabs + Close X Button */}
          <div className="flex items-center justify-between gap-2 shrink-0 pb-1 border-b border-gray-100">
            <nav className="flex items-center gap-1">
              {TABS.map((tab) => {
                const isSelected = activeTab === tab.slug
                return (
                  <button
                    key={tab.slug}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveTab(tab.slug)
                    }}
                    className={cn(
                      "relative rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                      isSelected
                        ? "text-gray-900 font-semibold"
                        : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    <span className="relative z-20">{tab.label}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="active-tab-indicator"
                        className="absolute inset-0 z-10 rounded-lg bg-gray-100"
                        transition={{ type: "spring", stiffness: 300, damping: 28 }}
                      />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Close X Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4 stroke-[2.2] rotate-45" />
            </button>
          </div>

          {/* TAB 1: PRESETS */}
          {activeTab === "presets" && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.25, type: "spring" }}
              className="flex flex-col justify-between h-full pt-2"
            >
              <div className="space-y-1.5">
                {PRESET_OPTIONS.map((item) => {
                  const isSelected = selectedPreset.name === item.name
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedPreset(item)
                        setSelectedNetwork(item.network)
                        setSelectedLimit(item.defaultLimit)
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer border",
                        isSelected
                          ? "bg-blue-50/70 border-blue-200 text-blue-900 font-medium"
                          : "border-transparent bg-gray-50/70 text-gray-700 hover:bg-gray-100/70"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-5 w-5 rounded-md bg-gradient-to-tr flex items-center justify-center text-white text-[10px]",
                            item.badgeColor
                          )}
                        >
                          <CreditCard className="w-3 h-3" />
                        </div>
                        <span>{item.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-400">
                        ${item.defaultLimit.toLocaleString()}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Bottom Apply Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-500" /> Instant issue
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleApply()
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  Create Card
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 2: LIMIT */}
          {activeTab === "limit" && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.25, type: "spring" }}
              className="flex flex-col justify-between h-full pt-2"
            >
              <div>
                <p className="text-[11px] text-gray-500 mb-2">Select weekly limit:</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1000, 2500, 5000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLimit(amt)
                      }}
                      className={cn(
                        "rounded-lg py-2 text-center text-xs font-medium border transition-colors cursor-pointer",
                        selectedLimit === amt
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      ${amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> Flexible caps
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleApply()
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  Set Limit
                </button>
              </div>
            </motion.div>
          )}

          {/* TAB 3: NETWORK */}
          {activeTab === "network" && (
            <motion.div
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.25, type: "spring" }}
              className="flex flex-col justify-between h-full pt-2"
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedNetwork("mastercard")
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl p-2.5 border transition-all cursor-pointer",
                    selectedNetwork === "mastercard"
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100/70"
                  )}
                >
                  <div className="flex items-center -space-x-1.5">
                    <div className="h-4 w-4 rounded-full bg-[#EB001B]" />
                    <div className="h-4 w-4 rounded-full bg-[#F79E1B]/95" />
                  </div>
                  <span className="text-xs font-medium text-gray-800">Mastercard</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedNetwork("visa")
                  }}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl p-2.5 border transition-all cursor-pointer",
                    selectedNetwork === "visa"
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-gray-200 bg-gray-50 hover:bg-gray-100/70"
                  )}
                >
                  <span className="font-extrabold text-[13px] italic tracking-tight text-blue-800">
                    VISA
                  </span>
                  <span className="text-xs font-medium text-gray-800">Card</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-500" /> Fraud protected
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleApply()
                  }}
                  className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  )
}
